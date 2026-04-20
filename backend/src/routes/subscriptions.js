const express = require("express");
const router = express.Router();
const Mart = require("../models/mart.model");
const { authenticate } = require("../middleware/auth");
const {
  getOrCreateSettings,
  runSubscriptionCheckForMart,
  runSubscriptionChecksForAllMarts,
} = require("../services/subscription.service");

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
      "warningDaysBeforeExpiry",
      "warningStoragePercent",
      "autoSuspendEnabled",
    ];

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        settings[key] = req.body[key];
      }
    }

    await settings.save();
    return res.json(settings);
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
      const mart = await Mart.findById(req.params.id);
      if (!mart) {
        return res.status(404).json({ message: "Mart not found" });
      }

      const allowed = [
        "feeEtb",
        "billingPeriodDays",
        "storageLimitMb",
        "warningDaysBeforeExpiry",
        "warningStoragePercent",
        "subscriptionStartDate",
        "subscriptionEndDate",
      ];

      mart.subscription = mart.subscription || {};
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) {
          mart.subscription[key] = req.body[key];
        }
      }

      await mart.save();
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

module.exports = router;
