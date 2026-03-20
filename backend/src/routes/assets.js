const express = require("express");
const router = express.Router();
const Asset = require("../models/asset.model");
const { authenticate } = require("../middleware/auth");
const multer = require("multer");
const { uploadBuffer } = require("../utils/cloudinary");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Helper to generate next Asset ID: AST0001
async function generateAssetId(martId) {
  const lastAsset = await Asset.findOne({ martId, assetId: /^AST\d+$/ })
    .sort({ createdAt: -1 })
    .select("assetId")
    .lean();

  let nextNum = 1;
  if (lastAsset && lastAsset.assetId) {
    const match = lastAsset.assetId.match(/\d+/);
    if (match) {
      nextNum = parseInt(match[0], 10) + 1;
    }
  }
  return `AST${String(nextNum).padStart(4, "0")}`;
}

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
router.post("/", authenticate, upload.single("image"), async (req, res) => {
  try {
    const { name, sizeOrType, purchaseDate, status, conditions, assignedTo, quantity, description, martId, purchasePrice } = req.body;
    const targetMartId =
      req.user.role === "systemAdmin"
        ? martId || req.user.martId
        : req.user.martId;
    
    if (!targetMartId)
      return res.status(400).json({ message: "martId is required" });
    if (!name || quantity == null)
      return res.status(400).json({ message: "Missing required fields" });

    // Handle image upload to Cloudinary if file provided
    let finalImageUrl = req.body.image || "";
    if (req.file && req.file.buffer) {
      try {
        const uploaded = await uploadBuffer(
          req.file.buffer,
          req.file.originalname,
          `${req.protocol}://${req.get("host")}`,
        );
        finalImageUrl = uploaded.secure_url || uploaded.url || finalImageUrl;
      } catch (uploadErr) {
        console.error("Asset image upload error:", uploadErr);
        return res.status(500).json({ message: "Image upload failed" });
      }
    }

    // Auto-generate assetId on backend
    const assetId = await generateAssetId(targetMartId);

    const asset = new Asset({
      martId: targetMartId,
      name,
      assetId,
      image: finalImageUrl,
      sizeOrType,
      purchaseDate,
      status,
      conditions,
      assignedTo,
      quantity: Number(quantity),
      purchasePrice: Number(purchasePrice || 0),
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

// Update asset
router.put("/:id", authenticate, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, assetId, sizeOrType, purchaseDate, status, conditions, assignedTo, quantity, description, purchasePrice } = req.body;
    const asset = await Asset.findById(id);
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    
    if (req.user.role !== "systemAdmin") {
      if (!req.user.martId || String(asset.martId) !== String(req.user.martId))
        return res
          .status(403)
          .json({ message: "Insufficient permissions to update asset" });
    }

    // Handle image update
    if (req.file && req.file.buffer) {
      try {
        const uploaded = await uploadBuffer(
          req.file.buffer,
          req.file.originalname,
          `${req.protocol}://${req.get("host")}`,
        );
        asset.image = uploaded.secure_url || uploaded.url || asset.image;
      } catch (uploadErr) {
        console.error("Asset image update error:", uploadErr);
        return res.status(500).json({ message: "Image upload failed" });
      }
    } else if (req.body.image !== undefined) {
      asset.image = req.body.image;
    }

    // allow partial updates
    if (name != null) asset.name = name;
    if (assetId != null) asset.assetId = assetId;
    if (sizeOrType != null) asset.sizeOrType = sizeOrType;
    if (purchaseDate != null) asset.purchaseDate = purchaseDate;
    if (status != null) asset.status = status;
    if (conditions != null) asset.conditions = conditions;
    if (assignedTo != null) asset.assignedTo = assignedTo;
    if (quantity != null) asset.quantity = Number(quantity);
    if (purchasePrice != null) asset.purchasePrice = Number(purchasePrice);
    if (description != null) asset.description = description;
    
    await asset.save();
    res.json(asset);
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
