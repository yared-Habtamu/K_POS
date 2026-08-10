const express = require("express");
const router = express.Router();
const martRepository = require("../repositories/martRepository");
const { authenticate } = require("../middleware/auth");
const {
  getOrCreateSettings,
  runSubscriptionCheckForMart,
  runSubscriptionChecksForAllMarts,
} = require("../services/subscription.service");
const {
  getProductCapacity,
} = require("../services/productCapacity.service");

function requireSystemAdmin(req, res, next) {
  if (req.user.role !== "systemAdmin") {
    return res.status(403).json({ message: "Insufficient permissions" });
  }
  return next();
}

router.get("/settings", authenticate, requireSystemAdmin, async (_req, res) => {
  try {
    const settings = await getOrCreateSettings();
    return res.json(settings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.put("/settings", authenticate, requireSystemAdmin, async (req, res) => {
  try {
    const settings = await getOrCreateSettings();

    const allowed = [
      "defaultFeeEtb",
      "billingPeriodDays",
      "defaultStorageLimitMb",
      "defaultProductLimit",
      "warningDaysBeforeExpiry",
      "warningStoragePercent",
      "autoSuspendEnabled",
    ];

    const updatedData = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updatedData[key] = req.body[key];
      }
    }

    const prisma = require("../repositories/prismaClient");
    const updatedSettings = await prisma.subscriptionSettings.update({
        where: { id: settings.id },
        data: updatedData
    });
    return res.json(updatedSettings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/marts", authenticate, requireSystemAdmin, async (_req, res) => {
  try {
    const results = await runSubscriptionChecksForAllMarts({ persist: true });
    return res.json(results);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post(
  "/check-all",
  authenticate,
  requireSystemAdmin,
  async (_req, res) => {
    try {
      const results = await runSubscriptionChecksForAllMarts({ persist: true });
      return res.json({ count: results.length, results });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  },
);

router.post(
  "/marts/:id/check",
  authenticate,
  requireSystemAdmin,
  async (req, res) => {
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
  },
);

router.put(
  "/marts/:id/plan",
  authenticate,
  requireSystemAdmin,
  async (req, res) => {
    try {
      const mart = await martRepository.findById(req.params.id);
      if (!mart) {
        return res.status(404).json({ message: "Mart not found" });
      }

      const allowed = [
        "feeEtb",
        "billingPeriodDays",
        "storageLimitMb",
        "productLimit",
        "warningDaysBeforeExpiry",
        "warningStoragePercent",
        "subscriptionStartDate",
        "subscriptionEndDate",
      ];

      const subData = mart.subscription && typeof mart.subscription === 'object' ? mart.subscription : {};
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
  },
);

// ─── GET /api/subscriptions/capacity ─────────────────────────────────────────
// Get product capacity for the current user's mart.

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
