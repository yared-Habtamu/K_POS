const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const prisma = require("../repositories/prismaClient");
const productRepository = require("../repositories/productRepository");
const {
  productEditRequestRepository,
} = require("../repositories/requestRepositories");
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
    const { status, martId, startDate, endDate, scope } = req.query;
    const where = {};
    if (status) where.status = status;
    if (isSystemAdmin(user)) {
      if (martId) where.martId = martId;
    } else {
      where.martId = user.martId;

      // scope=all (used by the approval history page) skips role scoping so
      // involvement can be resolved client-side for the full mart.
      if (scope === "all") {
        // no role scoping
      } else if (isManager(user)) {
        where.OR = [{ approvalRole: "manager" }];
      } else if (isStoreKeeper(user)) {
        where.approvalRole = "store_keeper";
      } else if (String(user.role || "").toLowerCase() === "owner") {
        where.requesterId = user.id;
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
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    const list = await productEditRequestRepository.findMany(where, {
      include: { product: { select: { name: true, imageUrl: true } } },
    });
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
    const reqDoc = await productEditRequestRepository.findById(id);
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

    try {
      const updatedProduct = await prisma.$transaction(async (tx) => {
        const update = { ...(reqDoc.changes || {}) };
        if (Object.prototype.hasOwnProperty.call(update, "expiryDate")) {
          update.expiryDate = normalizeExpiryDate(update.expiryDate);
        }

        const prod = await tx.product.update({
          where: { id: reqDoc.productId },
          data: update,
        });
        if (!prod) throw new Error("Product not found for update");

        await tx.productEditRequest.update({
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
            type: "product_edit_result",
            title: "Product edit approved",
            message: `Your requested edit for product ${String(reqDoc.productId)} was approved.`,
            metadata: {
              requestId: reqDoc.id,
              productId: reqDoc.productId,
              result: "approved",
            },
          },
          tx,
        );

        return prod;
      });

      res.json({ message: "Request approved", product: updatedProduct });
    } catch (err) {
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
    const reqDoc = await productEditRequestRepository.findById(id);
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

    await productEditRequestRepository.update(id, {
      status: "rejected",
      approverId: user.id,
      approverName: user.username || user.name,
      reason: reason || "",
      decidedAt: new Date(),
    });

    await createNotification({
      martId: reqDoc.martId,
      userId: reqDoc.requesterId,
      type: "product_edit_result",
      title: "Product edit rejected",
      message: `Your requested edit for product ${String(reqDoc.productId)} was rejected. ${reason || ""}`,
      metadata: {
        requestId: reqDoc.id,
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
