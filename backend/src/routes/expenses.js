const express = require("express");
const router = express.Router();
const Expense = require("../models/expense.model");
const { authenticate } = require("../middleware/auth");

// List expenses. Query: ?martId=... optional. Non-systemAdmin users limited to their mart.
router.get("/", authenticate, async (req, res) => {
  try {
    const { martId } = req.query;
    const filter = {};

    if (req.user.role === "systemAdmin") {
      if (martId) filter.martId = martId;
    } else {
      // owners/managers/cashiers can only query their own mart
      filter.martId = req.user.martId;
      if (martId && String(martId) !== String(req.user.martId)) {
        return res
          .status(403)
          .json({ message: "Cannot list expenses for another mart" });
      }
    }

    const list = await Expense.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create expense
router.post("/", authenticate, async (req, res) => {
  try {
    const { category, description, amount, date, martId } = req.body;
    // determine martId: systemAdmin may provide, others use their mart
    const targetMartId =
      req.user.role === "systemAdmin"
        ? martId || req.user.martId
        : req.user.martId;
    if (!targetMartId)
      return res.status(400).json({ message: "martId is required" });
    if (!description || amount == null || !date)
      return res.status(400).json({ message: "Missing required fields" });

    const expense = new Expense({
      martId: targetMartId,
      category,
      description,
      amount: Number(amount),
      date: new Date(date),
      createdBy: req.user.id,
    });
    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete expense
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findById(id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    // authorization: systemAdmin can delete any; others only within their mart
    if (req.user.role !== "systemAdmin") {
      if (
        !req.user.martId ||
        String(expense.martId) !== String(req.user.martId)
      ) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions to delete expense" });
      }
    }

    await Expense.findByIdAndDelete(id);
    res.json({ message: "Expense deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
