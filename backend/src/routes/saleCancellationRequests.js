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

// ─── GET /api/sale-cancellation-requests ─────────────────────────────────────
// List sale cancellation requests.
// Owners see all in their mart; managers/cashiers see only their own.

router.get("/", authenticate, requireAuth, async (req, res) => {
  try {
    const { martId, role, id: userId } = req.user;
    const { status, page = "1", limit = "20" } = req.query;

    const where = { martId };
    if (status) where.status = status;

    // Managers/cashiers only see their own requests
    if (role !== "owner") {
      where.requesterId = userId;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * pageSize;

    const [requests, total] = await Promise.all([
      prisma.saleCancellationRequest.findMany({
        where,
        include: {
          sale: { select: { id: true, receiptId: true, total: true, date: true } },
          requester: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.saleCancellationRequest.count({ where }),
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
    console.error("[saleCancellationRequests] GET error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ─── POST /api/sale-cancellation-requests ────────────────────────────────────
// Cashier or manager requests cancellation of a completed receipt.

router.post("/", authenticate, requireAuth, async (req, res) => {
  try {
    const { martId, id: requesterId, role } = req.user;
    const { saleId, reason } = req.body;

    if (!saleId) {
      return res.status(400).json({ message: "saleId is required" });
    }
    if (!reason || reason.trim().length < 3) {
      return res
        .status(400)
        .json({ message: "Reason is required (min 3 characters)" });
    }

    // Validate sale exists and belongs to same mart
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, martId },
    });
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }
    if (sale.status === "cancelled") {
      return res.status(400).json({ message: "Sale is already cancelled" });
    }

    // Check no pending request already exists for this sale
    const existingRequest = await prisma.saleCancellationRequest.findFirst({
      where: { saleId, status: "pending" },
    });
    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "A cancellation request is already pending" });
    }

    const request = await prisma.saleCancellationRequest.create({
      data: {
        martId,
        saleId,
        requesterId,
        reason: reason.trim(),
        status: "pending",
      },
      include: {
        sale: { select: { id: true, receiptId: true, total: true, date: true } },
        requester: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json(request);
  } catch (err) {
    console.error("[saleCancellationRequests] POST error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ─── PUT /api/sale-cancellation-requests/:id/approve ─────────────────────────
// Owner approves cancellation. Restores stock, marks sale cancelled.

router.put("/:id/approve", authenticate, requireAuth, async (req, res) => {
  try {
    const { id: approverId, role } = req.user;

    if (role !== "owner") {
      return res.status(403).json({
        message: "Only the owner can approve sale cancellations",
      });
    }

    const { id } = req.params;

    const existing = await prisma.saleCancellationRequest.findUnique({
      where: { id },
      include: { sale: { include: { items: true } } },
    });
    if (!existing) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (existing.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Request has already been decided" });
    }

    // Transaction: approve request, cancel sale, restore stock
    const [request] = await prisma.$transaction([
      prisma.saleCancellationRequest.update({
        where: { id },
        data: {
          status: "approved",
          approverId,
          decidedAt: new Date(),
        },
      }),
      prisma.sale.update({
        where: { id: existing.saleId },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: approverId,
        },
      }),
      // Restore quantities for each sold item
      ...existing.sale.items.map((item) =>
        item.productId
          ? prisma.product.update({
              where: { id: item.productId },
              data: {
                supermarketQuantity: {
                  increment: item.quantity || 0,
                },
              },
            })
          : Promise.resolve(),
      ),
    ]);

    return res.json(request);
  } catch (err) {
    console.error("[saleCancellationRequests] PUT approve error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ─── PUT /api/sale-cancellation-requests/:id/reject ──────────────────────────
// Owner rejects cancellation.

router.put("/:id/reject", authenticate, requireAuth, async (req, res) => {
  try {
    const { id: approverId, role } = req.user;

    if (role !== "owner") {
      return res.status(403).json({
        message: "Only the owner can reject sale cancellations",
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const existing = await prisma.saleCancellationRequest.findUnique({
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

    const request = await prisma.saleCancellationRequest.update({
      where: { id },
      data: {
        status: "rejected",
        approverId,
        decidedAt: new Date(),
      },
    });

    return res.json(request);
  } catch (err) {
    console.error("[saleCancellationRequests] PUT reject error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
