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

    if (req.user.role === "cashier") {
      filter.cashierId = req.user.id;
    }

    const sales = await Sale.find(filter).lean();

    const totalSales = sales.reduce((s, x) => s + (x.total || 0), 0);
    const grossSales = sales.reduce((s, x) => s + (x.subtotal || 0), 0);
    const discountsTotal = sales.reduce(
      (s, x) => s + ((x.discount && x.discount.amount) || 0),
      0,
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
        ([method, total]) => ({ method, total }),
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

    const totalTax = sales.reduce((s, x) => s + (x.tax || 0), 0);

    // Build product map for tax by category
    const productIds = Array.from(
      new Set(
        sales.flatMap((s) =>
          (s.items || []).map((it) => it.productId).filter(Boolean),
        ),
      ),
    );
    const products = productIds.length
      ? await Product.find({ _id: { $in: productIds } }).lean()
      : [];
    const productMap = {};
    for (const p of products) productMap[String(p._id)] = p;

    const taxByCategoryMap = {};
    const categorySalesMap = {};
    const paymentMethodsMap = {};
    for (const s of sales) {
      const saleTax = Number(s.tax || 0);
      const paymentMethod = String(s.paymentMethod || "unknown");
      paymentMethodsMap[paymentMethod] =
        (paymentMethodsMap[paymentMethod] || 0) + Number(s.total || 0);
      if (!saleTax) continue;

      const items = s.items || [];
      const itemTotals = items.map((it) => {
        if (it.total != null) return Number(it.total || 0);
        if (it.price != null)
          return Number(it.quantity || 0) * Number(it.price || 0);
        return 0;
      });
      const computedSubtotal = itemTotals.reduce((acc, v) => acc + v, 0);
      const saleSubtotal = Number(s.subtotal || computedSubtotal || 0);
      if (!saleSubtotal) continue;

      for (let i = 0; i < items.length; i++) {
        const it = items[i] || {};
        const rawPid = it.productId ? String(it.productId) : null;
        const category =
          rawPid && productMap[rawPid] && productMap[rawPid].category
            ? String(productMap[rawPid].category)
            : "Uncategorized";
        const itemTotal = itemTotals[i] || 0;
        if (!itemTotal) continue;
        categorySalesMap[category] =
          (categorySalesMap[category] || 0) + itemTotal;
        const itemTax = (itemTotal / saleSubtotal) * saleTax;
        taxByCategoryMap[category] =
          (taxByCategoryMap[category] || 0) + itemTax;
      }
    }
    const totalSales = sales.reduce((s, x) => s + (x.total || 0), 0);
    const grossSales = sales.reduce((s, x) => s + (x.subtotal || 0), 0);
    const discountsTotal = sales.reduce(
      (s, x) => s + ((x.discount && x.discount.amount) || 0),
      0,
    );
    const taxByCategory = Object.entries(taxByCategoryMap)
      .map(([category, tax]) => ({ category, tax: Number(tax || 0) }))
      .sort((a, b) => b.tax - a.tax);
    const categorySales = Object.entries(categorySalesMap)
      .map(([category, total]) => ({
        category,
        total: Number(total || 0),
        percentage:
          totalSales > 0 ? (Number(total || 0) / totalSales) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

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

    const totalItemsSold = sales.reduce(
      (s, x) =>
        s + (x.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0),
      0,
    );

    res.json({
      range: range || "monthly",
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      totalSales,
      grossSales,
      discountsTotal,
      totalTax,
      taxByCategory,
      totalItemsSold,
      salesByPaymentMethod: Object.entries(salesByPaymentMethod).map(
        ([method, total]) => ({ method, total }),
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
    const targetMartId =
      req.user.role === "systemAdmin" ? martId || undefined : req.user.martId;
    if (!targetMartId)
      return res.status(400).json({ message: "martId required" });

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
      if (!start || !end)
        return res
          .status(400)
          .json({ message: "start and end required for custom range" });
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
    const sales = await Sale.find({
      martId: targetMartId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();
    const totalSales = sales.reduce((s, x) => s + (x.total || 0), 0);
    const transactions = sales.length;
    const totalTax = sales.reduce((s, x) => s + (x.tax || 0), 0);

    // Compute COGS: sum of (item.quantity * purchasePrice). Need product purchasePrice lookup
    const productIds = Array.from(
      new Set(
        sales.flatMap((s) =>
          (s.items || []).map((it) => it.productId).filter(Boolean),
        ),
      ),
    );
    const products = productIds.length
      ? await Product.find({ _id: { $in: productIds } }).lean()
      : [];
    const productMap = {};
    for (const p of products) productMap[String(p._id)] = p;

    const taxByCategoryMap = {};
    const categorySalesMap = {};
    const paymentMethodsMap = {};
    for (const s of sales) {
      const saleTax = Number(s.tax || 0);
      const paymentMethod = String(s.paymentMethod || "unknown");
      paymentMethodsMap[paymentMethod] =
        (paymentMethodsMap[paymentMethod] || 0) + Number(s.total || 0);
      if (!saleTax) continue;

      const items = s.items || [];
      const itemTotals = items.map((it) => {
        if (it.total != null) return Number(it.total || 0);
        if (it.price != null)
          return Number(it.quantity || 0) * Number(it.price || 0);
        return 0;
      });
      const computedSubtotal = itemTotals.reduce((acc, v) => acc + v, 0);
      const saleSubtotal = Number(s.subtotal || computedSubtotal || 0);
      if (!saleSubtotal) continue;

      for (let i = 0; i < items.length; i++) {
        const it = items[i] || {};
        const rawPid = it.productId ? String(it.productId) : null;
        const category =
          rawPid && productMap[rawPid] && productMap[rawPid].category
            ? String(productMap[rawPid].category)
            : "Uncategorized";
        const itemTotal = itemTotals[i] || 0;
        if (!itemTotal) continue;
        categorySalesMap[category] =
          (categorySalesMap[category] || 0) + itemTotal;
        const itemTax = (itemTotal / saleSubtotal) * saleTax;
        taxByCategoryMap[category] =
          (taxByCategoryMap[category] || 0) + itemTax;
      }
    }
    const taxByCategory = Object.entries(taxByCategoryMap)
      .map(([category, tax]) => ({ category, tax: Number(tax || 0) }))
      .sort((a, b) => b.tax - a.tax);
    const categorySales = Object.entries(categorySalesMap)
      .map(([category, total]) => ({
        category,
        total: Number(total || 0),
        percentage:
          totalSales > 0 ? (Number(total || 0) / totalSales) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    let cogs = 0;
    for (const s of sales) {
      for (const it of s.items || []) {
        const pid = String(it.productId || "");
        const purchasePrice = productMap[pid]
          ? Number(productMap[pid].purchasePrice || 0)
          : Number(it.purchasePrice || 0);
        const qty = Number(it.quantity || 0);
        cogs += purchasePrice * qty;
      }
    }

    // Fetch expenses
    const expenses = await Expense.find({
      martId: targetMartId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();
    const totalExpenses = expenses.reduce((s, x) => s + (x.amount || 0), 0);

    const profit = totalSales - cogs - totalExpenses;

    // Top products by sold quantity.
    // Include both canonical product-linked items and free-text sale items.
    // For linked items use Product.name; for free-text use the sale item name normalized.
    const prodAgg = {};
    for (const s of sales) {
      // precompute sale-level fallback unit price if needed
      const saleTotal = Number(s.total || 0);
      const saleQty =
        (s.items || []).reduce(
          (acc, ii) => acc + Number(ii.quantity || 0),
          0,
        ) || 0;
      const saleUnitFallback = saleQty > 0 ? saleTotal / saleQty : 0;

      for (const it of s.items || []) {
        const rawPid = it.productId;
        let key;
        let productId = null;

        // derive a reliable name from several possible fields
        let productName = "";
        if (it.name && String(it.name).trim())
          productName = String(it.name).trim();
        else if (it.productName && String(it.productName).trim())
          productName = String(it.productName).trim();
        else if (it.title && String(it.title).trim())
          productName = String(it.title).trim();
        else if (
          it.product &&
          it.product.name &&
          String(it.product.name).trim()
        )
          productName = String(it.product.name).trim();
        // fall back
        if (!productName) productName = "Unknown";

        if (rawPid) {
          productId = String(rawPid);
          key = `pid:${productId}`;
          if (productMap[productId] && productMap[productId].name)
            productName = productMap[productId].name;
        } else {
          // fallback grouping by normalized name for free-text items
          const nameNorm = (productName || "").trim();
          key = `name:${nameNorm.toLowerCase()}`;
          productName = nameNorm || productName;
        }

        if (!prodAgg[key])
          prodAgg[key] = { productId, name: productName, sold: 0, revenue: 0 };
        prodAgg[key].sold += Number(it.quantity || 0);

        // compute line revenue with fallbacks:
        // 1) item.total if present
        // 2) item.quantity * item.price if price present
        // 3) estimate from sale-level average (sale.total / saleQty)
        let lineRevenue = null;
        if (it.total != null && it.total !== undefined)
          lineRevenue = Number(it.total);
        else if (it.price != null && it.price !== undefined)
          lineRevenue = Number(it.quantity || 0) * Number(it.price);
        else
          lineRevenue = Number(
            (saleUnitFallback || 0) * Number(it.quantity || 0),
          );

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

    const totalItemsSold = sales.reduce(
      (s, x) =>
        s + (x.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0),
      0,
    );

    res.json({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      totalSales,
      transactions,
      cogs,
      expenses: totalExpenses,
      profit,
      totalTax,
      taxByCategory,
      categorySales,
      salesByPaymentMethod: Object.entries(paymentMethodsMap)
        .map(([method, total]) => ({ method, total: Number(total || 0) }))
        .sort((a, b) => b.total - a.total),
      topProducts,
      totalItemsSold,
      series,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/admin-analytics", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "systemAdmin") {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const Mart = require("../models/mart.model");
    const User = require("../models/user.model");

    const [allMarts, allProducts, allUsers] = await Promise.all([
      Mart.find({ isDeleted: { $ne: true } }).lean(),
      Product.find({ isDeleted: { $ne: true } }).lean(),
      User.find({ isDeleted: { $ne: true } }).select("martId role").lean(),
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const [monthlySales, monthlyExpenses] = await Promise.all([
      Sale.find({ date: { $gte: monthStart, $lte: monthEnd } }).lean(),
      Expense.find({
        date: { $gte: monthStart, $lte: monthEnd },
        isDeleted: { $ne: true },
      }).lean(),
    ]);

    const salesByMart = {};
    for (const s of monthlySales) {
      const mid = String(s.martId);
      salesByMart[mid] = (salesByMart[mid] || 0) + (s.total || 0);
    }

    const expensesByMart = {};
    for (const e of monthlyExpenses) {
      const mid = String(e.martId);
      expensesByMart[mid] = (expensesByMart[mid] || 0) + (e.amount || 0);
    }

    const usersByMart = {};
    for (const u of allUsers) {
      if (u.martId) {
        const mid = String(u.martId);
        usersByMart[mid] = (usersByMart[mid] || 0) + 1;
      }
    }

    const productsByMart = {};
    const categoryMap = {};
    let totalInventoryValue = 0;
    let totalSellingValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of allProducts) {
      const mid = String(p.martId);
      if (!productsByMart[mid]) {
        productsByMart[mid] = {
          count: 0,
          inventoryValue: 0,
          sellingValue: 0,
          margins: [],
        };
      }

      const qty =
        Number(p.quantity || 0) +
        Number(p.storeQuantity || 0);
      const purchasePrice = Number(p.purchasePrice || 0);
      const sellingPrice = Number(p.sellingPrice || 0);
      const invValue = purchasePrice * qty;
      const sellValue = sellingPrice * qty;
      const margin =
        sellingPrice > 0 && purchasePrice > 0
          ? ((sellingPrice - purchasePrice) / sellingPrice) * 100
          : 0;

      productsByMart[mid].count += 1;
      productsByMart[mid].inventoryValue += invValue;
      productsByMart[mid].sellingValue += sellValue;
      if (margin > 0) productsByMart[mid].margins.push(margin);

      totalInventoryValue += invValue;
      totalSellingValue += sellValue;

      const cat = p.category || "Uncategorized";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;

      const totalQty = Number(p.quantity || 0) + Number(p.storeQuantity || 0);
      if (totalQty === 0) outOfStockCount += 1;
      else if (totalQty <= Number(p.lowStockThreshold || 10))
        lowStockCount += 1;
    }

    const martAnalytics = allMarts
      .filter((m) => m.status === "approved")
      .map((m) => {
        const mid = String(m._id);
        const pd = productsByMart[mid] || {
          count: 0,
          inventoryValue: 0,
          sellingValue: 0,
          margins: [],
        };
        const avgMargin =
          pd.margins.length > 0
            ? pd.margins.reduce((a, b) => a + b, 0) / pd.margins.length
            : 0;

        return {
          martId: mid,
          martName: m.martName || "Unnamed",
          productCount: pd.count,
          inventoryValue: Math.round(pd.inventoryValue * 100) / 100,
          sellingValue: Math.round(pd.sellingValue * 100) / 100,
          avgMargin: Math.round(avgMargin * 100) / 100,
          monthlySales: Math.round((salesByMart[mid] || 0) * 100) / 100,
          monthlyExpenses: Math.round((expensesByMart[mid] || 0) * 100) / 100,
          profit: Math.round(
            ((salesByMart[mid] || 0) - (expensesByMart[mid] || 0)) * 100
          ) / 100,
          userCount: usersByMart[mid] || 0,
        };
      })
      .sort((a, b) => b.monthlySales - a.monthlySales);

    const allMargins = allProducts
      .filter(
        (p) =>
          Number(p.sellingPrice || 0) > 0 && Number(p.purchasePrice || 0) > 0,
      )
      .map((p) => {
        const sp = Number(p.sellingPrice);
        const pp = Number(p.purchasePrice);
        return { margin: ((sp - pp) / sp) * 100, product: p };
      });

    const topMarginProducts = allMargins
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10)
      .map((x) => {
        const mart = allMarts.find(
          (m) => String(m._id) === String(x.product.martId),
        );
        return {
          name: x.product.name,
          martName: mart ? mart.martName : "Unknown",
          purchasePrice: Number(x.product.purchasePrice || 0),
          sellingPrice: Number(x.product.sellingPrice || 0),
          margin: Math.round(x.margin * 100) / 100,
        };
      });

    const topExpensiveProducts = [...allProducts]
      .sort((a, b) => (b.sellingPrice || 0) - (a.sellingPrice || 0))
      .slice(0, 10)
      .map((p) => {
        const mart = allMarts.find((m) => String(m._id) === String(p.martId));
        return {
          name: p.name,
          martName: mart ? mart.martName : "Unknown",
          purchasePrice: Number(p.purchasePrice || 0),
          sellingPrice: Number(p.sellingPrice || 0),
          category: p.category || "Uncategorized",
        };
      });

    const categoryDistribution = Object.entries(categoryMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const overallAvgMargin =
      allMargins.length > 0
        ? allMargins.reduce((a, b) => a + b.margin, 0) / allMargins.length
        : 0;

    const totalMonthlySales = monthlySales.reduce(
      (s, x) => s + (x.total || 0),
      0,
    );
    const totalMonthlyExpenses = monthlyExpenses.reduce(
      (s, x) => s + (x.amount || 0),
      0,
    );
    const totalTransactions = monthlySales.length;

    const productList = allProducts.map((p) => {
      const mart = allMarts.find((m) => String(m._id) === String(p.martId));
      const sp = Number(p.sellingPrice || 0);
      const pp = Number(p.purchasePrice || 0);
      const margin = sp > 0 && pp > 0 ? ((sp - pp) / sp) * 100 : 0;
      const totalQty = Number(p.quantity || 0) + Number(p.storeQuantity || 0);
      let stockStatus = "in_stock";
      if (totalQty === 0) stockStatus = "out_of_stock";
      else if (totalQty <= Number(p.lowStockThreshold || 10))
        stockStatus = "low_stock";

      return {
        _id: p._id,
        name: p.name,
        category: p.category || "Uncategorized",
        martName: mart ? mart.martName : "Unknown",
        martId: String(p.martId),
        purchasePrice: pp,
        sellingPrice: sp,
        margin: Math.round(margin * 100) / 100,
        quantity: totalQty,
        stockStatus,
      };
    });

    res.json({
      platform: {
        totalProducts: allProducts.length,
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        totalSellingValue: Math.round(totalSellingValue * 100) / 100,
        overallAvgMargin: Math.round(overallAvgMargin * 100) / 100,
        lowStockCount,
        outOfStockCount,
        totalMonthlySales: Math.round(totalMonthlySales * 100) / 100,
        totalMonthlyExpenses: Math.round(totalMonthlyExpenses * 100) / 100,
        totalMonthlyProfit:
          Math.round((totalMonthlySales - totalMonthlyExpenses) * 100) / 100,
        totalTransactions,
        totalMarts: allMarts.filter((m) => m.status === "approved").length,
        totalUsers: allUsers.length,
      },
      martAnalytics,
      topMarginProducts,
      topExpensiveProducts,
      categoryDistribution,
      products: productList,
    });
  } catch (err) {
    console.error("admin-analytics error", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
// GET /api/reports/today-sales?martId=...
// Returns aggregated items sold today with quantity, VAT and totals.
router.get("/today-sales", authenticate, async (req, res) => {
  try {
    const { martId, date } = req.query;
    const day = (date && String(date)) || new Date().toISOString().slice(0, 10);
    const start = new Date(day + "T00:00:00.000Z");
    const end = new Date(day + "T23:59:59.999Z");

    const filter = { date: { $gte: start, $lte: end } };

    const userMartId = req.user.martId ? String(req.user.martId) : "";
    const queryMartId = martId ? String(martId) : "";

    // Cashiers only see their own sales
    if (req.user.role === "cashier") {
      filter.cashierId = req.user._id || req.user.id;
      const effectiveMartId = userMartId || queryMartId;
      if (effectiveMartId) {
        filter.martId = effectiveMartId;
      }
    } else if (req.user.role !== "systemAdmin") {
      // owner/manager/store_keeper see mart-wide sales
      if (userMartId && queryMartId && userMartId !== queryMartId) {
        return res.status(403).json({ message: "Cannot access another mart" });
      }
      const effectiveMartId = userMartId || queryMartId;
      if (!effectiveMartId) {
        return res.status(400).json({ message: "martId required" });
      }
      filter.martId = effectiveMartId;
    } else if (queryMartId) {
      // system admin may provide martId to scope
      filter.martId = queryMartId;
    }

    const sales = await Sale.find(filter).lean();

    // aggregate by productId when available, else by name
    const prodAgg = {};
    const productIds = Array.from(
      new Set(
        sales.flatMap((s) =>
          (s.items || []).map((it) => it.productId).filter(Boolean),
        ),
      ),
    );

    const products = productIds.length
      ? await Product.find({ _id: { $in: productIds } }).lean()
      : [];
    const productMap = {};
    for (const p of products) productMap[String(p._id)] = p;

    for (const s of sales) {
      const paymentMethod = String(s.paymentMethod || "unknown");
      // soldBy: prefer cashierId where available, else use cashierName
      const soldById = s.cashierId ? String(s.cashierId) : null;
      const soldByName = s.cashierName || "unknown";
      const soldByKey = soldById ? soldById : soldByName;
      for (const it of s.items || []) {
        const rawPid = it.productId ? String(it.productId) : null;
        // include payment method and soldBy in grouping key so same product sold
        // by different users or payment methods becomes separate rows
        const baseKey = rawPid
          ? `pid:${rawPid}`
          : `name:${(it.name || "").trim().toLowerCase()}`;
        const key = `${soldByKey}::${paymentMethod}::${baseKey}`;

        let productName = (it.name && String(it.name).trim()) || "Unknown";
        if (rawPid && productMap[rawPid] && productMap[rawPid].name) {
          productName = productMap[rawPid].name;
        }

        if (!prodAgg[key]) {
          prodAgg[key] = {
            productId: rawPid,
            name: productName,
            image:
              rawPid && productMap[rawPid]
                ? productMap[rawPid].imageUrl || ""
                : it.imageUrl || "",
            qty: 0,
            sellingPrice:
              rawPid && productMap[rawPid]
                ? Number(productMap[rawPid].sellingPrice || 0)
                : Number(it.sellingPrice || it.price || 0),
            subtotal: 0,
            vatAmount: 0,
            total: 0,
            paymentMethod,
            soldById,
            soldByName,
          };
        }

        const qty = Number(it.quantity || 0);
        const saleTaxRate = Number(s.taxRate || 0);
        const taxRate = Number.isFinite(saleTaxRate) ? saleTaxRate : 0;
        const lineSellingPrice =
          rawPid && productMap[rawPid]
            ? Number(productMap[rawPid].sellingPrice || 0)
            : Number(it.sellingPrice || it.price || 0);
        const lineSubtotal = qty * lineSellingPrice;
        const lineVat =
          Math.round((lineSubtotal * (taxRate / 100) + Number.EPSILON) * 100) /
          100;
        const lineTotal = lineSubtotal + lineVat;

        prodAgg[key].qty += qty;
        prodAgg[key].sellingPrice = lineSellingPrice;
        prodAgg[key].subtotal += lineSubtotal;
        prodAgg[key].vatAmount += lineVat;
        prodAgg[key].total += lineTotal;
      }
    }

    const items = Object.values(prodAgg).map((x) => ({
      productId: x.productId,
      name: x.name,
      image: x.image,
      qty: x.qty,
      sellingPrice: Number(x.sellingPrice || 0),
      subtotal: Number(x.subtotal || 0),
      vatAmount: Number(x.vatAmount || 0),
      total: Number(x.total || 0),
      paymentMethod: x.paymentMethod || "unknown",
      soldById: x.soldById || null,
      soldByName: x.soldByName || "unknown",
    }));

    const totalItemsSold = items.reduce((s, it) => s + (it.qty || 0), 0);
    const totalBeforeVat = items.reduce((s, it) => s + (it.subtotal || 0), 0);
    const totalVat = items.reduce((s, it) => s + (it.vatAmount || 0), 0);
    const grandTotal = items.reduce((s, it) => s + (it.total || 0), 0);

    res.json({
      date: day,
      items,
      totalItemsSold,
      totalBeforeVat,
      totalVat,
      grandTotal,
    });
  } catch (err) {
    console.error("today-sales error", err);
    res.status(500).json({ message: "Server error" });
  }
});
