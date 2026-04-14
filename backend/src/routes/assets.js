const express = require("express");
const router = express.Router();
const Asset = require("../models/asset.model");
const AssetActionRequest = require("../models/assetActionRequest.model");
const User = require("../models/user.model");
const { authenticate } = require("../middleware/auth");
const multer = require("multer");
const { uploadBuffer } = require("../utils/cloudinary");
const { createNotification } = require("../services/notification.service");

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

function isOwner(user) {
  return String(user?.role || "").toLowerCase() === "owner";
}

function isManager(user) {
  return String(user?.role || "").toLowerCase() === "manager";
}

async function getMartManagers(martId) {
  if (!martId) return [];
  return User.find({ martId, role: { $regex: /^manager$/i } })
    .select("_id username name")
    .lean();
}

async function getMartOwners(martId) {
  if (!martId) return [];
  return User.find({ martId, role: { $regex: /^owner$/i } })
    .select("_id username name")
    .lean();
}

async function createAssetApprovalRequest({
  martId,
  user,
  action,
  assetId,
  payload,
  approvalRole,
}) {
  const approvers =
    approvalRole === "owner"
      ? await getMartOwners(martId)
      : await getMartManagers(martId);
  if (!approvers || approvers.length === 0) return null;

  const requesterRole = String(user?.role || "").toLowerCase();

  const reqDoc = new AssetActionRequest({
    martId,
    requesterId: user.id,
    requesterName: user.username || user.name,
    requesterRole: requesterRole === "manager" ? "manager" : "owner",
    approvalRole,
    assetId: assetId || null,
    action,
    payload,
  });

  await reqDoc.save();

  await Promise.all(
    approvers.map((approver) =>
      createNotification({
        martId,
        userId: approver._id,
        type: "asset_action_request",
        title: "Asset action requested",
        message: `${reqDoc.requesterName || "User"} requested asset ${action} approval`,
        metadata: {
          requestId: reqDoc._id,
          action,
          approvalRole,
          assetId: assetId || null,
          assetName: payload?.name || "",
        },
      }),
    ),
  );

  return reqDoc;
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
    const {
      name,
      sizeOrType,
      purchaseDate,
      status,
      conditions,
      assignedTo,
      quantity,
      description,
      martId,
      purchasePrice,
    } = req.body;
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

    const requesterIsOwnerOrManager = isOwner(req.user) || isManager(req.user);
    if (requesterIsOwnerOrManager) {
      const requestDoc = await createAssetApprovalRequest({
        martId: targetMartId,
        user: req.user,
        action: "create",
        approvalRole: isOwner(req.user) ? "manager" : "owner",
        payload: {
          name,
          image: finalImageUrl,
          sizeOrType,
          purchaseDate,
          status,
          conditions,
          assignedTo,
          quantity: Number(quantity),
          purchasePrice: Number(purchasePrice || 0),
          description,
        },
      });

      if (requestDoc) {
        return res.status(202).json({
          message: isOwner(req.user)
            ? "Asset registration submitted for manager approval"
            : "Asset registration submitted for owner approval",
          requestId: requestDoc._id,
        });
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
    const {
      name,
      assetId,
      sizeOrType,
      purchaseDate,
      status,
      conditions,
      assignedTo,
      quantity,
      description,
      purchasePrice,
    } = req.body;
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

    const changes = {};
    if (name != null) changes.name = name;
    if (assetId != null) changes.assetId = assetId;
    if (sizeOrType != null) changes.sizeOrType = sizeOrType;
    if (purchaseDate != null) changes.purchaseDate = purchaseDate;
    if (status != null) changes.status = status;
    if (conditions != null) changes.conditions = conditions;
    if (assignedTo != null) changes.assignedTo = assignedTo;
    if (quantity != null) changes.quantity = Number(quantity);
    if (purchasePrice != null) changes.purchasePrice = Number(purchasePrice);
    if (description != null) changes.description = description;
    if (asset.image != null) changes.image = asset.image;

    const requesterIsOwnerOrManager = isOwner(req.user) || isManager(req.user);
    if (requesterIsOwnerOrManager) {
      const requestDoc = await createAssetApprovalRequest({
        martId: asset.martId,
        user: req.user,
        action: "update",
        assetId: asset._id,
        approvalRole: isOwner(req.user) ? "manager" : "owner",
        payload: changes,
      });

      if (requestDoc) {
        return res.status(202).json({
          message: isOwner(req.user)
            ? "Asset update submitted for manager approval"
            : "Asset update submitted for owner approval",
          requestId: requestDoc._id,
        });
      }
    }

    // allow partial updates
    Object.entries(changes).forEach(([k, v]) => {
      asset[k] = v;
    });

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

    const requesterIsOwnerOrManager = isOwner(req.user) || isManager(req.user);
    if (requesterIsOwnerOrManager) {
      const requestDoc = await createAssetApprovalRequest({
        martId: asset.martId,
        user: req.user,
        action: "delete",
        assetId: asset._id,
        approvalRole: isOwner(req.user) ? "manager" : "owner",
        payload: {
          name: asset.name,
          assetId: asset.assetId,
        },
      });

      if (requestDoc) {
        return res.status(202).json({
          message: isOwner(req.user)
            ? "Asset delete submitted for manager approval"
            : "Asset delete submitted for owner approval",
          requestId: requestDoc._id,
        });
      }
    }

    await Asset.findByIdAndDelete(id);
    res.json({ message: "Asset deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
