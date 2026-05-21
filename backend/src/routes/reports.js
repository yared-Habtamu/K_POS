const express = require("express");
const router = express.Router();
const prisma = require("../repositories/prismaClient");
const saleRepository = require("../repositories/saleRepository");
const expenseRepository = require("../repositories/expenseRepository");
const productRepository = require("../repositories/productRepository");
const martRepository = require("../repositories/martRepository");
const userRepository = require("../repositories/userRepository");
const { authenticate } = require("../middleware/auth");

// GET /api/reports/daily?martId=...&date=YYYY-MM-DD
// For systemAdmin: if no martId provided, aggregates across all marts
router.get("/daily", authenticate, async (req, res) => {
  try {
    const { martId, date } = req.query;
    const day = date || new Date().toISOString().slice(0, 10);
    const start = new Date(day + "T00:00:00.000Z");
    const end = new Date(day + "T23:59:59.999Z");

    const filter = { date: { gte: start, lte: end } };
    if (req.user.role !== "systemAdmin") {
      filter.martId = req.user.martId;
    } else if (martId) {
      filter.martId = martId;
    }

    if (req.user.role === "cashier") {
      filter.cashierId = req.user.id;
    }

    const sales = await saleRepository.findMany(filter);

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

    const filter = { ...filterBase, date: { gte: startDate, lte: endDate } };
    const sales = await saleRepository.findMany(filter);

    const effectiveMartId = filterBase.martId
      ? String(filterBase.martId)
      : null;

    const totalTax = sales.reduce((s, x) => s + (x.tax || 0), 0);

    // Build product map for tax by category
    const productIds = Array.from(
      new Set(
        sales.flatMap((s) =>
          (s.items || []).map((it) => it.productId).filter(Boolean),
        ),
      ),
    );
    const productQuery = { id: { in: productIds } };
    if (effectiveMartId) productQuery.martId = effectiveMartId;
    const products = productIds.length
      ? await productRepository.findMany(productQuery)
      : [];
    const productMap = {};
    for (const p of products) productMap[String(p.id || p._id)] = p;

    const taxByCategoryMap = {};
    const categorySalesMap = {};
    const paymentMethodsMap = {};
    for (const s of sales) {
      const saleTax = Number(s.tax || 0);
      const paymentMethod = String(s.paymentMethod || "unknown");
      paymentMethodsMap[paymentMethod] =
        (paymentMethodsMap[paymentMethod] || 0) + Number(s.total || 0);

      const items = s.items || [];
      const itemTotals = items.map((it) => {
        if (it.total != null) return Number(it.total || 0);
        if (it.price != null)
          return Number(it.quantity || 0) * Number(it.price || 0);
        return 0;
      });
      const computedSubtotal = itemTotals.reduce((acc, v) => acc + v, 0);
      const saleSubtotal = Number(s.subtotal || computedSubtotal || 0);

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

        if (saleTax && saleSubtotal) {
          const itemTax = (itemTotal / saleSubtotal) * saleTax;
          taxByCategoryMap[category] =
            (taxByCategoryMap[category] || 0) + itemTax;
        }
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
    const sales = await saleRepository.findMany({
      martId: targetMartId,
      date: { gte: startDate, lte: endDate },
    });
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
      ? await productRepository.findMany({
          id: { in: productIds },
          martId: targetMartId,
        })
      : [];
    const productMap = {};
    for (const p of products) productMap[String(p.id || p._id)] = p;

    const taxByCategoryMap = {};
    const categorySalesMap = {};
    const paymentMethodsMap = {};
    for (const s of sales) {
      const saleTax = Number(s.tax || 0);
      const paymentMethod = String(s.paymentMethod || "unknown");
      paymentMethodsMap[paymentMethod] =
        (paymentMethodsMap[paymentMethod] || 0) + Number(s.total || 0);

      const items = s.items || [];
      const itemTotals = items.map((it) => {
        if (it.total != null) return Number(it.total || 0);
        if (it.price != null)
          return Number(it.quantity || 0) * Number(it.price || 0);
        return 0;
      });
      const computedSubtotal = itemTotals.reduce((acc, v) => acc + v, 0);
      const saleSubtotal = Number(s.subtotal || computedSubtotal || 0);

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

        if (saleTax && saleSubtotal) {
          const itemTax = (itemTotal / saleSubtotal) * saleTax;
          taxByCategoryMap[category] =
            (taxByCategoryMap[category] || 0) + itemTax;
        }
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

    // Fetch expenses and operational health signals
    const expiryCutoff = new Date(now);
    expiryCutoff.setHours(23, 59, 59, 999);

    const [expenses, expiredProducts, brokenAssets] = await Promise.all([
      expenseRepository.findMany({
        martId: targetMartId,
        date: { gte: startDate, lte: endDate },
      }),
      productRepository.findMany(
        {
          martId: targetMartId,
          isDeleted: false,
          expiryDate: { not: null, lte: expiryCutoff },
        },
        {
          select: {
            id: true,
            name: true,
            expiryDate: true,
            quantity: true,
            storeQuantity: true,
            supermarketQuantity: true,
          },
          orderBy: { expiryDate: "asc" },
        },
      ),
      prisma.asset.findMany({
        where: {
          martId: targetMartId,
          isDeleted: false,
          OR: [
            { asset_status: "broken" },
            { conditions: { contains: "damaged", mode: "insensitive" } },
            { conditions: { contains: "lost", mode: "insensitive" } },
            { conditions: { contains: "broken", mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          assetId: true,
          asset_status: true,
          conditions: true,
          quantity: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
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
    const topProducts = Object.values(prodAgg).sort((a, b) => b.sold - a.sold);

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
      expiredProductsCount: expiredProducts.length,
      expiredProducts: expiredProducts.map((p) => ({
        id: p.id,
        name: p.name,
        expiryDate: p.expiryDate,
        quantity:
          Number(p.quantity || 0) +
          Number(p.storeQuantity || 0) +
          Number(p.supermarketQuantity || 0),
      })),
      brokenAssetsCount: brokenAssets.length,
      brokenAssets: brokenAssets.map((a) => ({
        id: a.id,
        name: a.name,
        assetId: a.assetId,
        asset_status: a.asset_status || "broken",
        conditions: a.conditions || "",
        quantity: Number(a.quantity || 0),
      })),
      series,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/admin-analytics", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "systemAdmin")
      return res.status(403).json({ message: "Forbidden" });

    // Fetch approved marts and all platform products once, then aggregate in JS.
    const [
      allUsersCount,
      approvedMarts,
      products,
      monthlySalesData,
      monthlyExpensesData,
      usersByMartData,
    ] = await Promise.all([
      prisma.user.count({ where: { isDeleted: false } }),
      prisma.mart.findMany({ where: { status: "approved", isDeleted: false } }),
      prisma.product.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          martId: true,
          name: true,
          category: true,
          purchasePrice: true,
          sellingPrice: true,
          quantity: true,
          storeQuantity: true,
          supermarketQuantity: true,
          lowStockThreshold: true,
        },
      }),
      prisma.sale.findMany({
        where: {
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lte: new Date(
              new Date().getFullYear(),
              new Date().getMonth() + 1,
              0,
              23,
              59,
              59,
              999,
            ),
          },
        },
        select: { martId: true, total: true },
      }),
      prisma.expense.findMany({
        where: {
          isDeleted: false,
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lte: new Date(
              new Date().getFullYear(),
              new Date().getMonth() + 1,
              0,
              23,
              59,
              59,
              999,
            ),
          },
        },
        select: { martId: true, amount: true },
      }),
      prisma.user.groupBy({
        by: ["martId"],
        where: { isDeleted: false, martId: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const martMap = {};
    for (const m of approvedMarts) martMap[m.id] = m.martName;

    const martIds = new Set(approvedMarts.map((m) => m.id));
    const martProducts = products.filter((p) => martIds.has(p.martId));

    const calculateStock = (product) =>
      Number(product.quantity || 0) +
      Number(product.storeQuantity || 0) +
      Number(product.supermarketQuantity || 0);

    const calculateMarginPercent = (product) => {
      const purchase = Number(product.purchasePrice || 0);
      if (purchase <= 0) return 0;
      return ((Number(product.sellingPrice || 0) - purchase) / purchase) * 100;
    };

    const platformStats = martProducts.reduce(
      (acc, product) => {
        const stock = calculateStock(product);
        const purchasePrice = Number(product.purchasePrice || 0);
        const sellingPrice = Number(product.sellingPrice || 0);

        acc.totalProducts += 1;
        acc.totalInventoryValue += stock * purchasePrice;
        acc.totalSellingValue += stock * sellingPrice;
        if (stock <= 0) acc.outOfStockCount += 1;
        else if (stock <= Number(product.lowStockThreshold || 0))
          acc.lowStockCount += 1;
        return acc;
      },
      {
        totalProducts: 0,
        totalInventoryValue: 0,
        totalSellingValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      },
    );

    const byMartMap = new Map();
    const categoryMap = new Map();
    const productRows = [];

    for (const product of martProducts) {
      const martId = String(product.martId);
      const stock = calculateStock(product);
      const purchasePrice = Number(product.purchasePrice || 0);
      const sellingPrice = Number(product.sellingPrice || 0);
      const margin = calculateMarginPercent(product);
      const inventoryValue = stock * purchasePrice;
      const sellingValue = stock * sellingPrice;

      const existingMart = byMartMap.get(martId) || {
        _id: martId,
        count: 0,
        inventoryValue: 0,
        sellingValue: 0,
        marginSum: 0,
      };
      existingMart.count += 1;
      existingMart.inventoryValue += inventoryValue;
      existingMart.sellingValue += sellingValue;
      existingMart.marginSum += margin;
      byMartMap.set(martId, existingMart);

      const categoryKey = product.category || "Uncategorized";
      categoryMap.set(categoryKey, (categoryMap.get(categoryKey) || 0) + 1);

      productRows.push({
        _id: product.id,
        name: product.name,
        category: categoryKey,
        martName: martMap[martId] || "Unknown",
        martId,
        purchasePrice,
        sellingPrice,
        margin,
        quantity: stock,
        stockStatus:
          stock <= 0
            ? "out_of_stock"
            : stock <= Number(product.lowStockThreshold || 0)
              ? "low_stock"
              : "in_stock",
      });
    }

    const topMargin = martProducts
      .map((product) => ({
        _id: product.id,
        name: product.name,
        martId: product.martId,
        purchasePrice: Number(product.purchasePrice || 0),
        sellingPrice: Number(product.sellingPrice || 0),
        margin: Number(calculateMarginPercent(product).toFixed(1)),
      }))
      .filter((product) => product.margin > 0)
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10);

    const byMart = Array.from(byMartMap.values());

    const categories = Array.from(categoryMap.entries()).map(
      ([category, count]) => ({
        _id: category,
        count,
      }),
    );

    const topExpensive = martProducts
      .map((product) => ({
        _id: product.id,
        name: product.name,
        martId: product.martId,
        sellingPrice: Number(product.sellingPrice || 0),
      }))
      .sort((a, b) => b.sellingPrice - a.sellingPrice)
      .slice(0, 10);

    // Financial and users aggregation for the current month.
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const monthlySales = monthlySalesData.filter(
      (sale) => sale.martId && martIds.has(sale.martId),
    );
    const monthlyExpenses = monthlyExpensesData.filter(
      (expense) => expense.martId && martIds.has(expense.martId),
    );
    const monthlyTransactionsByMart = monthlySalesData.reduce((acc, sale) => {
      if (!sale.martId || !martIds.has(sale.martId)) return acc;
      const key = String(sale.martId);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const salesMap = {};
    let platformMonthlySales = 0;
    let platformTransactions = 0;
    monthlySales.forEach((sale) => {
      const mid = String(sale.martId);
      salesMap[mid] = (salesMap[mid] || 0) + Number(sale.total || 0);
      platformMonthlySales += Number(sale.total || 0);
    });
    platformTransactions = monthlySales.length;

    const expensesMap = {};
    let platformMonthlyExpenses = 0;
    monthlyExpenses.forEach((expense) => {
      const mid = String(expense.martId);
      expensesMap[mid] = (expensesMap[mid] || 0) + Number(expense.amount || 0);
      platformMonthlyExpenses += Number(expense.amount || 0);
    });

    const usersMap = {};
    usersByMartData.forEach((u) => {
      if (u.martId) usersMap[String(u.martId)] = u._count._all;
    });

    const martAnalytics = approvedMarts
      .map((m) => {
        const mid = String(m.id);
        const pd = byMart.find((b) => String(b._id) === mid) || {
          count: 0,
          inventoryValue: 0,
          sellingValue: 0,
          marginSum: 0,
        };

        return {
          martId: mid,
          martName: m.martName || "Unnamed",
          productCount: pd.count,
          inventoryValue: Math.round(pd.inventoryValue * 100) / 100,
          sellingValue: Math.round(pd.sellingValue * 100) / 100,
          avgMargin:
            Math.round(((pd.marginSum || 0) / (pd.count || 1)) * 100) / 100,
          monthlySales: Math.round((salesMap[mid] || 0) * 100) / 100,
          monthlyExpenses: Math.round((expensesMap[mid] || 0) * 100) / 100,
          profit:
            Math.round(((salesMap[mid] || 0) - (expensesMap[mid] || 0)) * 100) /
            100,
          userCount: usersMap[mid] || 0,
        };
      })
      .sort((a, b) => b.monthlySales - a.monthlySales);

    const enrichWithMartName = (list) =>
      list.map((item) => ({
        ...item,
        martName: martMap[String(item.martId)] || "Unknown",
      }));

    res.json({
      platform: {
        totalProducts: platformStats.totalProducts,
        totalInventoryValue:
          Math.round(platformStats.totalInventoryValue * 100) / 100,
        totalSellingValue:
          Math.round(platformStats.totalSellingValue * 100) / 100,
        overallAvgMargin:
          Math.round(
            (byMart.reduce((acc, m) => acc + (m.marginSum || 0), 0) /
              (byMart.reduce((acc, m) => acc + (m.count || 0), 0) || 1)) *
              100,
          ) / 100,
        lowStockCount: platformStats.lowStockCount,
        outOfStockCount: platformStats.outOfStockCount,
        totalMonthlySales: Math.round(platformMonthlySales * 100) / 100,
        totalMonthlyExpenses: Math.round(platformMonthlyExpenses * 100) / 100,
        totalMonthlyProfit:
          Math.round((platformMonthlySales - platformMonthlyExpenses) * 100) /
          100,
        totalTransactions: platformTransactions,
        totalMarts: approvedMarts.length,
        totalUsers: allUsersCount,
      },
      martAnalytics,
      topMarginProducts: enrichWithMartName(topMargin),
      topExpensiveProducts: enrichWithMartName(topExpensive),
      categoryDistribution: categories.map((c) => ({
        category: c._id,
        count: c.count,
      })),
      products: productRows.sort((a, b) => b.margin - a.margin),
    });
  } catch (err) {
    console.error("admin-analytics error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/reports/today-sales?martId=...
// Returns aggregated items sold today with quantity, VAT and totals.
router.get("/today-sales", authenticate, async (req, res) => {
  try {
    const { martId, date } = req.query;
    const day = (date && String(date)) || new Date().toISOString().slice(0, 10);
    const start = new Date(day + "T00:00:00.000Z");
    const end = new Date(day + "T23:59:59.999Z");

    const filter = { date: { gte: start, lte: end } };

    const userMartId = req.user.martId ? String(req.user.martId) : "";
    const queryMartId = martId ? String(martId) : "";

    // Cashiers only see their own sales
    if (req.user.role === "cashier") {
      filter.cashierId = req.user.id;
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

    const sales = await saleRepository.findMany(filter);

    // Determine the effective mart for product lookups
    const effectiveMartId = filter.martId ? String(filter.martId) : null;

    // aggregate by productId when available, else by name
    const prodAgg = {};
    const productIds = Array.from(
      new Set(
        sales.flatMap((s) =>
          (s.items || []).map((it) => it.productId).filter(Boolean),
        ),
      ),
    );

    const productQuery = { id: { in: productIds } };
    if (effectiveMartId) productQuery.martId = effectiveMartId;
    const products = productIds.length
      ? await productRepository.findMany(productQuery)
      : [];
    const productMap = {};
    for (const p of products) productMap[String(p.id || p._id)] = p;

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

module.exports = router;
