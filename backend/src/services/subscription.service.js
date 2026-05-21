const prisma = require("../repositories/prismaClient");
const martRepository = require("../repositories/martRepository");
const userRepository = require("../repositories/userRepository");
const notificationRepository = require("../repositories/notificationRepository");
const subscriptionSettingsRepository = require("../repositories/subscriptionSettingsRepository");

const BYTES_PER_MB = 1024 * 1024;

const COLLECTIONS_WITH_MART = [
  ["product", 1.0],
  ["sale", 1.2],
  ["expense", 0.8],
  ["asset", 1.0],
  ["customer", 0.7],
  ["attendance", 0.5],
  ["dailyReport", 0.6],
  ["notification", 0.5],
  ["productAddRequest", 1.0],
  ["productEditRequest", 1.0],
  ["stockTransferRequest", 1.0],
  ["assetActionRequest", 1.0],
  ["expenseActionRequest", 1.0],
  ["category", 0.3],
  ["expenseCategory", 0.3],
  ["paymentType", 0.3],
];

async function getOrCreateSettings() {
  return await subscriptionSettingsRepository.getOrCreate();
}

function clampNumber(value, fallback, min = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, n);
}

async function estimateMartStorageUsageMb(martId) {
  if (!martId) return 0;

  let totalBytes = 0;

  for (const [modelName, averageKilobytes] of COLLECTIONS_WITH_MART) {
    try {
      const count = await prisma[modelName].count({
        where: { martId },
      });
      totalBytes += (count * averageKilobytes * BYTES_PER_MB) / 1024;
    } catch (err) {
      // Skip unavailable tables safely.
      console.warn(
        `[estimateMartStorageUsageMb] Failed to estimate size for ${modelName}:`,
        err.message,
      );
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
  const existing = await notificationRepository.findOne({
    userId,
    martId,
    type,
    createdAt: { gte: since },
  });

  return Boolean(existing);
}

async function notifySystemAdmins({ mart, type, title, message, data }) {
  const admins = await userRepository.findMany(
    {
      role: "systemAdmin",
      active: true,
      isDeleted: false,
    },
    {
      select: { id: true },
    },
  );

  for (const admin of admins) {
    const exists = await hasRecentNotification({
      userId: admin.id,
      martId: mart.id,
      type,
      withinHours: 24,
    });
    if (exists) continue;

    await notificationRepository.create({
      userId: admin.id,
      martId: mart.id,
      type,
      title,
      message,
      data,
    });
  }
}

async function notifyMartOwners({ mart, type, title, message, data }) {
  const owners = await userRepository.findMany(
    {
      role: "owner",
      martId: mart.id,
      active: true,
      isDeleted: false,
    },
    {
      select: { id: true },
    },
  );

  for (const owner of owners) {
    const exists = await hasRecentNotification({
      userId: owner.id,
      martId: mart.id,
      type,
      withinHours: 24,
    });
    if (exists) continue;

    await notificationRepository.create({
      userId: owner.id,
      martId: mart.id,
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
  const storageUsageMb = await estimateMartStorageUsageMb(mart.id);

  // Parse JSONB subscription field
  const subData =
    mart.subscription && typeof mart.subscription === "object"
      ? mart.subscription
      : {};

  const subscriptionStartDateRaw = subData.subscriptionStartDate
    ? new Date(subData.subscriptionStartDate)
    : null;
  const hasValidStart =
    subscriptionStartDateRaw &&
    Number.isFinite(subscriptionStartDateRaw.getTime());

  const subscriptionStartDate = hasValidStart ? subscriptionStartDateRaw : now;

  const explicitEndDate = subData.subscriptionEndDate
    ? new Date(subData.subscriptionEndDate)
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
        martId: String(mart.id),
        martName: mart.martName,
        reason,
        daysLeft,
        storageUsageMb,
        storageLimitMb: plan.storageLimitMb,
      },
    });
  }

  if (persist) {
    const updatedSub = {
      ...subData,
      ...plan,
      storageUsageMb,
      storageUsagePercent,
      subscriptionStartDate: subscriptionStartDate.toISOString(),
      subscriptionEndDate: subscriptionEndDate.toISOString(),
      subscriptionStatus,
      lastEvaluatedAt: now.toISOString(),
    };

    let nextStatus = mart.status;

    if (shouldSuspend && mart.status !== "suspended") {
      nextStatus = "suspended";
    }

    if (
      !shouldSuspend &&
      mart.status === "suspended" &&
      subscriptionStatus !== "suspended"
    ) {
      nextStatus = "approved";
    }

    await martRepository.update(mart.id, {
      subscription: updatedSub,
      status: nextStatus,
    });

    mart.subscription = updatedSub;
    mart.status = nextStatus;
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
        martId: String(mart.id),
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
        martId: String(mart.id),
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
        martId: String(mart.id),
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
        martId: String(mart.id),
        martName: mart.martName,
        daysLeft,
        subscriptionEndDate,
      },
    });
  }

  return {
    martId: String(mart.id),
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
  const mart = await martRepository.findById(martId);
  if (!mart) return null;

  const settings = await getOrCreateSettings();
  return evaluateMartSubscription(mart, settings, { persist });
}

async function runSubscriptionChecksForAllMarts({ persist = true } = {}) {
  const settings = await getOrCreateSettings();
  const marts = await martRepository.findMany({ isDeleted: false });

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
