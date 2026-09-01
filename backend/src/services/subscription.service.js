const prisma = require("../repositories/prismaClient");
const martRepository = require("../repositories/martRepository");
const userRepository = require("../repositories/userRepository");
const notificationRepository = require("../repositories/notificationRepository");
const subscriptionSettingsRepository = require("../repositories/subscriptionSettingsRepository");

const DEFAULT_PACKAGES = [
  { months: 0, name: "Free", durationDays: 7, defaultPrice: 0, discountLabel: "7 Days Free" },
  { months: 1, name: "1 Month", durationDays: 30, defaultPrice: 1000, discountLabel: "" },
  { months: 3, name: "3 Months", durationDays: 90, defaultPrice: 2700, discountLabel: "Save 10%" },
  { months: 6, name: "6 Months", durationDays: 180, defaultPrice: 5000, discountLabel: "Save 16%" },
  { months: 9, name: "9 Months", durationDays: 270, defaultPrice: 7200, discountLabel: "Save 20%" },
  { months: 12, name: "12 Months", durationDays: 365, defaultPrice: 9000, discountLabel: "Save 25%" },
];

const DEFAULT_HARDWARE_PRODUCTS = [
  {
    id: "scanner",
    name: "Barcode Scanner",
    description: "High-speed USB & wireless 1D/2D barcode scanner for quick POS checkouts.",
    unitPrice: 20000,
    active: true,
  },
  {
    id: "printer",
    name: "Thermal Receipt Printer",
    description: "Heavy-duty 80mm thermal receipt printer with fast auto-cutter.",
    unitPrice: 30000,
    active: true,
  },
];

const DEFAULT_PAYMENT_METHODS = [
  {
    id: "telebirr",
    method: "Telebirr",
    bankName: "Telebirr",
    accountName: "Kiya POS Solutions",
    accountNumber: "0911223344",
    instructions: "Send the exact subscription fee to our Telebirr account and upload the transaction screenshot.",
    active: true,
  },
  {
    id: "cbe",
    method: "Commercial Bank of Ethiopia",
    bankName: "Commercial Bank of Ethiopia (CBE)",
    accountName: "Kiya POS Tech PLC",
    accountNumber: "1000123456789",
    instructions: "Transfer to our CBE account via CBE Mobile Banking or branch deposit, and upload the receipt image.",
    active: true,
  },
  {
    id: "awash",
    method: "Awash Bank",
    bankName: "Awash Bank",
    accountName: "Kiya POS Tech PLC",
    accountNumber: "0132087654321",
    instructions: "Transfer via Awash Birr / Mobile Banking and upload the confirmation slip.",
    active: true,
  },
];

async function getOrCreateSettings() {
  let settings = await subscriptionSettingsRepository.getOrCreate();
  let needsUpdate = false;
  const updateData = {};

  if (!settings.packagePrices) {
    const defaultPrices = {};
    DEFAULT_PACKAGES.forEach((p) => {
      defaultPrices[p.months] = p.defaultPrice;
    });
    updateData.packagePrices = defaultPrices;
    settings.packagePrices = defaultPrices;
    needsUpdate = true;
  }
  if (!settings.paymentMethods || !Array.isArray(settings.paymentMethods) || settings.paymentMethods.length === 0) {
    updateData.paymentMethods = DEFAULT_PAYMENT_METHODS;
    settings.paymentMethods = DEFAULT_PAYMENT_METHODS;
    needsUpdate = true;
  }
  if (!settings.hardwareProducts || !Array.isArray(settings.hardwareProducts) || settings.hardwareProducts.length === 0) {
    updateData.hardwareProducts = DEFAULT_HARDWARE_PRODUCTS;
    settings.hardwareProducts = DEFAULT_HARDWARE_PRODUCTS;
    needsUpdate = true;
  }

  if (needsUpdate && settings.id) {
    try {
      settings = await prisma.subscriptionSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    } catch (e) {
      console.warn("Failed to persist default settings:", e);
    }
  }

  return settings;
}

function getPackageList(settings) {
  const prices = settings?.packagePrices || {};
  return DEFAULT_PACKAGES.map((pkg) => ({
    ...pkg,
    price: Number(prices[pkg.months] ?? pkg.defaultPrice),
  }));
}

function getHardwareProductsList(settings) {
  const list = settings?.hardwareProducts;
  if (Array.isArray(list) && list.length > 0) {
    return list;
  }
  return DEFAULT_HARDWARE_PRODUCTS;
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
    await notificationRepository.create({
      userId: admin.id,
      martId: mart?.id,
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
  const warningDaysBeforeExpiry = clampNumber(
    sub.warningDaysBeforeExpiry,
    clampNumber(settings.warningDaysBeforeExpiry, 5),
  );

  return {
    feeEtb,
    billingPeriodDays,
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

  const isTrial = Boolean(subData.isTrial);
  const packageMonths = subData.packageMonths || null;
  const packageName = subData.packageName || (isTrial ? "7-Day Free Trial" : "Standard Plan");

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

  const fallbackDays = isTrial ? (settings.trialPeriodDays || 7) : plan.billingPeriodDays;

  const subscriptionEndDate = hasExplicitEnd
    ? explicitEndDate
    : new Date(
        subscriptionStartDate.getTime() +
          fallbackDays * 24 * 60 * 60 * 1000,
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
    const reason = isTrial
      ? "7-day free trial has expired"
      : "subscription period expired";

    await notifyMartOwners({
      mart,
      type: "subscription_suspended",
      title: isTrial ? "Free Trial Expired" : "Subscription Expired",
      message: `Your mart has been suspended: ${reason}. Please select a subscription package and complete payment to restore full operations.`,
      data: {
        martId: String(mart.id),
        martName: mart.martName,
        reason,
        daysLeft,
        isTrial,
      },
    });
  }

  if (persist) {
    const updatedSub = {
      ...subData,
      ...plan,
      isTrial,
      packageName,
      packageMonths,
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
    if (typeof daysLeft === "number") {
      warningParts.push(
        isTrial
          ? `free trial expires in ${daysLeft} day(s)`
          : `subscription expires in ${daysLeft} day(s)`
      );
    }

    await notifyMartOwners({
      mart,
      type: "subscription_warning",
      title: isTrial ? "Free Trial Ending Soon" : "Subscription Expiring Soon",
      message: `Your mart is nearing expiration: ${warningParts.join(", ")}. Please select a package and renew to avoid suspension.`,
      data: {
        martId: String(mart.id),
        martName: mart.martName,
        daysLeft,
        isTrial,
      },
    });
  }

  // Inform mart owners when deadline is reached or expired.
  if (hasValidEnd && typeof daysLeft === "number" && daysLeft <= 0) {
    const ownerMessage = isTrial
      ? `Your 7-day free trial expired on ${subscriptionEndDate.toDateString()}. Please select a subscription package to continue.`
      : `Your mart subscription expired on ${subscriptionEndDate.toDateString()}. Please renew immediately.`;

    await notifyMartOwners({
      mart,
      type: "subscription_deadline",
      title: isTrial ? "Free Trial Expired" : "Subscription Expired",
      message: ownerMessage,
      data: {
        martId: String(mart.id),
        martName: mart.martName,
        daysLeft,
        subscriptionEndDate,
        isTrial,
      },
    });
  }

  return {
    martId: String(mart.id),
    martName: mart.martName,
    status: mart.status,
    subscriptionStatus,
    daysLeft,
    isTrial,
    packageName,
    packageMonths,
    feeEtb: plan.feeEtb,
    billingPeriodDays: plan.billingPeriodDays,
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

// ─── Payment Approval and Rejection Workflow ─────────────────────────────────

async function activateSubscriptionFromPayment({ paymentId, approverId, approverName }) {
  const payment = await prisma.subscriptionPayment.findUnique({
    where: { id: paymentId },
    include: { mart: true, requester: true },
  });

  if (!payment) {
    throw new Error("Payment record not found");
  }

  if (payment.status !== "pending") {
    throw new Error("Payment has already been processed");
  }

  const mart = payment.mart;
  const now = new Date();

  // Calculate start date: if current active subscription hasn't expired yet, extend from current end date
  const currentSub = mart.subscription && typeof mart.subscription === "object" ? mart.subscription : {};
  const currentEnd = currentSub.subscriptionEndDate ? new Date(currentSub.subscriptionEndDate) : null;
  const isCurrentEndValid = currentEnd && Number.isFinite(currentEnd.getTime()) && currentEnd.getTime() > now.getTime();

  const startDate = isCurrentEndValid ? currentEnd : now;
  // Free plan (months=0) is a 7-day trial; paid plans are months * 30 days
  const isFree = Number(payment.packageMonths) === 0;
  const durationDays = isFree ? 7 : payment.packageMonths * 30;
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Transaction to update payment and mart
  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: "approved",
        approverId,
        approverName: approverName || "System Admin",
        decidedAt: now,
        periodStartDate: startDate,
        periodEndDate: endDate,
      },
    });

    const updatedSub = {
      ...currentSub,
      isTrial: isFree,
      packageName: payment.packageName,
      packageMonths: payment.packageMonths,
      feeEtb: payment.amount,
      billingPeriodDays: durationDays,
      subscriptionStartDate: startDate.toISOString(),
      subscriptionEndDate: endDate.toISOString(),
      subscriptionStatus: "active",
      lastEvaluatedAt: now.toISOString(),
    };

    const updatedMart = await tx.mart.update({
      where: { id: mart.id },
      data: {
        subscription: updatedSub,
        status: "approved",
      },
    });

    return { updatedPayment, updatedMart };
  });

  // Notify Mart Owners of approval
  await notifyMartOwners({
    mart,
    type: "subscription_payment_approved",
    title: isFree ? "Free Plan Activated!" : "Subscription Activated!",
    message: isFree
      ? `Your 7-day free plan for ${payment.packageName} has been approved. Your free trial is active until ${endDate.toDateString()}.`
      : `Your payment of ${payment.amount} ETB for ${payment.packageName} has been approved. Your subscription is active until ${endDate.toDateString()}.`,
    data: {
      paymentId: payment.id,
      packageName: payment.packageName,
      amount: payment.amount,
      endDate: endDate.toISOString(),
    },
  });

  return result.updatedPayment;
}

async function rejectSubscriptionPayment({ paymentId, approverId, approverName, reason }) {
  const payment = await prisma.subscriptionPayment.findUnique({
    where: { id: paymentId },
    include: { mart: true },
  });

  if (!payment) {
    throw new Error("Payment record not found");
  }

  if (payment.status !== "pending") {
    throw new Error("Payment has already been processed");
  }

  const updatedPayment = await prisma.subscriptionPayment.update({
    where: { id: paymentId },
    data: {
      status: "rejected",
      approverId,
      approverName: approverName || "System Admin",
      reason: reason || "Invalid receipt or payment details",
      decidedAt: new Date(),
    },
  });

  // Notify Mart Owner of rejection
  await notifyMartOwners({
    mart: payment.mart,
    type: "subscription_payment_rejected",
    title: "Payment Receipt Rejected",
    message: `Your subscription payment receipt was rejected: ${reason || "Invalid receipt"}. You may upload a valid receipt in Subscription settings.`,
    data: {
      paymentId: payment.id,
      reason,
    },
  });

  return updatedPayment;
}

module.exports = {
  DEFAULT_PACKAGES,
  DEFAULT_HARDWARE_PRODUCTS,
  DEFAULT_PAYMENT_METHODS,
  getOrCreateSettings,
  getPackageList,
  getHardwareProductsList,
  evaluateMartSubscription,
  runSubscriptionCheckForMart,
  runSubscriptionChecksForAllMarts,
  activateSubscriptionFromPayment,
  rejectSubscriptionPayment,
  notifySystemAdmins,
  notifyMartOwners,
};

