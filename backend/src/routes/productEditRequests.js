const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { authenticate } = require("../middleware/auth");
const ProductEditRequest = require("../models/productEditRequest.model");
const Product = require("../models/product.model");
const { createNotification } = require("../services/notification.service");

function normalizeExpiryDate(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const str = String(value).trim();
  if (!str || str.toLowerCase() === "null") return null;
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSystemAdmin(user) {
  return String(user.role || "").toLowerCase() === "systemadmin";
}

function isManager(user) {
  return String(user.role || "").toLowerCase() === "manager";
}

function isStoreKeeper(user) {
  const role = String(user.role || "").toLowerCase();
  return role === "storekeeper" || role === "store_keeper";
}

function getApprovalRole(reqDoc) {
  return reqDoc?.approvalRole === "store_keeper" ? "store_keeper" : "manager";
}

// List requests (systemAdmin or mart owner can filter by martId)
router.get("/", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { status, martId, startDate, endDate } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (isSystemAdmin(user)) {
      if (martId) filter.martId = martId;
    } else {
      // non-admins can only see requests for their mart
      filter.martId = user.martId;

      if (isManager(user)) {
        filter.$or = [
          { approvalRole: "manager" },
          { approvalRole: { $exists: false } },
        ];
      } else if (isStoreKeeper(user)) {
        filter.approvalRole = "store_keeper";
      } else if (String(user.role || "").toLowerCase() === "owner") {
        filter.requesterId = user.id;
      } else {
        return res
          .status(403)
          .json({
            message:
              "Only managers, store keepers, and owners can view product edit requests",
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

    const list = await ProductEditRequest.find(filter)
      .populate("productId", "name")
      .sort({ createdAt: -1 })
      .lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Approve a request
router.put("/:id/approve", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const reqDoc = await ProductEditRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    if (reqDoc.status !== "pending")
      return res.status(400).json({ message: "Request already processed" });

    const approvalRole = getApprovalRole(reqDoc);
    const canApprove =
      isSystemAdmin(user) ||
      (approvalRole === "store_keeper" ? isStoreKeeper(user) : isManager(user));

    if (!canApprove) {
      return res.status(403).json({
        message:
          approvalRole === "store_keeper"
            ? "Only store keepers can approve this request"
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
      // Apply changes to product
      const update = { ...(reqDoc.changes || {}) };
      if (Object.prototype.hasOwnProperty.call(update, "expiryDate")) {
        update.expiryDate = normalizeExpiryDate(update.expiryDate);
      }
      const product = await Product.findOneAndUpdate(
        { _id: reqDoc.productId, martId: reqDoc.martId },
        update,
        { new: true, session },
      );
      if (!product) throw new Error("Product not found for update");

      reqDoc.status = "approved";
      reqDoc.approverId = user.id;
      reqDoc.approverName = user.username || user.name;
      reqDoc.decidedAt = new Date();
      await reqDoc.save({ session });

      // notify requester
      // notify requester
      await createNotification(
        {
          martId: reqDoc.martId,
          userId: reqDoc.requesterId,
          type: "product_edit_result",
          title: "Product edit approved",
          message: `Your requested edit for product ${String(reqDoc.productId)} was approved.`,
          metadata: {
            requestId: reqDoc._id,
            productId: reqDoc.productId,
            result: "approved",
          },
        },
        session,
      );

      await session.commitTransaction();
      session.endSession();

      res.json({ message: "Request approved", product });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error(err);
      res
        .status(500)
        .json({ message: err.message || "Failed to approve request" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Reject a request
router.put("/:id/reject", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};
    const reqDoc = await ProductEditRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    if (reqDoc.status !== "pending")
      return res.status(400).json({ message: "Request already processed" });

    const approvalRole = getApprovalRole(reqDoc);
    const canReject =
      isSystemAdmin(user) ||
      (approvalRole === "store_keeper" ? isStoreKeeper(user) : isManager(user));

    if (!canReject) {
      return res.status(403).json({
        message:
          approvalRole === "store_keeper"
            ? "Only store keepers can reject this request"
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
      type: "product_edit_result",
      title: "Product edit rejected",
      message: `Your requested edit for product ${String(reqDoc.productId)} was rejected. ${reason || ""}`,
      metadata: {
        requestId: reqDoc._id,
        productId: reqDoc.productId,
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
