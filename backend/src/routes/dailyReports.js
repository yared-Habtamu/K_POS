const express = require("express");
const router = express.Router();
const DailyReport = require("../models/dailyReport.model");
const { authenticate } = require("../middleware/auth");

// POST /api/daily-reports  -- create a daily report
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      date,
      totalSales,
      cashReceived,
      bankTransfer,
      discountsGiven,
      notes,
      martId,
    } = req.body || {};
    const targetMartId =
      req.user.role === "systemAdmin"
        ? martId || req.user.martId
        : req.user.martId;
    if (!targetMartId)
      return res.status(400).json({ message: "martId required" });
    if (!date) return res.status(400).json({ message: "date required" });

    const reportDate = new Date(String(date) + "T00:00:00.000Z");

    const doc = new DailyReport({
      martId: targetMartId,
      cashierId: req.user.id,
      cashierName: req.user.username || req.user.name,
      date: reportDate,
      totalSales: Number(totalSales) || 0,
      cashReceived: Number(cashReceived) || 0,
      bankTransfer: Number(bankTransfer) || 0,
      discountsGiven: Number(discountsGiven) || 0,
      notes: notes || "",
    });

    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/daily-reports?martId=...&date=YYYY-MM-DD
router.get("/", authenticate, async (req, res) => {
  try {
    const { martId, date } = req.query;
    const targetMartId =
      req.user.role === "systemAdmin"
        ? martId || req.user.martId
        : req.user.martId;
    if (!targetMartId)
      return res.status(400).json({ message: "martId required" });
    const day = (date && String(date)) || new Date().toISOString().slice(0, 10);
    const start = new Date(day + "T00:00:00.000Z");
    const end = new Date(day + "T23:59:59.999Z");

    const list = await DailyReport.find({
      martId: targetMartId,
      date: { $gte: start, $lte: end },
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
