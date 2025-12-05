const express = require("express");
const router = express.Router();
const Asset = require("../models/asset.model");
const { authenticate } = require("../middleware/auth");

// List assets. Query ?martId=... allowed for systemAdmin, otherwise scoped to req.user.martId
router.get("/", authenticate, async (req, res) => {
  try {
    const { martId } = req.query;
    const filter = {};
    if (req.user.role === "systemAdmin") {
      if (martId) filter.martId = martId;
    } else {
      filter.martId = req.user.martId;
      if (martId && String(martId) !== String(req.user.martId))
        return res
          .status(403)
          .json({ message: "Cannot list assets for another mart" });
    }
    const list = await Asset.find(filter).sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create asset
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, quantity, description, martId } = req.body;
    const targetMartId =
      req.user.role === "systemAdmin"
        ? martId || req.user.martId
        : req.user.martId;
    if (!targetMartId)
      return res.status(400).json({ message: "martId is required" });
    if (!name || quantity == null)
      return res.status(400).json({ message: "Missing required fields" });

    const asset = new Asset({
      martId: targetMartId,
      name,
      quantity: Number(quantity),
      description,
      createdBy: req.user.id,
    });
    await asset.save();
    res.status(201).json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete asset
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findById(id);
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    if (req.user.role !== "systemAdmin") {
      if (!req.user.martId || String(asset.martId) !== String(req.user.martId))
        return res
          .status(403)
          .json({ message: "Insufficient permissions to delete asset" });
    }
    await Asset.findByIdAndDelete(id);
    res.json({ message: "Asset deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
