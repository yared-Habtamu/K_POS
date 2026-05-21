const express = require("express");
const router = express.Router();
const prisma = require("../repositories/prismaClient");
const productRepository = require("../repositories/productRepository");
const { authenticate } = require("../middleware/auth");

// List categories, optional martId; non-systemAdmin limited to their mart
router.get("/", authenticate, async (req, res) => {
  try {
    const { martId } = req.query;
    const filter = {};
    if (req.user.role === "systemAdmin") {
      if (martId) filter.martId = martId;
    } else {
      filter.martId = req.user.martId;
      if (martId && String(martId) !== String(req.user.martId)) {
        return res
          .status(403)
          .json({ message: "Cannot list categories for another mart" });
      }
    }

    const targetMartId = filter.martId;
    const savedCategories = await prisma.category.findMany({
      where: { ...filter, isDeleted: false },
      orderBy: { name: "asc" },
    });

    let productCategories = [];
    if (targetMartId) {
      const distinctProducts = await prisma.product.findMany({
        where: { martId: targetMartId, category: { not: "" } },
        select: { category: true },
        distinct: ["category"],
      });
      productCategories = distinctProducts.map((p) => p.category);
    }

    const merged = new Map();

    for (const cat of savedCategories) {
      merged.set(String(cat.name).trim().toLowerCase(), cat);
    }

    for (const rawName of productCategories) {
      const name = String(rawName || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!merged.has(key)) {
        merged.set(key, {
          _id: `derived-${key}`,
          id: `derived-${key}`,
          name,
          martId: targetMartId,
        });
      }
    }

    res.json(
      Array.from(merged.values()).sort((a, b) =>
        String(a.name).localeCompare(String(b.name)),
      ),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create category (idempotent/upsert)
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, martId } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const targetMartId =
      req.user.role === "systemAdmin"
        ? martId || req.user.martId
        : req.user.martId;
    if (!targetMartId)
      return res.status(400).json({ message: "martId is required" });

    const trimmedName = name.trim();
    let cat = await prisma.category.findFirst({
      where: { name: trimmedName, martId: targetMartId },
    });
    if (!cat) {
      cat = await prisma.category.create({
        data: { name: trimmedName, martId: targetMartId },
      });
    }

    res.status(201).json(cat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
