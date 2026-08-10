const prisma = require("../repositories/prismaClient");
const martRepository = require("../repositories/martRepository");
const userRepository = require("../repositories/userRepository");
const notificationRepository = require("../repositories/notificationRepository");
const subscriptionSettingsRepository = require("../repositories/subscriptionSettingsRepository");

async function getOrCreateSettings() {
  return await subscriptionSettingsRepository.getOrCreate();
}

function clampNumber(value, fallback, min = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, n);
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
  const productLimit = clampNumber(
    sub.productLimit,
    clampNumber(settings.defaultProductLimit, 100),
    1,
  );
  const transactionLimit = clampNumber(
    sub.transactionLimit,
    clampNumber(settings.defaultTransactionLimit, 500),
    1,
  );
  const warningDaysBeforeExpiry = clampNumber(
    sub.warningDaysBeforeExpiry,
    clampNumber(settings.warningDaysBeforeExpiry, 5),
  );

  return {
    feeEtb,
    billingPeriodDays,
    productLimit,
    transactionLimit,
    warningDaysBeforeExpiry,
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

  const timeExpired = hasValidEnd ? daysLeft <= 0 : false;
  const nearTimeLimit = hasValidEnd
    ? daysLeft <= plan.warningDaysBeforeExpiry && daysLeft > 0
    : false;

  let subscriptionStatus = "active";
  if (timeExpired) subscriptionStatus = "suspended";
  else if (nearTimeLimit) subscriptionStatus = "warning";

  const shouldSuspend =
    settings.autoSuspendEnabled && subscriptionStatus === "suspended";
  const isNewSuspension = shouldSuspend && previousMartStatus !== "suspended";

  if (isNewSuspension) {
    const reason = "subscription period expired";

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
      },
    });
  }

  if (persist) {
    const updatedSub = {
      ...subData,
      ...plan,
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

  if (nearTimeLimit) {
    const warningParts = [];
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
      },
    });
  }

  if (shouldSuspend && !isNewSuspension) {
    const reason = "subscription period expired";

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

  // Count active products for this mart
  let productCount = 0;
  try {
    productCount = await prisma.product.count({
      where: { martId: mart.id, isDeleted: false },
    });
  } catch (_) {}

  // Count transactions (sales) for this mart in current billing period
  let transactionCount = 0;
  try {
    transactionCount = await prisma.sale.count({
      where: {
        martId: mart.id,
        createdAt: { gte: subscriptionStartDate, lte: subscriptionEndDate },
      },
    });
  } catch (_) {}

  return {
    martId: String(mart.id),
    martName: mart.martName,
    status: mart.status,
    subscriptionStatus,
    daysLeft,
    feeEtb: plan.feeEtb,
    billingPeriodDays: plan.billingPeriodDays,
    productLimit: plan.productLimit,
    productCount,
    transactionLimit: plan.transactionLimit,
    transactionCount,
    startDate: subscriptionStartDate,
    endDate: subscriptionEndDate,
    exceeded: timeExpired,
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
  evaluateMartSubscription,
  runSubscriptionCheckForMart,
  runSubscriptionChecksForAllMarts,
};
