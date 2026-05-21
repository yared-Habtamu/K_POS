const express = require("express");
const router = express.Router();
const prisma = require("../repositories/prismaClient");
const { authenticate } = require("../middleware/auth");

// List payment types. Optional martId for systemAdmin; others limited to their mart
router.get("/", authenticate, async (req, res) => {
  try {
    const { martId } = req.query;
    const filter = { isDeleted: false };
    if (req.user.role === "systemAdmin") {
      if (martId) filter.martId = martId;
    } else {
      filter.martId = req.user.martId;
      if (martId && String(martId) !== String(req.user.martId)) {
        return res
          .status(403)
          .json({ message: "Cannot list payment types for another mart" });
      }
    }

    const list = await prisma.paymentType.findMany({
      where: filter,
      orderBy: { name: "asc" }
    });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create/upsert payment type
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, icon, martId } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const targetMartId =
      req.user.role === "systemAdmin"
        ? martId || req.user.martId
        : req.user.martId;
    if (!targetMartId)
      return res.status(400).json({ message: "martId is required" });

    const normalizedName = String(name).trim().toLowerCase();
    const normalizedIcon = String(icon || "Wallet").trim() || "Wallet";

    let pt = await prisma.paymentType.findFirst({
      where: { name: normalizedName, martId: targetMartId }
    });

    if (pt) {
        pt = await prisma.paymentType.update({
            where: { id: pt.id },
            data: { icon: normalizedIcon, isDeleted: false }
        });
    } else {
        pt = await prisma.paymentType.create({
            data: { name: normalizedName, icon: normalizedIcon, martId: targetMartId, isDeleted: false }
        });
    }

    res.status(201).json(pt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const paymentType = await prisma.paymentType.findUnique({ where: { id: req.params.id } });
    if (!paymentType || paymentType.isDeleted) {
      return res.status(404).json({ message: "Payment type not found" });
    }

    if (
      req.user.role !== "systemAdmin" &&
      String(paymentType.martId || "") !== String(req.user.martId || "")
    ) {
      return res
        .status(403)
        .json({ message: "Cannot delete payment type for another mart" });
    }

    await prisma.paymentType.update({
        where: { id: paymentType.id },
        data: { isDeleted: true }
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
