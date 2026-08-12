const express = require("express");
const { authenticate } = require("../middleware/auth");
const { productAddRequestRepository } = require("../repositories/requestRepositories");
const { createNotification } = require("../services/notification.service");
const prisma = require("../repositories/prismaClient");

const router = express.Router();

function isManager(user) {
  const r = String(user.role || "").toLowerCase();
  return r === "manager";
}

function isSystemAdmin(user) {
  return String(user.role || "").toLowerCase() === "systemadmin";
}

function isStoreKeeper(user) {
  const r = String(user.role || "").toLowerCase();
  return r === "storekeeper" || r === "store_keeper";
}

function getApprovalRole(reqDoc) {
  return reqDoc?.approvalRole === "store_keeper" ? "store_keeper" : "manager";
}

async function ensurePayloadBarcodes(payload) {
  const incomingBarcodes = (
    Array.isArray(payload?.barcodes) ? payload.barcodes : []
  )
    .map((value) => String(value).trim())
    .filter(Boolean);

  payload.barcodes = Array.from(new Set(incomingBarcodes));
  return payload.barcodes;
}

// List requests for a mart
router.get("/", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { status, martId, startDate, endDate, scope } = req.query;
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

      // scope=all (used by the approval history page) skips role scoping so
      // involvement can be resolved client-side for the full mart.
      if (scope === "all") {
        // no role scoping
      } else if (isManager(user)) {
        filter.OR = [
          { approvalRole: "manager" },
          { approvalRole: null },
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
              "Only managers, store keepers, and owners can view product add requests",
          });
      }
    }

    // date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        filter.createdAt.lte = d;
      }
    }

    const list = await productAddRequestRepository.findMany(filter, {
      orderBy: { createdAt: "desc" },
    });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Approve request -> create product
router.put("/:id/approve", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const reqDoc = await productAddRequestRepository.findById(id);
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

    const payload = reqDoc.payload || {};
    if (!payload.name || !reqDoc.martId) {
      return res
        .status(400)
        .json({ message: "Request payload missing required fields" });
    }

    await ensurePayloadBarcodes(payload);

    // Normalize quantities: mart/sellable stock defaults to the requested
    // quantity; store (warehouse) stock defaults to zero.
    const superQty =
      payload.supermarketQuantity != null
        ? Number(payload.supermarketQuantity)
        : Number(payload.quantity || 0);
    const storeQty =
      payload.storeQuantity != null ? Number(payload.storeQuantity) : 0;
    const saleQty = superQty;

    const productData = {
      ...payload,
      martId: reqDoc.martId,
      quantity: Number.isFinite(saleQty) ? saleQty : 0,
      storeQuantity: Number.isFinite(storeQty) ? Math.max(0, storeQty) : 0,
      supermarketQuantity: Number.isFinite(superQty)
        ? Math.max(0, superQty)
        : 0,
      createdBy: reqDoc.requesterId,
      expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : null,
      purchasePrice: payload.purchasePrice ? Number(payload.purchasePrice) : 0,
      sellingPrice: payload.sellingPrice ? Number(payload.sellingPrice) : 0,
      lowStockThreshold: payload.lowStockThreshold ? Number(payload.lowStockThreshold) : 10,
    };

    let result;
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: productData });

      const updatedReq = await tx.productAddRequest.update({
        where: { id },
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
          type: "product_add_result",
          title: "Product request approved",
          message: `Your product request for ${payload.name} was approved`,
          metadata: {
            requestId: reqDoc.id,
            productId: product.id,
            result: "approved",
          },
        },
        tx,
      );

      result = { product, updatedReq };
    });

    return res.json({ message: "Product created", product: result.product });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: err.message || "Failed to approve request" });
  }
});

// Reject request
router.put("/:id/reject", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};

    const reqDoc = await productAddRequestRepository.findById(id);
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

    const updatedReq = await productAddRequestRepository.update(id, {
      status: "rejected",
      approverId: user.id,
      approverName: user.username || user.name,
      reason: reason || "",
      decidedAt: new Date(),
    });

    await createNotification({
      martId: reqDoc.martId,
      userId: reqDoc.requesterId,
      type: "product_add_result",
      title: "Product request rejected",
      message: `Your product request for ${(reqDoc.payload && reqDoc.payload.name) || "product"} was rejected. ${reason || ""}`,
      metadata: { requestId: reqDoc.id, result: "rejected" },
    });

    res.json({ message: "Request rejected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
