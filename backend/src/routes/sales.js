const express = require("express");
const router = express.Router();
const Sale = require("../models/sale.model");
const Mart = require("../models/mart.model");
const { authenticate } = require("../middleware/auth");

// Create a sale (record transaction)
router.post("/", authenticate, async (req, res) => {
  try {
    const payload = req.body || {};
    const {
      martId,
      receiptId,
      items,
      subtotal,
      discount,
      extraCharges,
      tax,
      total,
      paymentMethod,
    } = payload;
    const targetMartId =
      req.user.role === "systemAdmin"
        ? martId || req.user.martId
        : req.user.martId;
    if (!targetMartId)
      return res.status(400).json({ message: "martId required" });
    // fetch mart to get taxRate
    const mart = await Mart.findById(targetMartId).lean();
    const taxRate = (mart && Number(mart.taxRate)) || 15;

    // compute subtotal from items if not provided
    let computedSubtotal = Number(subtotal || 0);
    if ((!computedSubtotal || computedSubtotal === 0) && Array.isArray(items)) {
      computedSubtotal = items.reduce(
        (s, it) => s + (Number(it.total) || 0),
        0
      );
    }

    // compute extra charges sum
    const extraSum = Array.isArray(extraCharges)
      ? extraCharges.reduce((s, e) => s + (Number(e.amount) || 0), 0)
      : 0;

    // discount amount (if discount object uses .amount)
    const discountAmt = (discount && Number(discount.amount)) || 0;

    // taxable base: subtotal - discount + extra charges
    const taxableBase = computedSubtotal - discountAmt + extraSum;
    const taxAmount =
      Math.round((taxableBase * taxRate + Number.EPSILON) * 100) / 100;

    const computedTotal =
      Math.round((taxableBase + taxAmount + Number.EPSILON) * 100) / 100;

    const sale = new Sale({
      martId: targetMartId,
      cashierId: req.user.id,
      cashierName: req.user.username,
      receiptId,
      items,
      subtotal: computedSubtotal,
      discount,
      extraCharges,
      tax: taxAmount,
      taxRate,
      total: computedTotal,
      paymentMethod,
      date: new Date(),
    });

    await sale.save();
    res.status(201).json(sale);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// List sales for a mart and optional date (date in YYYY-MM-DD)
router.get("/", authenticate, async (req, res) => {
  try {
    const { martId, date } = req.query;
    const filter = {};
    if (req.user.role === "systemAdmin") {
      if (martId) filter.martId = martId;
    } else {
      filter.martId = req.user.martId;
      if (martId && String(martId) !== String(req.user.martId))
        return res
          .status(403)
          .json({ message: "Cannot list sales for another mart" });
    }

    if (date) {
      const start = new Date(date + "T00:00:00.000Z");
      const end = new Date(date + "T23:59:59.999Z");
      filter.date = { $gte: start, $lte: end };
    }

    const list = await Sale.find(filter).sort({ date: -1 }).lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
