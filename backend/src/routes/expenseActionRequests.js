const express = require("express");
const prisma = require("../repositories/prismaClient");
const { authenticate } = require("../middleware/auth");
const { expenseActionRequestRepository } = require("../repositories/requestRepositories");
const userRepository = require("../repositories/userRepository");
const { createNotification } = require("../services/notification.service");

const router = express.Router();

function normalizeRole(user) {
  return String(user?.role || "").toLowerCase();
}

function isOwner(user) {
  return normalizeRole(user) === "owner";
}

function isManager(user) {
  return normalizeRole(user) === "manager";
}

function isSystemAdmin(user) {
  return normalizeRole(user) === "systemadmin";
}

async function getMartOwners(martId) {
  if (!martId) return [];
  return userRepository.findMany({
    martId,
    role: "owner",
    isDeleted: false,
  });
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

      if (isOwner(user)) {
        filter.OR = [{ approvalRole: "owner" }, { requesterId: user.id }];
      } else if (isManager(user)) {
        filter.requesterId = user.id;
      } else {
        return res
          .status(403)
          .json({
            message: "Only owners and managers can view expense requests",
          });
      }
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        filter.createdAt.lte = d;
      }
    }

    const list = await expenseActionRequestRepository.findMany(filter, {
      orderBy: { createdAt: "desc" }
    });

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

    const reqDoc = await expenseActionRequestRepository.findById(id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    if (reqDoc.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    const canApprove = isSystemAdmin(user) || isOwner(user);
    if (!canApprove) {
      return res
        .status(403)
        .json({ message: "Only owners can approve this request" });
    }

    if (!isSystemAdmin(user) && String(reqDoc.martId) !== String(user.martId)) {
      return res
        .status(403)
        .json({ message: "Cannot approve request for another mart" });
    }

    const payload = reqDoc.payload || {};
    if (!payload.description || payload.amount == null || !payload.date) {
      return res
        .status(400)
        .json({ message: "Request payload missing required expense fields" });
    }

    const amountNumber = Number(payload.amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({ message: "Invalid expense amount" });
    }

    try {
      const responsePayload = await prisma.$transaction(async (tx) => {
        let updatedRequester = null;
        if (reqDoc.requesterRole === "manager") {
          const reqUser = await tx.user.findUnique({
            where: { id: reqDoc.requesterId }
          });
          if (!reqUser || reqUser.martId !== reqDoc.martId || reqUser.openCashBalance < amountNumber) {
            throw new Error("Insufficient open cash balance");
          }

          updatedRequester = await tx.user.update({
            where: { id: reqDoc.requesterId },
            data: {
              openCashBalance: {
                decrement: amountNumber
              }
            }
          });
        }

        const expense = await tx.expense.create({
          data: {
            martId: reqDoc.martId,
            category: payload.category || "miscellaneous",
            description: payload.description,
            name: payload.name || null,
            reason: payload.reason || null,
            amount: amountNumber,
            date: new Date(payload.date),
            createdBy: reqDoc.requesterId,
            createdByRole:
              reqDoc.requesterRole === "owner"
                ? "owner"
                : reqDoc.requesterRole === "manager"
                  ? "manager"
                  : "other",
            createdByName: reqDoc.requesterName || null,
            paymentType:
              reqDoc.requesterRole === "manager"
                ? "open_cash"
                : payload.paymentType || null,
            paymentScreenshot: payload.paymentScreenshot || null,
            productPicture: payload.productPicture || null,
            screenshots: Array.isArray(payload.screenshots)
              ? payload.screenshots
              : [],
            isDeleted: false,
          }
        });

        await tx.expenseActionRequest.update({
          where: { id: reqDoc.id },
          data: {
            status: "approved",
            approverId: user.id,
            approverName: user.username || user.name,
            decidedAt: new Date(),
          }
        });

        await createNotification(
          {
            martId: reqDoc.martId,
            userId: reqDoc.requesterId,
            type: "expense_action_result",
            title: "Expense request approved",
            message: "Your expense request was approved",
            metadata: {
              requestId: reqDoc.id,
              expenseId: expense.id,
              action: "create",
              result: "approved",
            },
          },
          tx,
        );

        const resObj = { message: "Expense request approved", expense };
        if (updatedRequester) {
          resObj.openCashBalance = Number(updatedRequester.openCashBalance || 0);
        }
        return resObj;
      });

      return res.json(responsePayload);
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

    const reqDoc = await expenseActionRequestRepository.findById(id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    if (reqDoc.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    const canReject = isSystemAdmin(user) || isOwner(user);
    if (!canReject) {
      return res
        .status(403)
        .json({ message: "Only owners can reject this request" });
    }

    if (!isSystemAdmin(user) && String(reqDoc.martId) !== String(user.martId)) {
      return res
        .status(403)
        .json({ message: "Cannot reject request for another mart" });
    }

    const updated = await expenseActionRequestRepository.update(id, {
      status: "rejected",
      approverId: user.id,
      approverName: user.username || user.name,
      reason: reason || "",
      decidedAt: new Date(),
    });

    await createNotification({
      martId: reqDoc.martId,
      userId: reqDoc.requesterId,
      type: "expense_action_result",
      title: "Expense request rejected",
      message: `Your expense request was rejected. ${reason || ""}`,
      metadata: {
        requestId: reqDoc.id,
        action: "create",
        result: "rejected",
      },
    });

    res.json({ message: "Expense request rejected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/request", authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!isManager(user)) {
      return res
        .status(403)
        .json({
          message: "Only managers can submit expense approval requests",
        });
    }

    const {
      category,
      description,
      amount,
      date,
      martId,
      paymentType,
      name,
      reason,
      paymentScreenshot,
      productPicture,
      screenshots,
    } = req.body || {};

    const targetMartId = user.martId || martId;
    if (!targetMartId) {
      return res.status(400).json({ message: "martId is required" });
    }

    if (!description || amount == null || !date) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const owners = await getMartOwners(targetMartId);
    if (!owners || owners.length === 0) {
      return res
        .status(400)
        .json({
          message: "No owner found for this mart to approve the expense",
        });
    }

    const reqDoc = await expenseActionRequestRepository.create({
      martId: targetMartId,
      requesterId: user.id,
      requesterName: user.username || user.name,
      requesterRole: "manager",
      action: "create",
      approvalRole: "owner",
      payload: {
        category: category || "miscellaneous",
        description,
        amount: Number(amount),
        date: new Date(date).toISOString(),
        paymentType: paymentType || "open_cash",
        name: name || null,
        reason: reason || null,
        paymentScreenshot: paymentScreenshot || null,
        productPicture: productPicture || null,
        screenshots: Array.isArray(screenshots) ? screenshots : [],
      },
    });

    await Promise.all(
      owners.map((owner) =>
        createNotification({
          martId: targetMartId,
          userId: owner.id,
          type: "expense_action_request",
          title: "Expense approval requested",
          message: `${reqDoc.requesterName || "Manager"} requested expense approval`,
          metadata: {
            requestId: reqDoc.id,
            action: "create",
            amount: Number(amount),
            description,
          },
        }),
      ),
    );

    return res.status(202).json({
      message: "Expense submitted for owner approval",
      requestId: reqDoc.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
