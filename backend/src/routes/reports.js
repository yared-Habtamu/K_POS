const express = require("express");
const router = express.Router();
const Sale = require("../models/sale.model");
const { authenticate } = require("../middleware/auth");

// GET /api/reports/daily?martId=...&date=YYYY-MM-DD
// For systemAdmin: if no martId provided, aggregates across all marts
router.get("/daily", authenticate, async (req, res) => {
  try {
    const { martId, date } = req.query;
    const day = date || new Date().toISOString().slice(0, 10);
    const start = new Date(day + "T00:00:00.000Z");
    const end = new Date(day + "T23:59:59.999Z");

    const filter = { date: { $gte: start, $lte: end } };
    if (req.user.role !== "systemAdmin") {
      filter.martId = req.user.martId;
    } else if (martId) {
      filter.martId = martId;
    }

    const sales = await Sale.find(filter).lean();

    const totalSales = sales.reduce((s, x) => s + (x.total || 0), 0);
    const grossSales = sales.reduce((s, x) => s + (x.subtotal || 0), 0);
    const discountsTotal = sales.reduce(
      (s, x) => s + ((x.discount && x.discount.amount) || 0),
      0
    );

    const salesByPaymentMethod = {};
    const salesByCashier = {};

    for (const s of sales) {
      const m = s.paymentMethod || "unknown";
      salesByPaymentMethod[m] = (salesByPaymentMethod[m] || 0) + (s.total || 0);
      const cid = s.cashierId
        ? String(s.cashierId)
        : s.cashierName || "unknown";
      if (!salesByCashier[cid])
        salesByCashier[cid] = {
          cashierId: cid,
          cashierName: s.cashierName || "Unknown",
          sales: 0,
        };
      salesByCashier[cid].sales += s.total || 0;
    }

    res.json({
      date: day,
      totalSales,
      grossSales,
      discountsTotal,
      salesByPaymentMethod: Object.entries(salesByPaymentMethod).map(
        ([method, total]) => ({ method, total })
      ),
      salesByCashier: Object.values(salesByCashier),
      count: sales.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/reports/summary?martId=...&range=daily|weekly|monthly|custom&start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/summary", authenticate, async (req, res) => {
  try {
    const { martId, range, start, end, date } = req.query;
    // build filter. systemAdmin may omit martId to aggregate platform-wide
    const filterBase = {};
    if (req.user.role !== "systemAdmin") {
      filterBase.martId = req.user.martId;
    } else if (martId) {
      filterBase.martId = martId;
    }

    let startDate, endDate;
    const now = new Date();

    if (range === "daily" || (!range && date)) {
      const day = (date && String(date)) || now.toISOString().slice(0, 10);
      startDate = new Date(day + "T00:00:00.000Z");
      endDate = new Date(day + "T23:59:59.999Z");
    } else if (range === "weekly") {
      // last 7 days (including today)
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === "monthly") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      startDate = new Date(first.setHours(0, 0, 0, 0));
      endDate = new Date(last.setHours(23, 59, 59, 999));
    } else if (range === "custom") {
      if (!start || !end)
        return res
          .status(400)
          .json({ message: "start and end required for custom range" });
      startDate = new Date(String(start) + "T00:00:00.000Z");
      endDate = new Date(String(end) + "T23:59:59.999Z");
    } else {
      // default to monthly
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      startDate = new Date(first.setHours(0, 0, 0, 0));
      endDate = new Date(last.setHours(23, 59, 59, 999));
    }

    const filter = { ...filterBase, date: { $gte: startDate, $lte: endDate } };
    const sales = await Sale.find(filter).lean();

    const totalSales = sales.reduce((s, x) => s + (x.total || 0), 0);
    const grossSales = sales.reduce((s, x) => s + (x.subtotal || 0), 0);
    const discountsTotal = sales.reduce(
      (s, x) => s + ((x.discount && x.discount.amount) || 0),
      0
    );

    const salesByPaymentMethod = {};
    const salesByCashier = {};
    for (const s of sales) {
      const m = s.paymentMethod || "unknown";
      salesByPaymentMethod[m] = (salesByPaymentMethod[m] || 0) + (s.total || 0);
      const cid = s.cashierId
        ? String(s.cashierId)
        : s.cashierName || "unknown";
      if (!salesByCashier[cid])
        salesByCashier[cid] = {
          cashierId: cid,
          cashierName: s.cashierName || "Unknown",
          sales: 0,
        };
      salesByCashier[cid].sales += s.total || 0;
    }

    // Build series: totals per day between startDate and endDate
    const series = [];
    const days = [];
    const cur = new Date(startDate);
    cur.setHours(0, 0, 0, 0);
    const last = new Date(endDate);
    last.setHours(0, 0, 0, 0);
    while (cur <= last) {
      const key = cur.toISOString().slice(0, 10);
      days.push(key);
      series.push({ date: key, total: 0 });
      cur.setDate(cur.getDate() + 1);
    }

    const dailyMap = {};
    for (const d of days) dailyMap[d] = 0;
    for (const s of sales) {
      const k = (s.date || new Date()).toISOString().slice(0, 10);
      dailyMap[k] = (dailyMap[k] || 0) + (s.total || 0);
    }
    for (let i = 0; i < series.length; i++) {
      series[i].total = dailyMap[series[i].date] || 0;
    }

    res.json({
      range: range || "monthly",
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      totalSales,
      grossSales,
      discountsTotal,
      salesByPaymentMethod: Object.entries(salesByPaymentMethod).map(
        ([method, total]) => ({ method, total })
      ),
      salesByCashier: Object.values(salesByCashier),
      series,
      count: sales.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
