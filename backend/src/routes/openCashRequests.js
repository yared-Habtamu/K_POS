const express = require("express");
const router = express.Router();
const prisma = require("../repositories/prismaClient");
const userRepository = require("../repositories/userRepository");
const { authenticate } = require("../middleware/auth");
const { createNotification } = require("../services/notification.service");
const multer = require("multer");
const { uploadBuffer } = require("../utils/cloudinary");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  return next();
}

function requireOwnerOrManager(req, res, next) {
  if (!["owner", "manager"].includes(req.user.role)) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }
  return next();
}

function normalizeRole(user) {
  return String(user?.role || "").toLowerCase();
}

function isOwner(user) {
  return normalizeRole(user) === "owner";
}

function isManager(user) {
  return normalizeRole(user) === "manager";
}

async function getMartOwners(martId) {
  if (!martId) return [];
  return userRepository.findMany({
    martId,
    role: "owner",
    isDeleted: false,
    active: true,
  });
}

const withNames = {
  manager: { select: { id: true, name: true } },
  requester: { select: { id: true, name: true } },
  approver: { select: { id: true, name: true } },
};

// Map a raw OpenCashRequest row into the frontend DTO shape.
function serializeRequest(reqRow) {
  return {
    id: reqRow.id,
    martId: reqRow.martId,
    managerId: reqRow.managerId,
    requesterId: reqRow.requesterId,
    direction: reqRow.direction,
    amount: Number(reqRow.amount),
    receiptUrl: reqRow.receiptUrl,
    status: reqRow.status,
    approverId: reqRow.approverId || undefined,
    reason: reqRow.reason || undefined,
    decidedAt: reqRow.decidedAt ? reqRow.decidedAt.toISOString() : undefined,
    createdAt: reqRow.createdAt.toISOString(),
    updatedAt: reqRow.updatedAt.toISOString(),
    managerName: reqRow.manager?.name,
    requesterName: reqRow.requester?.name,
    approverName: reqRow.approver?.name,
  };
}

// ─── GET /api/open-cash-requests ─────────────────────────────────────────────
// List open cash requests for the current user's mart.
// Owners/managers see all; cashiers see only their own.

router.get("/", authenticate, requireAuth, async (req, res) => {
  try {
    const { martId, role, id: userId } = req.user;
    const { status, direction, managerId, page = "1", limit = "20" } = req.query;

    const where = { martId };
    if (status) where.status = status;
    if (direction) where.direction = direction;
    if (managerId) where.managerId = managerId;

    // Cashiers can only see their own requests
    if (role === "cashier") {
      where.requesterId = userId;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * pageSize;

    const [requests, total] = await Promise.all([
      prisma.openCashRequest.findMany({
        where,
        include: withNames,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.openCashRequest.count({ where }),
    ]);

    return res.json({
      data: requests.map(serializeRequest),
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error("[openCashRequests] GET error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ─── GET /api/open-cash-requests/transactions ────────────────────────────────
// Transaction report for owner/manager: amount, direction, receipt,
// requester, approver, status, date. Both roles share the same view.

router.get(
  "/transactions",
  authenticate,
  requireAuth,
  requireOwnerOrManager,
  async (req, res) => {
    try {
      const { martId } = req.user;
      const { status, direction, managerId, startDate, endDate } = req.query;

      const where = { martId };
      if (status) where.status = status;
      if (direction) where.direction = direction;
      if (managerId) where.managerId = managerId;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) {
          const d = new Date(endDate);
          d.setHours(23, 59, 59, 999);
          where.createdAt.lte = d;
        }
      }

      const requests = await prisma.openCashRequest.findMany({
        where,
        include: withNames,
        orderBy: { createdAt: "desc" },
      });

      return res.json({ data: requests.map(serializeRequest) });
    } catch (err) {
      console.error("[openCashRequests] GET transactions error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
);

// ─── POST /api/open-cash-requests ────────────────────────────────────────────
// Create an open cash request.
//   - Owner -> Manager allocation: requester is owner, managerId is the
//     receiving manager, and the receiving manager approves/rejects.
//   - Manager -> Owner return: requester is the manager, managerId is self,
//     and the owner approves/rejects.
// A receipt image is always required. Balance changes only after approval.

router.post(
  "/",
  authenticate,
  requireAuth,
  requireOwnerOrManager,
  upload.single("receipt"),
  async (req, res) => {
    try {
      const { martId, id: requesterId, role } = req.user;
      const { direction, amount, managerId } = req.body;

      if (!direction || !["allocation", "return"].includes(direction)) {
        return res
          .status(400)
          .json({ message: "Direction must be 'allocation' or 'return'" });
      }

      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: "Amount must be positive" });
      }

      // Receipt image is required (uploaded file or an existing URL).
      let receiptUrl = req.body.receiptUrl || "";
      if (req.file && req.file.buffer) {
        try {
          const uploaded = await uploadBuffer(
            req.file.buffer,
            req.file.originalname,
            `${req.protocol}://${req.get("host")}`,
            "pos_receipts",
          );
          receiptUrl = uploaded.secure_url || uploaded.url || receiptUrl;
        } catch (err) {
          console.error("Open cash receipt upload error:", err);
          return res.status(500).json({ message: "Receipt upload failed" });
        }
      }
      if (!receiptUrl) {
        return res.status(400).json({ message: "Receipt image is required" });
      }

      let targetManagerId = null;

      if (role === "owner") {
        // Owner -> Manager allocation
        if (direction !== "allocation") {
          return res
            .status(400)
            .json({ message: "Owners can only create allocation requests" });
        }
        if (!managerId) {
          return res.status(400).json({ message: "managerId is required" });
        }
        targetManagerId = managerId;
      } else if (role === "manager") {
        // Manager -> Owner return
        if (direction !== "return") {
          return res
            .status(400)
            .json({ message: "Managers can only create return requests" });
        }
        // A manager can only return their own open cash.
        targetManagerId = requesterId;
      }

      // Validate the target manager belongs to the same mart.
      const manager = await prisma.user.findFirst({
        where: {
          id: targetManagerId,
          martId,
          role: "manager",
          isDeleted: false,
        },
      });
      if (!manager) {
        return res
          .status(404)
          .json({ message: "Manager not found in this mart" });
      }

      const request = await prisma.openCashRequest.create({
        data: {
          martId,
          managerId: targetManagerId,
          requesterId,
          direction,
          amount: parsedAmount,
          receiptUrl,
          status: "pending",
        },
        include: withNames,
      });

      // Notify whoever must approve this request.
      if (direction === "allocation") {
        await createNotification({
          martId,
          userId: targetManagerId,
          type: "open_cash_request",
          title: "Open cash allocation requested",
          message: `Owner allocated ${parsedAmount} to your open cash`,
          metadata: { requestId: request.id, direction, amount: parsedAmount },
        });
      } else {
        const owners = await getMartOwners(martId);
        await Promise.all(
          owners.map((owner) =>
            createNotification({
              martId,
              userId: owner.id,
              type: "open_cash_request",
              title: "Open cash return requested",
              message: `Manager requested to return ${parsedAmount} of open cash`,
              metadata: { requestId: request.id, direction, amount: parsedAmount },
            }),
          ),
        );
      }

      return res.status(201).json(serializeRequest(request));
    } catch (err) {
      console.error("[openCashRequests] POST error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
);

// ─── Decision helpers ────────────────────────────────────────────────────────
// The approver depends on the direction:
//   - allocation -> the receiving manager approves/rejects
//   - return    -> the owner approves/rejects

function canDecide(user, request) {
  if (request.direction === "allocation") {
    // Only the receiving manager can decide on an allocation.
    return isManager(user) && String(user.id) === String(request.managerId);
  }
  // Only an owner of the same mart can decide on a return.
  if (!isOwner(user)) return false;
  return !request.martId || String(request.martId) === String(user.martId);
}

// ─── PUT /api/open-cash-requests/:id/approve ─────────────────────────────────
// Approve an open cash request and apply the balance change.

router.put("/:id/approve", authenticate, requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: approverId } = req.user;
    const { reason } = req.body || {};

    const existing = await prisma.openCashRequest.findUnique({
      where: { id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (existing.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Request has already been decided" });
    }
    if (!canDecide(req.user, existing)) {
      return res.status(403).json({
        message:
          existing.direction === "allocation"
            ? "Only the receiving manager can approve this allocation"
            : "Only the owner can approve this return",
      });
    }

    try {
      const approved = await prisma.$transaction(async (tx) => {
        if (existing.direction === "return") {
          const manager = await tx.user.findUnique({
            where: { id: existing.managerId },
          });
          if (
            !manager ||
            Number(manager.openCashBalance || 0) < Number(existing.amount)
          ) {
            throw new Error("Insufficient open cash balance");
          }
          await tx.user.update({
            where: { id: existing.managerId },
            data: { openCashBalance: { decrement: existing.amount } },
          });
        } else {
          await tx.user.update({
            where: { id: existing.managerId },
            data: { openCashBalance: { increment: existing.amount } },
          });
        }

        return tx.openCashRequest.update({
          where: { id },
          data: {
            status: "approved",
            approverId,
            reason: reason || null,
            decidedAt: new Date(),
          },
          include: withNames,
        });
      });

      await createNotification({
        martId: existing.martId,
        userId: existing.requesterId,
        type: "open_cash_result",
        title: "Open cash request approved",
        message: `Your open cash ${existing.direction} of ${existing.amount} was approved`,
        metadata: { requestId: existing.id, result: "approved" },
      });

      return res.json(serializeRequest(approved));
    } catch (txErr) {
      if (String(txErr.message || "").includes("Insufficient open cash balance")) {
        return res.status(400).json({ message: txErr.message });
      }
      throw txErr;
    }
  } catch (err) {
    console.error("[openCashRequests] PUT approve error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ─── PUT /api/open-cash-requests/:id/reject ──────────────────────────────────
// Reject an open cash request. No balance change.

router.put("/:id/reject", authenticate, requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: approverId } = req.user;
    const { reason } = req.body || {};

    const existing = await prisma.openCashRequest.findUnique({
      where: { id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (existing.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Request has already been decided" });
    }
    if (!canDecide(req.user, existing)) {
      return res.status(403).json({
        message:
          existing.direction === "allocation"
            ? "Only the receiving manager can reject this allocation"
            : "Only the owner can reject this return",
      });
    }

    const rejected = await prisma.openCashRequest.update({
      where: { id },
      data: {
        status: "rejected",
        approverId,
        reason: reason || null,
        decidedAt: new Date(),
      },
      include: withNames,
    });

    await createNotification({
      martId: existing.martId,
      userId: existing.requesterId,
      type: "open_cash_result",
      title: "Open cash request rejected",
      message: `Your open cash ${existing.direction} of ${existing.amount} was rejected. ${reason || ""}`,
      metadata: { requestId: existing.id, result: "rejected" },
    });

    return res.json(serializeRequest(rejected));
  } catch (err) {
    console.error("[openCashRequests] PUT reject error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
