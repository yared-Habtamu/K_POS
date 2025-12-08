const express = require("express");
const router = express.Router();
const Sale = require("../models/sale.model");
const { authenticate } = require("../middleware/auth");

// GET /api/reports/daily?martId=...&date=YYYY-MM-DD
router.get("/daily", authenticate, async (req, res) => {
  try {
    const { martId, date } = req.query;
    const targetMartId =
      req.user.role === "systemAdmin"
        ? martId || req.user.martId
        : req.user.martId;
    if (!targetMartId)
      return res.status(400).json({ message: "martId required" });
    const day = date || new Date().toISOString().slice(0, 10);
    const start = new Date(day + "T00:00:00.000Z");
    const end = new Date(day + "T23:59:59.999Z");

    const sales = await Sale.find({
      martId: targetMartId,
      date: { $gte: start, $lte: end },
    }).lean();

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

module.exports = router;
