const express = require("express");
const router = express.Router();
const Sale = require("../models/sale.model");
const Mart = require("../models/mart.model");
const Product = require("../models/product.model");
const Customer = require("../models/customer.model");
const mongoose = require("mongoose");
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
        0,
      );
    }

    // compute extra charges sum
    const extraSum = Array.isArray(extraCharges)
      ? extraCharges.reduce((s, e) => s + (Number(e.amount) || 0), 0)
      : 0;

    // discount amount (if discount object uses .amount)
    const discountAmt = (discount && Number(discount.amount)) || 0;

    // enforce permission: applying a discount requires 'discount' permission
    if (discountAmt > 0) {
      const userPerms = Array.isArray(req.user.permissions)
        ? req.user.permissions
        : [];
      if (
        !(
          req.user.role === "systemAdmin" ||
          req.user.role === "owner" ||
          userPerms.includes("discount")
        )
      ) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions to apply discount" });
      }
    }

    // taxable base: subtotal - discount + extra charges
    const taxableBase = computedSubtotal - discountAmt + extraSum;
    const taxAmount =
      Math.round((taxableBase * (taxRate / 100) + Number.EPSILON) * 100) / 100;

    const computedTotal =
      Math.round((taxableBase + taxAmount + Number.EPSILON) * 100) / 100;

    // Validate stock: aggregate quantities per productId
    if (Array.isArray(items) && items.length > 0) {
      const qtyMap = {};
      items.forEach((it) => {
        if (it && it.productId) {
          const q = Number(it.quantity) || 0;
          qtyMap[it.productId] = (qtyMap[it.productId] || 0) + q;
        }
      });

      const productIds = Object.keys(qtyMap);
      if (productIds.length > 0) {
        const products = await Product.find({
          _id: { $in: productIds },
          martId: targetMartId,
        }).lean();

        // check for missing products
        if (products.length !== productIds.length) {
          const foundIds = products.map((p) => String(p._id));
          const missing = productIds.filter(
            (id) => !foundIds.includes(String(id)),
          );
          return res
            .status(400)
            .json({ message: "Some products not found in this mart", missing });
        }

        const insufficient = products
          .filter((p) => (qtyMap[String(p._id)] || 0) > (p.quantity || 0))
          .map((p) => ({
            productId: p._id,
            name: p.name,
            available: p.quantity,
            requested: qtyMap[String(p._id)],
          }));

        if (insufficient.length) {
          return res
            .status(400)
            .json({
              message: "Insufficient stock for some products",
              insufficient,
            });
        }

        // perform atomic decrement using transaction if available
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
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

          const savedSale = await sale.save({ session });

          // If this was a credit sale, update the customer's totals within the same transaction
          if (String(paymentMethod) === "wallet" && payload.customerId) {
            const cust = await Customer.findById(payload.customerId).session(
              session,
            );
            if (!cust) throw new Error("Customer not found for credit sale");
            if (String(cust.martId) !== String(targetMartId)) {
              throw new Error("Customer does not belong to this mart");
            }
            cust.totalCredit =
              Number(cust.totalCredit || 0) + Number(computedTotal || 0);
            // keep totalPaid as-is; recompute unpaid
            cust.totalUnpaid =
              Number(cust.totalCredit || 0) - Number(cust.totalPaid || 0);
            await cust.save({ session });
          }

          for (const pid of productIds) {
            const qty = qtyMap[pid];
            const upd = await Product.updateOne(
              { _id: pid, martId: targetMartId, quantity: { $gte: qty } },
              { $inc: { quantity: -qty } },
              { session },
            );
            const matched = upd.matchedCount || upd.nMatched || 0;
            const modified = upd.modifiedCount || upd.nModified || 0;
            if (!matched || !modified) {
              throw new Error(
                `Insufficient stock for product ${pid} during update`,
              );
            }
          }

          await session.commitTransaction();
          session.endSession();
          res.status(201).json(savedSale);
          return;
        } catch (err) {
          await session.abortTransaction();
          session.endSession();
          console.error(err);
          return res
            .status(400)
            .json({ message: err.message || "Stock update failed" });
        }
      }
    }

    // Fallback: no stock-managed items, just save sale
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
    // If credit sale, update customer totals (non-transactional path)
    if (String(paymentMethod) === "wallet" && payload.customerId) {
      try {
        const cust = await Customer.findById(payload.customerId);
        if (!cust)
          return res
            .status(400)
            .json({ message: "Customer not found for credit sale" });
        if (String(cust.martId) !== String(targetMartId)) {
          return res
            .status(403)
            .json({ message: "Customer does not belong to this mart" });
        }
        cust.totalCredit =
          Number(cust.totalCredit || 0) + Number(computedTotal || 0);
        cust.totalUnpaid =
          Number(cust.totalCredit || 0) - Number(cust.totalPaid || 0);
        await cust.save();
      } catch (err) {
        console.error("Failed to update customer credit", err);
        // continue — the sale was recorded; inform client if desired
      }
    }
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
