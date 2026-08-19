const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const prisma = require("../repositories/prismaClient");
const martRepository = require("../repositories/martRepository");
const { authenticate } = require("../middleware/auth");
const {
  getOrCreateSettings,
  getPackageList,
  runSubscriptionCheckForMart,
  runSubscriptionChecksForAllMarts,
  activateSubscriptionFromPayment,
  rejectSubscriptionPayment,
  notifySystemAdmins,
} = require("../services/subscription.service");
const {
  getProductCapacity,
} = require("../services/productCapacity.service");

// Upload directory setup
const uploadDir = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "sub-receipt-" + unique + path.extname(file.originalname || ".jpg"));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

function requireSystemAdmin(req, res, next) {
  if (req.user.role !== "systemAdmin") {
    return res.status(403).json({ message: "Insufficient permissions" });
  }
  return next();
}

function serializePayment(p) {
  return {
    id: p.id,
    martId: p.martId,
    martName: p.mart?.martName || undefined,
    userId: p.userId,
    userName: p.requester?.name || p.requester?.username || undefined,
    userPhone: p.requester?.phone || undefined,
    packageName: p.packageName,
    packageMonths: p.packageMonths,
    amount: Number(p.amount),
    currency: p.currency,
    paymentMethod: p.paymentMethod,
    paymentReference: p.paymentReference || "",
    receiptUrl: p.receiptUrl,
    status: p.status,
    approverId: p.approverId || undefined,
    approverName: p.approverName || p.approver?.name || undefined,
    reason: p.reason || undefined,
    decidedAt: p.decidedAt ? p.decidedAt.toISOString() : undefined,
    periodStartDate: p.periodStartDate ? p.periodStartDate.toISOString() : undefined,
    periodEndDate: p.periodEndDate ? p.periodEndDate.toISOString() : undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// ─── Owner / Mart Subscription Endpoints ─────────────────────────────────────

// GET /api/subscriptions/my-status
router.get("/my-status", authenticate, async (req, res) => {
  try {
    const { martId } = req.user;
    if (!martId) {
      return res.status(400).json({ message: "No mart assigned to user" });
    }

    const settings = await getOrCreateSettings();
    const evaluation = await runSubscriptionCheckForMart(martId, { persist: true });
    const packages = getPackageList(settings);

    return res.json({
      subscription: evaluation,
      packages,
      trialPeriodDays: settings.trialPeriodDays || 7,
    });
  } catch (err) {
    console.error("[subscriptions] GET /my-status error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// GET /api/subscriptions/payment-methods
router.get("/payment-methods", authenticate, async (_req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const activeMethods = (Array.isArray(settings.paymentMethods) ? settings.paymentMethods : []).filter(
      (m) => m.active !== false
    );
    return res.json(activeMethods);
  } catch (err) {
    console.error("[subscriptions] GET /payment-methods error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// GET /api/subscriptions/my-payments
router.get("/my-payments", authenticate, async (req, res) => {
  try {
    const { martId } = req.user;
    if (!martId) {
      return res.status(400).json({ message: "No mart assigned to user" });
    }

    const payments = await prisma.subscriptionPayment.findMany({
      where: { martId },
      include: {
        requester: { select: { id: true, name: true, username: true, phone: true } },
        approver: { select: { id: true, name: true } },
        mart: { select: { id: true, martName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(payments.map(serializePayment));
  } catch (err) {
    console.error("[subscriptions] GET /my-payments error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/subscriptions/pay
router.post("/pay", authenticate, upload.single("receipt"), async (req, res) => {
  try {
    const { martId, id: userId } = req.user;
    if (!martId) {
      return res.status(400).json({ message: "No mart assigned to user" });
    }

    const mart = await martRepository.findById(martId);
    if (!mart) {
      return res.status(404).json({ message: "Mart not found" });
    }

    const { packageMonths, paymentMethod, paymentReference } = req.body;
    const months = parseInt(packageMonths, 10);

    if (![1, 3, 6, 9, 12].includes(months)) {
      return res.status(400).json({ message: "Valid package is required (1, 3, 6, 9, or 12 months)" });
    }

    if (!paymentMethod || !String(paymentMethod).trim()) {
      return res.status(400).json({ message: "Payment method is required" });
    }

    // Receipt is required
    let receiptUrl = req.body.receiptUrl || "";
    if (req.file) {
      receiptUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    if (!receiptUrl) {
      return res.status(400).json({ message: "Payment receipt image is required" });
    }

    // Calculate price from settings
    const settings = await getOrCreateSettings();
    const packageList = getPackageList(settings);
    const selectedPkg = packageList.find((p) => p.months === months);
    const amount = selectedPkg ? selectedPkg.price : months * 1000;
    const packageName = selectedPkg ? selectedPkg.name : `${months} Months`;

    // Create SubscriptionPayment
    const payment = await prisma.subscriptionPayment.create({
      data: {
        martId,
        userId,
        packageName,
        packageMonths: months,
        amount,
        currency: "ETB",
        paymentMethod: String(paymentMethod).trim(),
        paymentReference: paymentReference ? String(paymentReference).trim() : null,
        receiptUrl,
        status: "pending",
      },
      include: {
        requester: { select: { id: true, name: true, username: true, phone: true } },
        mart: { select: { id: true, martName: true } },
      },
    });

    // Notify System Admins
    await notifySystemAdmins({
      mart,
      type: "subscription_payment_submitted",
      title: "New Subscription Payment Submitted",
      message: `${mart.martName} submitted a payment receipt of ${amount} ETB for ${packageName}.`,
      data: {
        paymentId: payment.id,
        martId: mart.id,
        martName: mart.martName,
        packageName,
        amount,
      },
    });

    return res.status(201).json(serializePayment(payment));
  } catch (err) {
    console.error("[subscriptions] POST /pay error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ─── System Admin Subscription Endpoints ─────────────────────────────────────

// GET /api/subscriptions/payments
router.get("/payments", authenticate, requireSystemAdmin, async (req, res) => {
  try {
    const { status, martId, page = "1", limit = "30" } = req.query;
    const where = {};
    if (status) where.status = status;
    if (martId) where.martId = martId;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const skip = (pageNum - 1) * pageSize;

    const [payments, total] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where,
        include: {
          requester: { select: { id: true, name: true, username: true, phone: true } },
          approver: { select: { id: true, name: true } },
          mart: { select: { id: true, martName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.subscriptionPayment.count({ where }),
    ]);

    return res.json({
      data: payments.map(serializePayment),
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error("[subscriptions] GET /payments error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/subscriptions/payments/:id/approve
router.put("/payments/:id/approve", authenticate, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const approverId = req.user.id;
    const approverName = req.user.name || req.user.username || "System Admin";

    const approved = await activateSubscriptionFromPayment({
      paymentId: id,
      approverId,
      approverName,
    });

    return res.json(serializePayment(approved));
  } catch (err) {
    console.error("[subscriptions] PUT /payments/:id/approve error:", err);
    return res.status(400).json({ message: err.message || "Failed to approve payment" });
  }
});

// PUT /api/subscriptions/payments/:id/reject
router.put("/payments/:id/reject", authenticate, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const approverId = req.user.id;
    const approverName = req.user.name || req.user.username || "System Admin";

    const rejected = await rejectSubscriptionPayment({
      paymentId: id,
      approverId,
      approverName,
      reason: reason || "Payment verification failed",
    });

    return res.json(serializePayment(rejected));
  } catch (err) {
    console.error("[subscriptions] PUT /payments/:id/reject error:", err);
    return res.status(400).json({ message: err.message || "Failed to reject payment" });
  }
});

// GET /api/subscriptions/settings
router.get("/settings", authenticate, requireSystemAdmin, async (_req, res) => {
  try {
    const settings = await getOrCreateSettings();
    return res.json(settings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/subscriptions/settings
router.put("/settings", authenticate, requireSystemAdmin, async (req, res) => {
  try {
    const settings = await getOrCreateSettings();

    const allowed = [
      "defaultFeeEtb",
      "billingPeriodDays",
      "defaultProductLimit",
      "defaultTransactionLimit",
      "warningDaysBeforeExpiry",
      "autoSuspendEnabled",
      "trialPeriodDays",
      "packagePrices",
      "paymentMethods",
    ];

    const updatedData = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updatedData[key] = req.body[key];
      }
    }

    const updatedSettings = await prisma.subscriptionSettings.update({
      where: { id: settings.id },
      data: updatedData,
    });
    return res.json(updatedSettings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// GET /api/subscriptions/marts
router.get("/marts", authenticate, requireSystemAdmin, async (_req, res) => {
  try {
    const results = await runSubscriptionChecksForAllMarts({ persist: false });
    return res.json(results);
  } catch (err) {
    console.error("[subscriptions] GET /marts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/subscriptions/check-all
router.post("/check-all", authenticate, requireSystemAdmin, async (_req, res) => {
  try {
    const results = await runSubscriptionChecksForAllMarts({ persist: true });
    return res.json({ count: results.length, results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/subscriptions/marts/:id/check
router.post("/marts/:id/check", authenticate, requireSystemAdmin, async (req, res) => {
  try {
    const result = await runSubscriptionCheckForMart(req.params.id, {
      persist: true,
    });
    if (!result) {
      return res.status(404).json({ message: "Mart not found" });
    }
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/subscriptions/marts/:id/plan
router.put("/marts/:id/plan", authenticate, requireSystemAdmin, async (req, res) => {
  try {
    const mart = await martRepository.findById(req.params.id);
    if (!mart) {
      return res.status(404).json({ message: "Mart not found" });
    }

    const allowed = [
      "feeEtb",
      "billingPeriodDays",
      "productLimit",
      "transactionLimit",
      "warningDaysBeforeExpiry",
      "subscriptionStartDate",
      "subscriptionEndDate",
      "isTrial",
      "packageName",
      "packageMonths",
    ];

    const subData = mart.subscription && typeof mart.subscription === "object" ? mart.subscription : {};
    const updatedSub = { ...subData };
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updatedSub[key] = req.body[key];
      }
    }

    await martRepository.update(mart.id, { subscription: updatedSub });

    const result = await runSubscriptionCheckForMart(req.params.id, {
      persist: true,
    });

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// GET /api/subscriptions/capacity
router.get("/capacity", authenticate, async (req, res) => {
  try {
    const { martId } = req.user;
    if (!martId) {
      return res.status(400).json({ message: "No mart assigned" });
    }

    const capacity = await getProductCapacity(martId);
    return res.json(capacity);
  } catch (err) {
    console.error("[subscriptions] GET capacity error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
