const express = require("express");
const router = express.Router();
const Sale = require("../models/sale.model");
const Expense = require("../models/expense.model");
const Product = require("../models/product.model");
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

// GET /api/reports/mart?range=daily|weekly|monthly|custom&start=YYYY-MM-DD&end=YYYY-MM-DD
// Returns aggregated metrics for a mart: totalSales, cogs (cost of goods sold), expenses, profit, transactions, topProducts
router.get("/mart", authenticate, async (req, res) => {
  try {
    const { martId, range, start, end } = req.query;
    // determine target mart: systemAdmin may provide martId, others use their mart
    const targetMartId = req.user.role === "systemAdmin" ? martId || undefined : req.user.martId;
    if (!targetMartId) return res.status(400).json({ message: "martId required" });

    let startDate, endDate;
    const now = new Date();
    if (range === "daily") {
      startDate = new Date(now.toISOString().slice(0, 10) + "T00:00:00.000Z");
      endDate = new Date(now.toISOString().slice(0, 10) + "T23:59:59.999Z");
    } else if (range === "weekly") {
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
      if (!start || !end) return res.status(400).json({ message: "start and end required for custom range" });
      startDate = new Date(String(start) + "T00:00:00.000Z");
      endDate = new Date(String(end) + "T23:59:59.999Z");
    } else {
      // default: monthly
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      startDate = new Date(first.setHours(0, 0, 0, 0));
      endDate = new Date(last.setHours(23, 59, 59, 999));
    }

    // Fetch sales in range
    const sales = await Sale.find({ martId: targetMartId, date: { $gte: startDate, $lte: endDate } }).lean();
    const totalSales = sales.reduce((s, x) => s + (x.total || 0), 0);
    const transactions = sales.length;

    // Compute COGS: sum of (item.quantity * purchasePrice). Need product purchasePrice lookup
    const productIds = Array.from(new Set(sales.flatMap((s) => (s.items || []).map((it) => it.productId).filter(Boolean))));
    const products = productIds.length ? await Product.find({ _id: { $in: productIds } }).lean() : [];
    const productMap = {};
    for (const p of products) productMap[String(p._id)] = p;

    let cogs = 0;
    for (const s of sales) {
      for (const it of s.items || []) {
        const pid = String(it.productId || "");
        const purchasePrice = productMap[pid] ? Number(productMap[pid].purchasePrice || 0) : Number(it.purchasePrice || 0);
        const qty = Number(it.quantity || 0);
        cogs += purchasePrice * qty;
      }
    }

    // Fetch expenses
    const expenses = await Expense.find({ martId: targetMartId, date: { $gte: startDate, $lte: endDate } }).lean();
    const totalExpenses = expenses.reduce((s, x) => s + (x.amount || 0), 0);

    const profit = totalSales - cogs - totalExpenses;

    // Top products by sold quantity.
    // Include both canonical product-linked items and free-text sale items.
    // For linked items use Product.name; for free-text use the sale item name normalized.
    const prodAgg = {};
    for (const s of sales) {
      // precompute sale-level fallback unit price if needed
      const saleTotal = Number(s.total || 0);
      const saleQty = (s.items || []).reduce((acc, ii) => acc + Number(ii.quantity || 0), 0) || 0;
      const saleUnitFallback = saleQty > 0 ? saleTotal / saleQty : 0;

      for (const it of s.items || []) {
        const rawPid = it.productId;
        let key;
        let productId = null;

        // derive a reliable name from several possible fields
        let productName = "";
        if (it.name && String(it.name).trim()) productName = String(it.name).trim();
        else if (it.productName && String(it.productName).trim()) productName = String(it.productName).trim();
        else if (it.title && String(it.title).trim()) productName = String(it.title).trim();
        else if (it.product && it.product.name && String(it.product.name).trim()) productName = String(it.product.name).trim();
        // fall back
        if (!productName) productName = "Unknown";

        if (rawPid) {
          productId = String(rawPid);
          key = `pid:${productId}`;
          if (productMap[productId] && productMap[productId].name) productName = productMap[productId].name;
        } else {
          // fallback grouping by normalized name for free-text items
          const nameNorm = (productName || "").trim();
          key = `name:${nameNorm.toLowerCase()}`;
          productName = nameNorm || productName;
        }

        if (!prodAgg[key]) prodAgg[key] = { productId, name: productName, sold: 0, revenue: 0 };
        prodAgg[key].sold += Number(it.quantity || 0);

        // compute line revenue with fallbacks:
        // 1) item.total if present
        // 2) item.quantity * item.price if price present
        // 3) estimate from sale-level average (sale.total / saleQty)
        let lineRevenue = null;
        if (it.total != null && it.total !== undefined) lineRevenue = Number(it.total);
        else if (it.price != null && it.price !== undefined) lineRevenue = Number(it.quantity || 0) * Number(it.price);
        else lineRevenue = Number((saleUnitFallback || 0) * Number(it.quantity || 0));

        prodAgg[key].revenue += Number(lineRevenue || 0);
      }
    }
    const topProducts = Object.values(prodAgg)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10);

    // Build series totals per day between startDate and endDate
    const series = [];
    const days = [];
    const cur = new Date(startDate);
    cur.setHours(0, 0, 0, 0);
    const lastDay = new Date(endDate);
    lastDay.setHours(0, 0, 0, 0);
    while (cur <= lastDay) {
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
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      totalSales,
      transactions,
      cogs,
      expenses: totalExpenses,
      profit,
      topProducts,
      series,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

