const express = require("express");
const { authenticate } = require("../middleware/auth");
const prisma = require("../repositories/prismaClient");
const productRepository = require("../repositories/productRepository");
const userRepository = require("../repositories/userRepository");
const {
  stockTransferRequestRepository,
} = require("../repositories/requestRepositories");
const { createNotification } = require("../services/notification.service");

const router = express.Router();

function isManager(user) {
  return user.role === "manager" || user.role === "systemAdmin";
}

function isStoreKeeper(user) {
  return user.role === "storeKeeper" || user.role === "store_keeper";
}

// List transfer requests
router.get("/", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { status, martId, startDate, endDate, approvalRole, scope } =
      req.query;
    const where = {};
    if (status) where.status = status;
    if (approvalRole) where.approvalRole = approvalRole;

    if (user.role === "systemAdmin") {
      if (martId) where.martId = martId;
    } else {
      where.martId = user.martId;
      if (martId && String(martId) !== String(user.martId)) {
        return res
          .status(403)
          .json({ message: "Cannot view requests for another mart" });
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

    // By default each role only sees requests assigned to its own approval.
    // scope=all (used by the approval history page) returns every transfer for
    // the mart so the report shows both directions and all statuses.
    if (
      !approvalRole &&
      scope !== "all" &&
      user.role !== "systemAdmin"
    ) {
      if (isManager(user)) {
        where.OR = [{ approvalRole: "manager" }];
      } else if (isStoreKeeper(user)) {
        where.approvalRole = "store_keeper";
      }
    }

    const list = await stockTransferRequestRepository.findMany(where, {
      include: { product: { select: { name: true, imageUrl: true } } },
    });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create transfer request (store -> mart, or owner-only mart -> store)
router.post("/", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { productId, quantity, transferType } = req.body;

    if (!productId || quantity == null)
      return res
        .status(400)
        .json({ message: "productId and quantity are required" });
    if (
      !["storeKeeper", "store_keeper", "owner", "manager"].includes(
        user.role,
      ) &&
      user.role !== "systemAdmin"
    ) {
      return res.status(403).json({
        message: "Only store keepers, managers or owners can request transfers",
      });
    }

    // Validate transferType strictly to avoid silent misclassification
    if (
      !transferType ||
      !["mart_to_store", "store_to_mart"].includes(transferType)
    ) {
      return res.status(400).json({
        message:
          'transferType is required and must be "mart_to_store" or "store_to_mart"',
      });
    }
    const normalizedTransferType = transferType;
    const isMartToStore = normalizedTransferType === "mart_to_store";

    // Debug logging to help diagnose client/server mismatches
    console.log(
      `Stock transfer request by user ${user.id} transferType=${transferType} normalized=${normalizedTransferType}`,
    );

    if (
      isMartToStore &&
      !["owner", "manager", "systemAdmin"].includes(user.role)
    ) {
      return res
        .status(403)
        .json({
          message: "Only owners or managers can request mart to store transfers",
        });
    }

    // store keepers need explicit permission to request transfers
    if (user.role === "store_keeper" || user.role === "storeKeeper") {
      const perms = Array.isArray(user.permissions) ? user.permissions : [];
      if (!perms.includes("transferStock")) {
        return res.status(403).json({
          message: "Insufficient permissions to request stock transfer",
        });
      }
    }

    const product = await productRepository.findById(productId);
    if (
      product &&
      user.role !== "systemAdmin" &&
      product.martId !== user.martId
    ) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (!product) return res.status(404).json({ message: "Product not found" });

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0)
      return res.status(400).json({ message: "Quantity must be positive" });

    const sourceQty = isMartToStore
      ? Number(product.supermarketQuantity ?? product.quantity ?? 0)
      : Number(product.storeQuantity ?? 0);
    if (sourceQty < qty) {
      return res.status(400).json({
        message: isMartToStore
          ? "Not enough stock in mart to transfer"
          : "Not enough stock in store to transfer",
      });
    }

    const fromLocation = isMartToStore ? "mart" : "store";
    const toLocation = isMartToStore ? "store" : "mart";
    const requiredApprovalRole = isMartToStore ? "store_keeper" : "manager";

    const existingPending = await stockTransferRequestRepository.findOne({
      productId,
      requesterId: user.id,
      status: "pending",
      fromLocation,
      toLocation,
    });
    if (existingPending) {
      return res.status(409).json({
        message: "A pending stock transfer request already exists for this product.",
        requestId: existingPending.id || existingPending._id,
      });
    }

    const approvers =
      requiredApprovalRole === "store_keeper"
        ? await userRepository.findMany({
            martId: product.martId,
            role: "storeKeeper",
            isDeleted: false,
            active: true,
          })
        : await userRepository.findMany({
            martId: product.martId,
            role: "manager",
            isDeleted: false,
            active: true,
          });

    // If there are no eligible approvers (store keeper or manager),
    // apply the transfer immediately inside a transaction.
    if (!approvers || approvers.length === 0) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          const prod = await tx.product.findUnique({
            where: { id: productId },
          });
          if (!prod) throw new Error("Product not found");

          if (isMartToStore) {
            if (Number(prod.supermarketQuantity ?? prod.quantity ?? 0) < qty) {
              throw new Error("Not enough stock in mart to transfer");
            }
            await tx.product.update({
              where: { id: productId },
              data: {
                supermarketQuantity:
                  Number(prod.supermarketQuantity ?? prod.quantity ?? 0) - qty,
                storeQuantity: Number(prod.storeQuantity || 0) + qty,
                quantity:
                  Number(prod.supermarketQuantity ?? prod.quantity ?? 0) - qty,
              },
            });
          } else {
            if (Number(prod.storeQuantity || 0) < qty)
              throw new Error("Not enough stock in store to transfer");
            await tx.product.update({
              where: { id: productId },
              data: {
                storeQuantity: Number(prod.storeQuantity || 0) - qty,
                supermarketQuantity:
                  Number(prod.supermarketQuantity ?? prod.quantity ?? 0) + qty,
                quantity:
                  Number(prod.supermarketQuantity ?? prod.quantity ?? 0) + qty,
              },
            });
          }

          const reqDoc = await tx.stockTransferRequest.create({
            data: {
              productId,
              martId: product.martId,
              quantity: qty,
              fromLocation,
              toLocation,
              approvalRole: requiredApprovalRole,
              requesterId: user.id,
              requesterName: user.username || user.name,
              status: "approved",
              approverId: user.id,
              approverName: user.username || user.name,
              decidedAt: new Date(),
            },
          });

          await createNotification(
            {
              martId: product.martId,
              userId: user.id,
              type: "stock_transfer_result",
              title: "Stock transfer completed",
              message: `Your stock transfer (${fromLocation} -> ${toLocation}) of ${qty} units for ${prod.name} was completed`,
              metadata: { requestId: reqDoc.id, productId, result: "approved" },
            },
            tx,
          );

          return tx.product.findUnique({ where: { id: productId } });
        });

        return res
          .status(201)
          .json({ message: "Transfer completed", product: result });
      } catch (err) {
        console.error(err);
        return res
          .status(500)
          .json({ message: err.message || "Failed to complete transfer" });
      }
    }

    // Otherwise create a pending request and notify managers
    const reqDoc = await stockTransferRequestRepository.create({
      productId,
      martId: product.martId,
      quantity: qty,
      fromLocation,
      toLocation,
      approvalRole: requiredApprovalRole,
      requesterId: user.id,
      requesterName: user.username || user.name,
    });

    if (approvers && approvers.length > 0) {
      for (const m of approvers) {
        await createNotification({
          martId: product.martId,
          userId: m.id || m._id,
          type: "stock_transfer_request",
          title: "Stock transfer requested",
          message: `${reqDoc.requesterName || "User"} requested to move ${qty} units (${fromLocation} -> ${toLocation})`,
          metadata: { requestId: reqDoc.id || reqDoc._id, productId },
        });
      }
    }

    // debug: log requester and their permissions for auditing
    console.log(
      `Stock transfer request from user ${user.id} (${user.username || user.name}) permissions:`,
      user.permissions,
    );

    res.status(202).json({
      message: "Transfer request submitted for approval",
      requestId: reqDoc.id || reqDoc._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Approve transfer
router.put("/:id/approve", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const reqDoc = await stockTransferRequestRepository.findById(id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    if (reqDoc.status !== "pending")
      return res.status(400).json({ message: "Request already processed" });

    const requiredApprovalRole =
      reqDoc.approvalRole === "store_keeper" ? "store_keeper" : "manager";
    const canApprove =
      user.role === "systemAdmin" ||
      (requiredApprovalRole === "manager" && isManager(user)) ||
      (requiredApprovalRole === "store_keeper" && isStoreKeeper(user));
    if (!canApprove) {
      return res.status(403).json({
        message:
          requiredApprovalRole === "store_keeper"
            ? "Only store keepers or system admins can approve this request"
            : "Only managers or system admins can approve this request",
      });
    }

    if (
      user.role !== "systemAdmin" &&
      String(reqDoc.martId) !== String(user.martId)
    ) {
      return res
        .status(403)
        .json({ message: "Cannot approve request for another mart" });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const prod = await tx.product.findUnique({
          where: { id: reqDoc.productId },
        });
        if (!prod) throw new Error("Product not found");

        const qty = Number(reqDoc.quantity || 0);
        const fromLocation = reqDoc.fromLocation === "mart" ? "mart" : "store";
        const toLocation = reqDoc.toLocation === "store" ? "store" : "mart";

        if (fromLocation === "mart" && toLocation === "store") {
          if (Number(prod.supermarketQuantity ?? prod.quantity ?? 0) < qty) {
            throw new Error("Insufficient mart quantity");
          }
          await tx.product.update({
            where: { id: reqDoc.productId },
            data: {
              supermarketQuantity:
                Number(prod.supermarketQuantity ?? prod.quantity ?? 0) - qty,
              storeQuantity: Number(prod.storeQuantity || 0) + qty,
              quantity:
                Number(prod.supermarketQuantity ?? prod.quantity ?? 0) - qty,
            },
          });
        } else {
          if (Number(prod.storeQuantity || 0) < qty)
            throw new Error("Insufficient store quantity");
          await tx.product.update({
            where: { id: reqDoc.productId },
            data: {
              storeQuantity: Math.max(0, Number(prod.storeQuantity || 0) - qty),
              supermarketQuantity:
                Number(prod.supermarketQuantity ?? prod.quantity ?? 0) + qty,
              quantity:
                Number(prod.supermarketQuantity ?? prod.quantity ?? 0) + qty,
            },
          });
        }

        await tx.stockTransferRequest.update({
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
            type: "stock_transfer_result",
            title: "Stock transfer approved",
            message: `Your stock transfer request was approved`,
            metadata: {
              requestId: reqDoc.id,
              productId: reqDoc.productId,
              result: "approved",
            },
          },
          tx,
        );

        return tx.product.findUnique({ where: { id: reqDoc.productId } });
      });

      res.json({ message: "Transfer approved", product: result });
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

// Reject transfer
router.put("/:id/reject", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};

    const reqDoc = await stockTransferRequestRepository.findById(id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    if (reqDoc.status !== "pending")
      return res.status(400).json({ message: "Request already processed" });

    const requiredApprovalRole =
      reqDoc.approvalRole === "store_keeper" ? "store_keeper" : "manager";
    const canReject =
      user.role === "systemAdmin" ||
      (requiredApprovalRole === "manager" && isManager(user)) ||
      (requiredApprovalRole === "store_keeper" && isStoreKeeper(user));
    if (!canReject) {
      return res.status(403).json({
        message:
          requiredApprovalRole === "store_keeper"
            ? "Only store keepers or system admins can reject this request"
            : "Only managers or system admins can reject this request",
      });
    }

    if (
      user.role !== "systemAdmin" &&
      String(reqDoc.martId) !== String(user.martId)
    ) {
      return res
        .status(403)
        .json({ message: "Cannot reject request for another mart" });
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.stockTransferRequest.update({
          where: { id: reqDoc.id },
          data: {
            status: "rejected",
            approverId: user.id,
            approverName: user.username || user.name,
            reason: reason || "",
            decidedAt: new Date(),
          },
        });

        await createNotification(
          {
            martId: reqDoc.martId,
            userId: reqDoc.requesterId,
            type: "stock_transfer_result",
            title: "Stock transfer rejected",
            message: `Your stock transfer request was rejected. ${reason || ""}`,
            metadata: { requestId: reqDoc.id, result: "rejected" },
          },
          tx,
        );
      });

      res.json({ message: "Request rejected" });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ message: err.message || "Failed to reject request" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
