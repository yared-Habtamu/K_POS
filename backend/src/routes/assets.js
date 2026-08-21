const express = require("express");
const router = express.Router();
const assetRepository = require("../repositories/assetRepository");
const {
  assetActionRequestRepository,
} = require("../repositories/requestRepositories");
const userRepository = require("../repositories/userRepository");
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
  const lastAsset = await assetRepository.findOne(
    { martId, NOT: { assetId: null } },
    { orderBy: { createdAt: "desc" }, select: { assetId: true } },
  );

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
  return userRepository.findMany(
    {
      martId,
      role: "manager",
      isDeleted: false,
      active: true,
    },
    { select: { id: true, username: true, name: true } },
  );
}

async function getMartOwners(martId) {
  if (!martId) return [];
  return userRepository.findMany(
    {
      martId,
      role: "owner",
      isDeleted: false,
      active: true,
    },
    { select: { id: true, username: true, name: true } },
  );
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

  const reqDoc = await assetActionRequestRepository.create({
    martId,
    requesterId: user.id,
    requesterName: user.username || user.name,
    requesterRole: requesterRole === "manager" ? "manager" : "owner",
    approvalRole,
    assetId: assetId || null,
    action,
    payload: payload || undefined,
  });

  await Promise.all(
    approvers.map((approver) =>
      createNotification({
        martId,
        userId: approver.id,
        type: "asset_action_request",
        title: "Asset action requested",
        message: `${reqDoc.requesterName || "User"} requested asset ${action} approval`,
        metadata: {
          requestId: reqDoc.id,
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

function deriveAssetStatus(rawAssetStatus, rawConditions) {
  const normalizedAssetStatus = String(rawAssetStatus || "")
    .trim()
    .toLowerCase();
  if (["broken", "unbroken"].includes(normalizedAssetStatus)) {
    return normalizedAssetStatus;
  }

  const normalizedCondition = String(rawConditions || "")
    .trim()
    .toLowerCase();
  if (["damaged", "lost", "broken"].includes(normalizedCondition)) {
    return "broken";
  }

  return "unbroken";
}

// List assets. Query ?martId=... allowed for systemAdmin, otherwise scoped to req.user.martId
router.get("/", authenticate, async (req, res) => {
  try {
    const { martId } = req.query;
    const filter = { isDeleted: false };
    if (req.user.role === "systemAdmin") {
      if (martId) filter.martId = martId;
    } else {
      filter.martId = req.user.martId;
      if (martId && String(martId) !== String(req.user.martId))
        return res
          .status(403)
          .json({ message: "Cannot list assets for another mart" });
    }
    const list = await assetRepository.findMany(filter, {
      orderBy: { createdAt: "desc" },
    });
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
      asset_status,
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

    const normalizedAssetStatus = deriveAssetStatus(asset_status, conditions);

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
          purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
          status,
          asset_status: normalizedAssetStatus,
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
          requestId: requestDoc.id,
        });
      }
    }

    // Auto-generate assetId on backend
    const assetId = await generateAssetId(targetMartId);

    const asset = await assetRepository.create({
      martId: targetMartId,
      name,
      assetId,
      image: finalImageUrl,
      sizeOrType,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      status,
      asset_status: normalizedAssetStatus,
      conditions,
      assignedTo,
      quantity: Number(quantity),
      purchasePrice: Number(purchasePrice || 0),
      description,
      createdBy: req.user.id,
    });
    res.status(201).json(asset);
  } catch (err) {
    console.error("Asset creation error:", err);
    console.error("Error details:", {
      message: err.message,
      code: err.code,
      meta: err.meta,
      stack: err.stack,
    });
    res.status(500).json({ message: "Server error", error: err.message });
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
      asset_status,
      conditions,
      assignedTo,
      quantity,
      description,
      purchasePrice,
    } = req.body;
    const asset = await assetRepository.findById(id);
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    if (req.user.role !== "systemAdmin") {
      if (!req.user.martId || String(asset.martId) !== String(req.user.martId))
        return res
          .status(403)
          .json({ message: "Insufficient permissions to update asset" });
    }

    // Handle image update
    let finalImageUrl = asset.image;
    if (req.file && req.file.buffer) {
      try {
        const uploaded = await uploadBuffer(
          req.file.buffer,
          req.file.originalname,
          `${req.protocol}://${req.get("host")}`,
        );
        finalImageUrl = uploaded.secure_url || uploaded.url || finalImageUrl;
      } catch (uploadErr) {
        console.error("Asset image update error:", uploadErr);
        return res.status(500).json({ message: "Image upload failed" });
      }
    } else if (req.body.image !== undefined) {
      finalImageUrl = req.body.image;
    }

    const changes = {};
    if (name != null) changes.name = name;
    if (assetId != null) changes.assetId = assetId;
    if (sizeOrType != null) changes.sizeOrType = sizeOrType;
    if (purchaseDate != null)
      changes.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
    if (status != null) changes.status = status;
    if (asset_status != null || conditions != null) {
      changes.asset_status = deriveAssetStatus(asset_status, conditions);
    }
    if (conditions != null) changes.conditions = conditions;
    if (assignedTo != null) changes.assignedTo = assignedTo;
    if (quantity != null) changes.quantity = Number(quantity);
    if (purchasePrice != null) changes.purchasePrice = Number(purchasePrice);
    if (description != null) changes.description = description;
    if (finalImageUrl != null) changes.image = finalImageUrl;

    const requesterIsOwnerOrManager = isOwner(req.user) || isManager(req.user);
    if (requesterIsOwnerOrManager) {
      const requestDoc = await createAssetApprovalRequest({
        martId: asset.martId,
        user: req.user,
        action: "update",
        assetId: asset.id,
        approvalRole: isOwner(req.user) ? "manager" : "owner",
        payload: changes,
      });

      if (requestDoc) {
        return res.status(202).json({
          message: isOwner(req.user)
            ? "Asset update submitted for manager approval"
            : "Asset update submitted for owner approval",
          requestId: requestDoc.id,
        });
      }
    }

    const updatedAsset = await assetRepository.update(id, changes);
    res.json(updatedAsset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete asset
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await assetRepository.findById(id);
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
        assetId: asset.id,
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
          requestId: requestDoc.id,
        });
      }
    }

    await assetRepository.delete(id);
    res.json({ message: "Asset deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
