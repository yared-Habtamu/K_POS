const express = require("express");
const router = express.Router();
const prisma = require("../repositories/prismaClient");
const { authenticate } = require("../middleware/auth");

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

// ─── GET /api/open-cash-requests ─────────────────────────────────────────────
// List open cash requests for the current user's mart.
// Owners/managers see all; cashiers see only their own.

router.get("/", authenticate, requireAuth, async (req, res) => {
  try {
    const { martId, role, id: userId } = req.user;
    const { status, managerId, page = "1", limit = "20" } = req.query;

    const where = { martId };
    if (status) where.status = status;
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
        include: {
          manager: { select: { id: true, name: true } },
          requester: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.openCashRequest.count({ where }),
    ]);

    return res.json({
      data: requests,
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

// ─── POST /api/open-cash-requests ────────────────────────────────────────────
// Create an open cash request (allocation or return).
// Owner/Manager requests -> owner approves (if requester is manager)
// Cashier/Manager requests -> manager approves (if requester is cashier)

router.post(
  "/",
  authenticate,
  requireAuth,
  requireOwnerOrManager,
  async (req, res) => {
    try {
      const { martId, id: requesterId, role } = req.user;
      const { direction, amount, receiptUrl, managerId } = req.body;

      if (!direction || !["allocation", "return"].includes(direction)) {
        return res
          .status(400)
          .json({ message: "Direction must be 'allocation' or 'return'" });
      }
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Amount must be positive" });
      }
      if (!receiptUrl) {
        return res.status(400).json({ message: "Receipt image is required" });
      }
      if (!managerId) {
        return res.status(400).json({ message: "managerId is required" });
      }

      // Validate manager belongs to same mart
      const manager = await prisma.user.findFirst({
        where: { id: managerId, martId, isDeleted: false },
      });
      if (!manager) {
        return res
          .status(404)
          .json({ message: "Manager not found in this mart" });
      }

      const request = await prisma.openCashRequest.create({
        data: {
          martId,
          managerId,
          requesterId,
          direction,
          amount: parseFloat(amount),
          receiptUrl,
          status: "pending",
        },
        include: {
          manager: { select: { id: true, name: true } },
          requester: { select: { id: true, name: true } },
        },
      });

      return res.status(201).json(request);
    } catch (err) {
      console.error("[openCashRequests] POST error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
);

// ─── PUT /api/open-cash-requests/:id/approve ─────────────────────────────────
// Approve an open cash request. Only the owner can approve.

router.put(
  "/:id/approve",
  authenticate,
  requireAuth,
  async (req, res) => {
    try {
      const { id: approverId, role } = req.user;

      if (role !== "owner") {
        return res
          .status(403)
          .json({ message: "Only the owner can approve open cash requests" });
      }

      const { id } = req.params;
      const { reason } = req.body;

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

      const [request] = await prisma.$transaction([
        prisma.openCashRequest.update({
          where: { id },
          data: {
            status: "approved",
            approverId,
            reason: reason || null,
            decidedAt: new Date(),
          },
        }),
        // Update the manager's openCashBalance
        prisma.user.update({
          where: { id: existing.managerId },
          data: {
            openCashBalance:
              existing.direction === "allocation"
                ? { increment: existing.amount }
                : { decrement: existing.amount },
          },
        }),
      ]);

      return res.json(request);
    } catch (err) {
      console.error("[openCashRequests] PUT approve error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
);

// ─── PUT /api/open-cash-requests/:id/reject ──────────────────────────────────
// Reject an open cash request. Only the owner can reject.

router.put(
  "/:id/reject",
  authenticate,
  requireAuth,
  async (req, res) => {
    try {
      const { id: approverId, role } = req.user;

      if (role !== "owner") {
        return res
          .status(403)
          .json({ message: "Only the owner can reject open cash requests" });
      }

      const { id } = req.params;
      const { reason } = req.body;

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

      const request = await prisma.openCashRequest.update({
        where: { id },
        data: {
          status: "rejected",
          approverId,
          reason: reason || null,
          decidedAt: new Date(),
        },
      });

      return res.json(request);
    } catch (err) {
      console.error("[openCashRequests] PUT reject error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
);

// ─── GET /api/open-cash-requests/transactions ────────────────────────────────
// Transaction report for owner/manager: amount, direction, receipt,
// requester, approver, status, date.

router.get(
  "/transactions",
  authenticate,
  requireAuth,
  requireOwnerOrManager,
  async (req, res) => {
    try {
      const { martId } = req.user;
      const { status, direction, startDate, endDate } = req.query;

      const where = { martId };
      if (status) where.status = status;
      if (direction) where.direction = direction;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const requests = await prisma.openCashRequest.findMany({
        where,
        include: {
          manager: { select: { id: true, name: true } },
          requester: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({ data: requests });
    } catch (err) {
      console.error("[openCashRequests] GET transactions error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
);

module.exports = router;
