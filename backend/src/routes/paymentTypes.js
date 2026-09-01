const express = require("express");
const router = express.Router();
const prisma = require("../repositories/prismaClient");
const { authenticate } = require("../middleware/auth");

const DEFAULT_PAYMENT_TYPES = [
  { name: "cash", icon: "Banknote", active: true },
  { name: "card", icon: "CreditCard", active: true },
  { name: "transfer", icon: "Landmark", active: true },
  { name: "credit", icon: "Wallet", active: true },
];

async function seedDefaultPaymentTypes(martId) {
  if (!martId) return;
  const activeCount = await prisma.paymentType.count({
    where: { martId, isDeleted: false, active: true },
  });

  if (activeCount === 0) {
    for (const item of DEFAULT_PAYMENT_TYPES) {
      const existing = await prisma.paymentType.findFirst({
        where: { name: item.name, martId },
      });
      if (existing) {
        await prisma.paymentType.update({
          where: { id: existing.id },
          data: { isDeleted: false, active: true, icon: item.icon },
        });
      } else {
        await prisma.paymentType.create({
          data: {
            name: item.name,
            icon: item.icon,
            active: item.active,
            martId,
            isDeleted: false,
          },
        });
      }
    }
  }
}

// List payment types. Optional martId for systemAdmin; others limited to their mart
router.get("/", authenticate, async (req, res) => {
  try {
    const { martId, activeOnly } = req.query;
    const filter = { isDeleted: false };

    let targetMartId = null;
    if (req.user.role === "systemAdmin") {
      if (martId) {
        filter.martId = martId;
        targetMartId = martId;
      }
    } else {
      filter.martId = req.user.martId;
      targetMartId = req.user.martId;
      if (martId && String(martId) !== String(req.user.martId)) {
        return res
          .status(403)
          .json({ message: "Cannot list payment types for another mart" });
      }
    }

    if (activeOnly === "true") {
      filter.active = true;
    }

    // Auto-seed defaults if mart has no active payment types yet
    if (targetMartId) {
      await seedDefaultPaymentTypes(targetMartId);
    }

    let list = await prisma.paymentType.findMany({
      where: filter,
      orderBy: { createdAt: "asc" },
    });

    if (list.length === 0 && targetMartId) {
      await seedDefaultPaymentTypes(targetMartId);
      list = await prisma.paymentType.findMany({
        where: filter,
        orderBy: { createdAt: "asc" },
      });
    }

    res.json(list);
  } catch (err) {
    console.error("[paymentTypes] GET / error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create/upsert payment type
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, icon, active, martId } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Payment method name is required" });
    }

    const targetMartId =
      req.user.role === "systemAdmin"
        ? martId || req.user.martId
        : req.user.martId;
    if (!targetMartId) {
      return res.status(400).json({ message: "martId is required" });
    }

    const normalizedName = String(name).trim().toLowerCase();
    const normalizedIcon = String(icon || "Wallet").trim() || "Wallet";
    const isActive = active !== undefined ? Boolean(active) : true;

    let pt = await prisma.paymentType.findFirst({
      where: { name: normalizedName, martId: targetMartId },
    });

    if (pt) {
      pt = await prisma.paymentType.update({
        where: { id: pt.id },
        data: {
          icon: normalizedIcon,
          active: isActive,
          isDeleted: false,
        },
      });
    } else {
      pt = await prisma.paymentType.create({
        data: {
          name: normalizedName,
          icon: normalizedIcon,
          active: isActive,
          martId: targetMartId,
          isDeleted: false,
        },
      });
    }

    res.status(201).json(pt);
  } catch (err) {
    console.error("[paymentTypes] POST / error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update payment type (Edit name, icon, enable/disable)
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, active } = req.body;

    const paymentType = await prisma.paymentType.findUnique({
      where: { id },
    });

    if (!paymentType || paymentType.isDeleted) {
      return res.status(404).json({ message: "Payment type not found" });
    }

    if (
      req.user.role !== "systemAdmin" &&
      String(paymentType.martId || "") !== String(req.user.martId || "")
    ) {
      return res
        .status(403)
        .json({ message: "Cannot edit payment type for another mart" });
    }

    const updateData = {};
    if (name !== undefined && String(name).trim()) {
      updateData.name = String(name).trim().toLowerCase();
    }
    if (icon !== undefined) {
      updateData.icon = String(icon).trim() || "Wallet";
    }
    if (active !== undefined) {
      updateData.active = Boolean(active);
    }

    const updated = await prisma.paymentType.update({
      where: { id },
      data: updateData,
    });

    return res.json(updated);
  } catch (err) {
    console.error("[paymentTypes] PUT /:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete payment type
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const paymentType = await prisma.paymentType.findUnique({
      where: { id: req.params.id },
    });
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
      data: { isDeleted: true },
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[paymentTypes] DELETE /:id error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
