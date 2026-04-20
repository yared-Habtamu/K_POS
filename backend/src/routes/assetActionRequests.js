const express = require("express");
const mongoose = require("mongoose");
const { authenticate } = require("../middleware/auth");
const AssetActionRequest = require("../models/assetActionRequest.model");
const Asset = require("../models/asset.model");
const { createNotification } = require("../services/notification.service");

const router = express.Router();

function isManager(user) {
  return String(user.role || "").toLowerCase() === "manager";
}

function isOwner(user) {
  return String(user.role || "").toLowerCase() === "owner";
}

function isSystemAdmin(user) {
  return String(user.role || "").toLowerCase() === "systemadmin";
}

function getApprovalRole(reqDoc) {
  return reqDoc?.approvalRole === "owner" ? "owner" : "manager";
}

async function generateAssetId(martId, session) {
  const query = Asset.findOne({ martId, assetId: /^AST\d+$/ })
    .sort({ createdAt: -1 })
    .select("assetId");

  if (session) query.session(session);

  const lastAsset = await query.lean();

  let nextNum = 1;
  if (lastAsset && lastAsset.assetId) {
    const match = lastAsset.assetId.match(/\d+/);
    if (match) nextNum = parseInt(match[0], 10) + 1;
  }

  return `AST${String(nextNum).padStart(4, "0")}`;
}

router.get("/", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { status, martId, startDate, endDate } = req.query;
    const filter = {};

    if (status) filter.status = status;

    if (isSystemAdmin(user)) {
      if (martId) filter.martId = martId;
    } else {
      filter.martId = user.martId;
      if (martId && String(martId) !== String(user.martId)) {
        return res
          .status(403)
          .json({ message: "Cannot view requests for another mart" });
      }

      if (isManager(user)) {
        filter.$or = [
          { approvalRole: "manager" },
          { approvalRole: { $exists: false } },
          { requesterId: user.id },
        ];
      } else if (isOwner(user)) {
        filter.$or = [{ approvalRole: "owner" }, { requesterId: user.id }];
      } else {
        return res.status(403).json({
          message: "Only managers and owners can view asset approvals",
        });
      }
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }

    const list = await AssetActionRequest.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/approve", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const reqDoc = await AssetActionRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    if (reqDoc.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    const approvalRole = getApprovalRole(reqDoc);
    const canApprove =
      isSystemAdmin(user) ||
      (approvalRole === "owner" ? isOwner(user) : isManager(user));
    if (!canApprove) {
      return res.status(403).json({
        message:
          approvalRole === "owner"
            ? "Only owners can approve this request"
            : "Only managers can approve this request",
      });
    }

    if (!isSystemAdmin(user) && String(reqDoc.martId) !== String(user.martId)) {
      return res
        .status(403)
        .json({ message: "Cannot approve request for another mart" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payload = reqDoc.payload || {};
      let affectedAsset = null;

      if (reqDoc.action === "create") {
        if (!payload.name || payload.quantity == null) {
          throw new Error("Request payload missing required asset fields");
        }

        const nextAssetId = await generateAssetId(reqDoc.martId, session);
        const asset = new Asset({
          martId: reqDoc.martId,
          name: payload.name,
          assetId: nextAssetId,
          image: payload.image || "",
          sizeOrType: payload.sizeOrType,
          purchaseDate: payload.purchaseDate,
          status: payload.status,
          asset_status: payload.asset_status || "unbroken",
          conditions: payload.conditions,
          assignedTo: payload.assignedTo,
          quantity: Number(payload.quantity),
          purchasePrice: Number(payload.purchasePrice || 0),
          description: payload.description,
          createdBy: reqDoc.requesterId,
        });
        await asset.save({ session });
        affectedAsset = asset;
      } else if (reqDoc.action === "update") {
        const asset = await Asset.findOne({
          _id: reqDoc.assetId,
          martId: reqDoc.martId,
        }).session(session);

        if (!asset) {
          throw new Error("Asset not found for this update request");
        }

        const fields = [
          "assetId",
          "name",
          "sizeOrType",
          "purchaseDate",
          "status",
          "asset_status",
          "conditions",
          "assignedTo",
          "description",
          "image",
        ];

        fields.forEach((field) => {
          if (payload[field] !== undefined) asset[field] = payload[field];
        });

        if (payload.quantity !== undefined) {
          asset.quantity = Number(payload.quantity);
        }

        if (payload.purchasePrice !== undefined) {
          asset.purchasePrice = Number(payload.purchasePrice);
        }

        await asset.save({ session });
        affectedAsset = asset;
      } else if (reqDoc.action === "delete") {
        const asset = await Asset.findOneAndDelete({
          _id: reqDoc.assetId,
          martId: reqDoc.martId,
        }).session(session);

        if (!asset) {
          throw new Error("Asset not found for this delete request");
        }

        affectedAsset = asset;
      } else {
        throw new Error("Unsupported request action");
      }

      reqDoc.status = "approved";
      reqDoc.approverId = user.id;
      reqDoc.approverName = user.username || user.name;
      reqDoc.decidedAt = new Date();
      await reqDoc.save({ session });

      await createNotification(
        {
          martId: reqDoc.martId,
          userId: reqDoc.requesterId,
          type: "asset_action_result",
          title: "Asset request approved",
          message: `Your asset ${reqDoc.action} request was approved`,
          metadata: {
            requestId: reqDoc._id,
            action: reqDoc.action,
            assetId: affectedAsset?._id,
            approvalRole,
            result: "approved",
          },
        },
        session,
      );

      await session.commitTransaction();
      session.endSession();

      return res.json({
        message: "Asset request approved",
        action: reqDoc.action,
        asset: affectedAsset,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error(err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to approve request" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/reject", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};

    const reqDoc = await AssetActionRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    if (reqDoc.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    const approvalRole = getApprovalRole(reqDoc);
    const canReject =
      isSystemAdmin(user) ||
      (approvalRole === "owner" ? isOwner(user) : isManager(user));
    if (!canReject) {
      return res.status(403).json({
        message:
          approvalRole === "owner"
            ? "Only owners can reject this request"
            : "Only managers can reject this request",
      });
    }

    if (!isSystemAdmin(user) && String(reqDoc.martId) !== String(user.martId)) {
      return res
        .status(403)
        .json({ message: "Cannot reject request for another mart" });
    }

    reqDoc.status = "rejected";
    reqDoc.approverId = user.id;
    reqDoc.approverName = user.username || user.name;
    reqDoc.reason = reason || "";
    reqDoc.decidedAt = new Date();
    await reqDoc.save();

    await createNotification({
      martId: reqDoc.martId,
      userId: reqDoc.requesterId,
      type: "asset_action_result",
      title: "Asset request rejected",
      message: `Your asset ${reqDoc.action} request was rejected. ${reason || ""}`,
      metadata: {
        requestId: reqDoc._id,
        action: reqDoc.action,
        approvalRole,
        result: "rejected",
      },
    });

    res.json({ message: "Request rejected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
