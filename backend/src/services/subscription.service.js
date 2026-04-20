const mongoose = require("mongoose");
const Mart = require("../models/mart.model");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");
const SubscriptionSettings = require("../models/subscriptionSettings.model");

const BYTES_PER_MB = 1024 * 1024;

const COLLECTIONS_WITH_MART = [
  "products",
  "sales",
  "expenses",
  "assets",
  "customers",
  "attendance",
  "dailyreports",
  "notifications",
  "productaddrequests",
  "producteditrequests",
  "stocktransferrequests",
  "assetactionrequests",
  "expenseactionrequests",
  "categories",
  "expensecategories",
  "paymenttypes",
];

async function getOrCreateSettings() {
  const existing = await SubscriptionSettings.findOne().sort({ createdAt: -1 });
  if (existing) return existing;

  const created = await SubscriptionSettings.create({});
  return created;
}

function clampNumber(value, fallback, min = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, n);
}

async function estimateMartStorageUsageMb(martId) {
  if (!martId) return 0;

  const db = mongoose.connection.db;
  if (!db) return 0;

  let totalBytes = 0;

  for (const collectionName of COLLECTIONS_WITH_MART) {
    try {
      const result = await db
        .collection(collectionName)
        .aggregate([
          { $match: { martId: new mongoose.Types.ObjectId(String(martId)) } },
          {
            $group: {
              _id: null,
              totalBytes: { $sum: { $bsonSize: "$$ROOT" } },
            },
          },
        ])
        .toArray();

      totalBytes += Number(result?.[0]?.totalBytes || 0);
    } catch (err) {
      // Fallback path for Mongo versions/operators that do not support $bsonSize.
      try {
        const docs = await db
          .collection(collectionName)
          .find({ martId: new mongoose.Types.ObjectId(String(martId)) })
          .project({})
          .toArray();
        totalBytes += Buffer.byteLength(JSON.stringify(docs || []), "utf8");
      } catch {
        // Skip unavailable collections safely.
      }
    }
  }

  return Math.round((totalBytes / BYTES_PER_MB) * 100) / 100;
}

async function hasRecentNotification({
  userId,
  martId,
  type,
  withinHours = 24,
}) {
  const since = new Date(Date.now() - withinHours * 60 * 60 * 1000);
  const existing = await Notification.findOne({
    userId,
    martId,
    type,
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .lean();

  return Boolean(existing);
}

async function notifySystemAdmins({ mart, type, title, message, data }) {
  const admins = await User.find({
    role: "systemAdmin",
    active: true,
    isDeleted: { $ne: true },
  })
    .select("_id")
    .lean();

  for (const admin of admins) {
    const exists = await hasRecentNotification({
      userId: admin._id,
      martId: mart._id,
      type,
      withinHours: 24,
    });
    if (exists) continue;

    await Notification.create({
      userId: admin._id,
      martId: mart._id,
      type,
      title,
      message,
      data,
    });
  }
}

async function notifyMartOwners({ mart, type, title, message, data }) {
  const owners = await User.find({
    role: "owner",
    martId: mart._id,
    active: true,
    isDeleted: { $ne: true },
  })
    .select("_id")
    .lean();

  for (const owner of owners) {
    const exists = await hasRecentNotification({
      userId: owner._id,
      martId: mart._id,
      type,
      withinHours: 24,
    });
    if (exists) continue;

    await Notification.create({
      userId: owner._id,
      martId: mart._id,
      type,
      title,
      message,
      data,
    });
  }
}

function deriveEffectivePlan(mart, settings) {
  const sub = mart.subscription || {};
  const feeEtb = clampNumber(
    sub.feeEtb,
    clampNumber(settings.defaultFeeEtb, 1000),
  );
  const billingPeriodDays = clampNumber(
    sub.billingPeriodDays,
    clampNumber(settings.billingPeriodDays, 30),
    1,
  );
  const storageLimitMb = clampNumber(
    sub.storageLimitMb,
    clampNumber(settings.defaultStorageLimitMb, 500),
  );
  const warningDaysBeforeExpiry = clampNumber(
    sub.warningDaysBeforeExpiry,
    clampNumber(settings.warningDaysBeforeExpiry, 5),
  );
  const warningStoragePercent = clampNumber(
    sub.warningStoragePercent,
    clampNumber(settings.warningStoragePercent, 80),
    1,
  );

  return {
    feeEtb,
    billingPeriodDays,
    storageLimitMb,
    warningDaysBeforeExpiry,
    warningStoragePercent,
  };
}

async function evaluateMartSubscription(
  martDoc,
  settingsDoc,
  { persist = true } = {},
) {
  const now = new Date();
  const mart = martDoc;
  const settings = settingsDoc;
  const previousMartStatus = String(mart.status || "");

  const plan = deriveEffectivePlan(mart, settings);
  const storageUsageMb = await estimateMartStorageUsageMb(mart._id);

  const subscriptionStartDateRaw = mart.subscription?.subscriptionStartDate
    ? new Date(mart.subscription.subscriptionStartDate)
    : null;
  const hasValidStart =
    subscriptionStartDateRaw &&
    Number.isFinite(subscriptionStartDateRaw.getTime());

  const subscriptionStartDate = hasValidStart ? subscriptionStartDateRaw : now;

  const explicitEndDate = mart.subscription?.subscriptionEndDate
    ? new Date(mart.subscription.subscriptionEndDate)
    : null;
  const hasExplicitEnd =
    explicitEndDate && Number.isFinite(explicitEndDate.getTime());

  const subscriptionEndDate = hasExplicitEnd
    ? explicitEndDate
    : new Date(
        subscriptionStartDate.getTime() +
          plan.billingPeriodDays * 24 * 60 * 60 * 1000,
      );

  const hasValidEnd =
    subscriptionEndDate && Number.isFinite(subscriptionEndDate.getTime());
  const daysLeft = hasValidEnd
    ? Math.ceil(
        (subscriptionEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      )
    : null;

  const exceedsStorage =
    plan.storageLimitMb > 0 && storageUsageMb >= plan.storageLimitMb;
  const timeExpired = hasValidEnd ? daysLeft <= 0 : false;

  const storageUsagePercent =
    plan.storageLimitMb > 0
      ? Math.round((storageUsageMb / plan.storageLimitMb) * 10000) / 100
      : 0;

  const nearStorageLimit =
    plan.storageLimitMb > 0 &&
    storageUsagePercent >= plan.warningStoragePercent &&
    storageUsagePercent < 100;
  const nearTimeLimit = hasValidEnd
    ? daysLeft <= plan.warningDaysBeforeExpiry && daysLeft > 0
    : false;

  let subscriptionStatus = "active";
  if (exceedsStorage || timeExpired) subscriptionStatus = "suspended";
  else if (nearStorageLimit || nearTimeLimit) subscriptionStatus = "warning";

  const shouldSuspend =
    settings.autoSuspendEnabled && subscriptionStatus === "suspended";
  const isNewSuspension = shouldSuspend && previousMartStatus !== "suspended";

  if (isNewSuspension) {
    const reason = timeExpired
      ? "subscription period expired"
      : `storage exceeded (${storageUsageMb.toFixed(2)}MB/${plan.storageLimitMb.toFixed(2)}MB)`;

    await notifyMartOwners({
      mart,
      type: "subscription_suspended",
      title: "Mart suspended by subscription policy",
      message: `Your mart has been suspended: ${reason}. Please renew or contact support to restore operations.`,
      data: {
        martId: String(mart._id),
        martName: mart.martName,
        reason,
        daysLeft,
        storageUsageMb,
        storageLimitMb: plan.storageLimitMb,
      },
    });
  }

  if (persist) {
    mart.subscription = {
      ...(mart.subscription || {}),
      ...plan,
      storageUsageMb,
      storageUsagePercent,
      subscriptionStartDate,
      subscriptionEndDate,
      subscriptionStatus,
      lastEvaluatedAt: now,
    };

    if (shouldSuspend && mart.status !== "suspended") {
      mart.status = "suspended";
    }

    if (
      !shouldSuspend &&
      mart.status === "suspended" &&
      subscriptionStatus !== "suspended"
    ) {
      mart.status = "approved";
    }

    await mart.save();
  }

  if (nearStorageLimit || nearTimeLimit) {
    const warningParts = [];
    if (nearStorageLimit) {
      warningParts.push(
        `storage ${storageUsageMb.toFixed(2)}MB/${plan.storageLimitMb.toFixed(2)}MB (${storageUsagePercent.toFixed(2)}%)`,
      );
    }
    if (nearTimeLimit && typeof daysLeft === "number") {
      warningParts.push(`subscription expires in ${daysLeft} day(s)`);
    }

    await notifyMartOwners({
      mart,
      type: "subscription_warning",
      title: "Subscription warning",
      message: `Your mart is nearing subscription limits: ${warningParts.join(", ")}. Please renew or upgrade to avoid suspension.`,
      data: {
        martId: String(mart._id),
        martName: mart.martName,
        daysLeft,
        storageUsageMb,
        storageLimitMb: plan.storageLimitMb,
        storageUsagePercent,
      },
    });
  }

  if (shouldSuspend && !isNewSuspension) {
    const reason = timeExpired
      ? "subscription period expired"
      : `storage exceeded (${storageUsageMb.toFixed(2)}MB/${plan.storageLimitMb.toFixed(2)}MB)`;

    await notifyMartOwners({
      mart,
      type: "subscription_suspended",
      title: "Mart suspended by subscription policy",
      message: `Your mart has been suspended: ${reason}. Please renew or contact support to restore operations.`,
      data: {
        martId: String(mart._id),
        martName: mart.martName,
        reason,
        daysLeft,
        storageUsageMb,
        storageLimitMb: plan.storageLimitMb,
      },
    });
  }

  if (previousMartStatus === "suspended" && mart.status === "approved") {
    await notifyMartOwners({
      mart,
      type: "subscription_unsuspended",
      title: "Mart access restored",
      message:
        "Your mart is no longer suspended and has been restored to active status.",
      data: {
        martId: String(mart._id),
        martName: mart.martName,
        daysLeft,
        storageUsageMb,
        storageLimitMb: plan.storageLimitMb,
        storageUsagePercent,
      },
    });
  }

  // Inform mart owners when deadline is reached or expired.
  if (hasValidEnd && typeof daysLeft === "number" && daysLeft <= 0) {
    const ownerMessage =
      daysLeft === 0
        ? `Your mart subscription deadline is today (${subscriptionEndDate.toDateString()}). Renew to avoid interruption.`
        : `Your mart subscription expired on ${subscriptionEndDate.toDateString()}. Please renew immediately.`;

    await notifyMartOwners({
      mart,
      type: "subscription_deadline",
      title: "Subscription deadline reached",
      message: ownerMessage,
      data: {
        martId: String(mart._id),
        martName: mart.martName,
        daysLeft,
        subscriptionEndDate,
      },
    });
  }

  return {
    martId: String(mart._id),
    martName: mart.martName,
    status: mart.status,
    subscriptionStatus,
    daysLeft,
    storageUsageMb,
    storageLimitMb: plan.storageLimitMb,
    storageUsagePercent,
    feeEtb: plan.feeEtb,
    billingPeriodDays: plan.billingPeriodDays,
    startDate: subscriptionStartDate,
    endDate: subscriptionEndDate,
    exceeded: exceedsStorage || timeExpired,
  };
}

async function runSubscriptionCheckForMart(martId, { persist = true } = {}) {
  const mart = await Mart.findById(martId);
  if (!mart) return null;

  const settings = await getOrCreateSettings();
  return evaluateMartSubscription(mart, settings, { persist });
}

async function runSubscriptionChecksForAllMarts({ persist = true } = {}) {
  const settings = await getOrCreateSettings();
  const marts = await Mart.find({ isDeleted: { $ne: true } });

  const results = [];
  for (const mart of marts) {
    const result = await evaluateMartSubscription(mart, settings, { persist });
    results.push(result);
  }

  return results;
}

module.exports = {
  getOrCreateSettings,
  estimateMartStorageUsageMb,
  evaluateMartSubscription,
  runSubscriptionCheckForMart,
  runSubscriptionChecksForAllMarts,
};
