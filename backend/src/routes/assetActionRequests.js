const express = require("express");
const { authenticate } = require("../middleware/auth");
const prisma = require("../repositories/prismaClient");
const assetRepository = require("../repositories/assetRepository");
const {
  assetActionRequestRepository,
} = require("../repositories/requestRepositories");
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

async function generateAssetId(martId) {
  const last = await prisma.asset.findFirst({
    where: { martId, assetId: { startsWith: "AST" } },
    orderBy: { createdAt: "desc" },
    select: { assetId: true },
  });

  let nextNum = 1;
  if (last && last.assetId) {
    const match = last.assetId.match(/\d+/);
    if (match) nextNum = parseInt(match[0], 10) + 1;
  }

  return `AST${String(nextNum).padStart(4, "0")}`;
}

router.get("/", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { status, martId, startDate, endDate } = req.query;
    const where = {};
    if (status) where.status = status;
    if (isSystemAdmin(user)) {
      if (martId) where.martId = martId;
    } else {
      where.martId = user.martId;
      if (martId && String(martId) !== String(user.martId)) {
        return res
          .status(403)
          .json({ message: "Cannot view requests for another mart" });
      }

      if (isManager(user)) {
        where.OR = [{ approvalRole: "manager" }, { requesterId: user.id }];
      } else if (isOwner(user)) {
        where.OR = [{ approvalRole: "owner" }, { requesterId: user.id }];
      } else {
        return res.status(403).json({
          message: "Only managers and owners can view asset approvals",
        });
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    const list = await assetActionRequestRepository.findMany(where);

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

    const reqDoc = await assetActionRequestRepository.findById(id);
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

    try {
      const payload = reqDoc.payload || {};
      let affectedAsset = null;

      const result = await prisma.$transaction(async (tx) => {
        if (reqDoc.action === "create") {
          if (!payload.name || payload.quantity == null) {
            throw new Error("Request payload missing required asset fields");
          }

          const nextAssetId = await generateAssetId(reqDoc.martId);
          const asset = await tx.asset.create({
            data: {
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
            },
          });
          affectedAsset = asset;
        } else if (reqDoc.action === "update") {
          const asset = await tx.asset.findUnique({
            where: { id: reqDoc.assetId },
          });
          if (!asset)
            throw new Error("Asset not found for this update request");

          const data = {};
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
            if (payload[field] !== undefined) data[field] = payload[field];
          });
          if (payload.quantity !== undefined)
            data.quantity = Number(payload.quantity);
          if (payload.purchasePrice !== undefined)
            data.purchasePrice = Number(payload.purchasePrice);

          const updated = await tx.asset.update({
            where: { id: reqDoc.assetId },
            data,
          });
          affectedAsset = updated;
        } else if (reqDoc.action === "delete") {
          const asset = await tx.asset.findUnique({
            where: { id: reqDoc.assetId },
          });
          if (!asset)
            throw new Error("Asset not found for this delete request");
          await tx.asset.delete({ where: { id: reqDoc.assetId } });
          affectedAsset = asset;
        } else {
          throw new Error("Unsupported request action");
        }

        await tx.assetActionRequest.update({
          where: { id: reqDoc.id },
          data: {
            status: "approved",
            approverId: user.id,
            approverName: user.username || user.name,
            decidedAt: new Date(),
          },
        });

        await createNotification(
          {
            martId: reqDoc.martId,
            userId: reqDoc.requesterId,
            type: "asset_action_result",
            title: "Asset request approved",
            message: `Your asset ${reqDoc.action} request was approved`,
            metadata: {
              requestId: reqDoc.id,
              action: reqDoc.action,
              assetId: affectedAsset?.id || affectedAsset?._id,
              approvalRole,
              result: "approved",
            },
          },
          tx,
        );

        return affectedAsset;
      });

      return res.json({
        message: "Asset request approved",
        action: reqDoc.action,
        asset: result,
      });
    } catch (err) {
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

    const reqDoc = await assetActionRequestRepository.findById(id);
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
