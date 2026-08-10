const express = require("express");
const router = express.Router();
const prisma = require("../repositories/prismaClient");
const userRepository = require("../repositories/userRepository");
const { authenticate } = require("../middleware/auth");
const { createNotification } = require("../services/notification.service");

async function getMartOwners(martId) {
  if (!martId) return [];
  return userRepository.findMany({
    martId,
    role: "owner",
    isDeleted: false,
  });
}

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function cancelSaleStock(tx, sale) {
  const items = Array.isArray(sale.items) ? sale.items : [];
  for (const item of items) {
    if (!item.productId) continue;
    await tx.product.update({
      where: { id: item.productId },
      data: {
        supermarketQuantity: {
          increment: item.quantity || 0,
        },
        quantity: {
          increment: item.quantity || 0,
        },
      },
    });
  }
}

// ─── POST /api/sale-cancellation-requests/direct ─────────────────────────────
// Owner cancels one of their OWN completed sales directly - no approval needed.

router.post("/direct", authenticate, requireAuth, async (req, res) => {
  try {
    const { martId, id: actorId, role } = req.user;
    const { saleId, reason } = req.body;

    if (role !== "owner" && role !== "systemAdmin") {
      return res.status(403).json({
        message: "Only the owner can cancel sales directly",
      });
    }

    if (!saleId) {
      return res.status(400).json({ message: "saleId is required" });
    }
    if (!reason || reason.trim().length < 3) {
      return res
        .status(400)
        .json({ message: "Reason is required (min 3 characters)" });
    }

    // Validate sale exists, belongs to same mart, and is completed
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, martId },
      include: { items: true },
    });
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }
    if (sale.status !== "completed") {
      return res.status(400).json({
        message: "Only completed sales can be cancelled",
      });
    }
    // Only sales the owner made themselves can be cancelled without approval.
    if (sale.cashierId !== actorId) {
      return res.status(403).json({
        message:
          "You can only directly cancel sales you made. Other sales go through a cancellation request.",
      });
    }

    // Audit trail: reuse an existing request record if present, otherwise create
    // an already-approved one so the cancellation shows up in the request list.
    const existing = await prisma.saleCancellationRequest.findUnique({
      where: { saleId },
    });

    const request = await prisma.$transaction(async (tx) => {
      const decidedData = {
        status: "approved",
        approverId: actorId,
        decidedAt: new Date(),
      };

      const requestRecord = existing
        ? await tx.saleCancellationRequest.update({
            where: { id: existing.id },
            data: {
              ...decidedData,
              requesterId: actorId,
              reason: reason.trim(),
            },
          })
        : await tx.saleCancellationRequest.create({
            data: {
              martId,
              saleId,
              requesterId: actorId,
              reason: reason.trim(),
              ...decidedData,
            },
          });

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: actorId,
        },
      });

      await cancelSaleStock(tx, sale);

      return requestRecord;
    });

    return res.json(request);
  } catch (err) {
    console.error("[saleCancellationRequests] direct cancel error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ─── POST /api/sale-cancellation-requests ────────────────────────────────────
// Cashier or manager requests cancellation of a completed receipt.

router.post("/", authenticate, requireAuth, async (req, res) => {
  try {
    const { martId, id: requesterId, role } = req.user;
    const { saleId, reason } = req.body;

    // Only cashiers and managers can request cancellations
    if (role !== "cashier" && role !== "manager") {
      return res.status(403).json({
        message: "Only cashiers and managers can request sale cancellations",
      });
    }

    if (!saleId) {
      return res.status(400).json({ message: "saleId is required" });
    }
    if (!reason || reason.trim().length < 3) {
      return res
        .status(400)
        .json({ message: "Reason is required (min 3 characters)" });
    }

    // Validate sale exists, belongs to same mart, and is completed
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, martId },
    });
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }
    if (sale.status !== "completed") {
      return res.status(400).json({
        message: "Only completed sales can be cancelled",
      });
    }
    // Cashiers may only request cancellation of their own sales
    if (role === "cashier" && sale.cashierId !== requesterId) {
      return res
        .status(403)
        .json({ message: "You can only cancel your own sales" });
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

    // Notify the mart owners that a cancellation request awaits approval
    const owners = await getMartOwners(martId);
    await Promise.all(
      owners.map((owner) =>
        createNotification({
          martId,
          userId: owner.id,
          type: "sale_cancellation_request",
          title: "Sale cancellation requested",
          message: `A sale cancellation request is awaiting approval`,
          metadata: { requestId: request.id, saleId: request.saleId },
        }),
      ),
    );

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
      // Restore quantities for each sold item (mirror the deduction on sale)
      ...existing.sale.items.map((item) =>
        item.productId
          ? prisma.product.update({
              where: { id: item.productId },
              data: {
                supermarketQuantity: {
                  increment: item.quantity || 0,
                },
                quantity: {
                  increment: item.quantity || 0,
                },
              },
            })
          : Promise.resolve(),
      ),
    ]);

    // Notify the requester that their request was approved
    if (existing.requesterId) {
      await createNotification({
        martId: existing.martId,
        userId: existing.requesterId,
        type: "sale_cancellation_request",
        title: "Sale cancellation approved",
        message: "Your sale cancellation request was approved",
        metadata: { requestId: id, saleId: existing.saleId },
      });
    }

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

    // Notify the requester that their request was rejected
    if (existing.requesterId) {
      await createNotification({
        martId: existing.martId,
        userId: existing.requesterId,
        type: "sale_cancellation_request",
        title: "Sale cancellation rejected",
        message: "Your sale cancellation request was rejected",
        metadata: { requestId: id, saleId: existing.saleId },
      });
    }

    return res.json(request);
  } catch (err) {
    console.error("[saleCancellationRequests] PUT reject error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
