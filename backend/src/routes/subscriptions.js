const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { uploadBuffer } = require("../utils/cloudinary");
const prisma = require("../repositories/prismaClient");
const martRepository = require("../repositories/martRepository");
const { authenticate } = require("../middleware/auth");
const {
  getOrCreateSettings,
  getPackageList,
  getHardwareProductsList,
  runSubscriptionCheckForMart,
  runSubscriptionChecksForAllMarts,
  activateSubscriptionFromPayment,
  rejectSubscriptionPayment,
  notifySystemAdmins,
  DEFAULT_PAYMENT_METHODS,
} = require("../services/subscription.service");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

function requireSystemAdmin(req, res, next) {
  const role = req.user?.role;
  if (role !== "systemAdmin" && role !== "system_admin") {
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
// Public — payment destination info is shown during public checkout (no auth required)
router.get("/payment-methods", async (_req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const rawMethods = (Array.isArray(settings.paymentMethods) && settings.paymentMethods.length > 0)
      ? settings.paymentMethods
      : DEFAULT_PAYMENT_METHODS;
    const activeMethods = rawMethods.filter((m) => m.active !== false);
    return res.json(activeMethods);
  } catch (err) {
    console.error("[subscriptions] GET /payment-methods error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// GET /api/subscriptions/hardware-products
router.get("/hardware-products", async (_req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const list = getHardwareProductsList(settings);
    // Only return active hardware products to public clients
    const active = list.filter((p) => p.active !== false);
    return res.json(active);
  } catch (err) {
    console.error("[subscriptions] GET /hardware-products error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/subscriptions/hardware-products (System Admin only)
router.put("/hardware-products", authenticate, requireSystemAdmin, async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ message: "products array is required" });
    }

    const settings = await getOrCreateSettings();
    const updated = await prisma.subscriptionSettings.update({
      where: { id: settings.id },
      data: { hardwareProducts: products },
    });

    return res.json({ message: "Hardware products updated", hardwareProducts: updated.hardwareProducts });
  } catch (err) {
    console.error("[subscriptions] PUT /hardware-products error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/subscriptions/upload-hardware-image (System Admin only)
router.post("/upload-hardware-image", authenticate, requireSystemAdmin, upload.single("image"), async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ message: "No image file provided" });
  }
  try {
    const uploaded = await uploadBuffer(
      req.file.buffer,
      req.file.originalname,
      `${req.protocol}://${req.get("host")}`,
      "pos_hardware",
    );
    const imageUrl = uploaded.secure_url || uploaded.url;
    return res.json({ imageUrl });
  } catch (err) {
    console.error("[subscriptions] hardware image upload error:", err);
    return res.status(500).json({ message: "Hardware image upload failed" });
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

const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");
const JWT_SECRET = process.env.JWT_SECRET || "changeme";

const optionalAuthenticate = async (req, res, next) => {
  let auth = req.headers.authorization;
  if (!auth && req.query.token) {
    auth = `Bearer ${req.query.token}`;
  }
  if (!auth) {
    req.user = null;
    return next();
  }
  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    req.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(parts[1], JWT_SECRET);
    const dbUser = await userRepository.findById(payload.id, {
      select: { id: true, username: true, role: true, martId: true, isDeleted: true },
    });
    if (dbUser && !dbUser.isDeleted) {
      req.user = {
        id: dbUser.id,
        username: dbUser.username,
        role: dbUser.role,
        martId: dbUser.martId,
      };
    } else {
      req.user = null;
    }
  } catch (err) {
    req.user = null;
  }
  next();
};

// POST /api/subscriptions/pay
router.post("/pay", optionalAuthenticate, upload.single("receipt"), async (req, res) => {
  try {
    let targetMartId = req.user?.martId || req.body.martId;
    let targetUserId = req.user?.id;

    if (!targetMartId) {
      return res.status(400).json({ message: "martId or authenticated user is required" });
    }

    const mart = await martRepository.findById(targetMartId);
    if (!mart) {
      return res.status(404).json({ message: "Mart not found" });
    }

    if (!targetUserId) {
      const ownerUser = await prisma.user.findFirst({
        where: { martId: targetMartId, role: "owner", isDeleted: false },
        select: { id: true },
      });
      targetUserId = ownerUser?.id || null;
    }

    if (!targetUserId) {
      return res.status(400).json({ message: "Owner user not found for mart" });
    }

    const { packageMonths, paymentMethod, paymentReference } = req.body;
    const months = parseInt(packageMonths, 10);

    // Free package is months=0; paid packages are 1, 3, 6, 9, 12
    if (![0, 1, 3, 6, 9, 12].includes(months)) {
      return res.status(400).json({ message: "Valid package is required (Free, 1, 3, 6, 9, or 12 months)" });
    }

    const isFree = months === 0;

    // Calculate price from settings
    const settings = await getOrCreateSettings();
    const packageList = getPackageList(settings);
    const selectedPkg = packageList.find((p) => p.months === months);
    const subAmount = selectedPkg ? selectedPkg.price : months * 1000;
    const packageName = selectedPkg ? selectedPkg.name : `${months} Months`;

    // Parse hardware details from request
    let hardwareDetails = [];
    try {
      if (req.body.hardwareDetails) {
        const parsed = typeof req.body.hardwareDetails === 'string' 
          ? JSON.parse(req.body.hardwareDetails) 
          : req.body.hardwareDetails;
        hardwareDetails = Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      console.error("[subscriptions] Failed to parse hardwareDetails:", err);
      hardwareDetails = [];
    }

    // Calculate hardware total from hardwareDetails
    const totalHardwareAmount = hardwareDetails.reduce((sum, hw) => {
      const count = parseInt(hw.count, 10) || 0;
      const unitPrice = parseFloat(hw.unitPrice) || 0;
      return sum + (count * unitPrice);
    }, 0);

    const totalAmount = subAmount + totalHardwareAmount;
    const hasHardware = hardwareDetails.length > 0 && hardwareDetails.some(hw => (parseInt(hw.count, 10) || 0) > 0);
    if (!isFree || hasHardware) {
      if (!paymentMethod || !String(paymentMethod).trim()) {
        return res.status(400).json({ message: "Payment method is required" });
      }
    }

    // Receipt is required for paid packages, and for free packages that include hardware.
    // A free package with no hardware does not require a receipt.
    let receiptUrl = req.body.receiptUrl || "";
    if (req.file && req.file.buffer) {
      try {
        const uploaded = await uploadBuffer(
          req.file.buffer,
          req.file.originalname,
          `${req.protocol}://${req.get("host")}`,
          "pos_receipts",
        );
        receiptUrl = uploaded.secure_url || uploaded.url || receiptUrl;
      } catch (err) {
        console.error("[subscriptions] payment receipt upload error:", err);
        return res.status(500).json({ message: "Receipt upload failed" });
      }
    }

    const receiptRequired = !isFree || hasHardware;
    if (receiptRequired && !receiptUrl) {
      return res.status(400).json({ message: "Payment receipt image is required" });
    }

    // Build hardware summary string for payment reference
    let hardwareSummary = "";
    if (hasHardware) {
      const parts = hardwareDetails
        .filter(hw => (parseInt(hw.count, 10) || 0) > 0)
        .map(hw => `${hw.count}x ${hw.name || hw.id}`);
      hardwareSummary = ` | Add-ons: ${parts.join(", ")}`;
    }

    const fullRef = (paymentReference ? String(paymentReference).trim() : "") + hardwareSummary;

    // Create SubscriptionPayment (status pending so it appears in the admin approvals queue)
    const payment = await prisma.subscriptionPayment.create({
      data: {
        martId: targetMartId,
        userId: targetUserId,
        packageName,
        packageMonths: months,
        amount: totalAmount,
        currency: "ETB",
        paymentMethod: isFree && !hasHardware ? "Free Trial" : String(paymentMethod).trim(),
        paymentReference: fullRef || null,
        receiptUrl: receiptUrl || "",
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
      title: isFree ? "New Free Plan Registration" : "New Subscription Payment Submitted",
      message: `${mart.martName} registered for ${packageName} (${totalAmount} ETB).`,
      data: {
        paymentId: payment.id,
        martId: mart.id,
        martName: mart.martName,
        packageName,
        amount: totalAmount,
        isFree,
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

    if (Array.isArray(updatedData.paymentMethods) && updatedData.paymentMethods.length === 0) {
      delete updatedData.paymentMethods;
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

module.exports = router;
