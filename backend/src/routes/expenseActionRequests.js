const express = require("express");
const mongoose = require("mongoose");
const { authenticate } = require("../middleware/auth");
const ExpenseActionRequest = require("../models/expenseActionRequest.model");
const Expense = require("../models/expense.model");
const User = require("../models/user.model");
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
  return User.find({ martId, role: { $regex: /^owner$/i } })
    .select("_id name username")
    .lean();
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
        filter.$or = [{ approvalRole: "owner" }, { requesterId: user.id }];
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
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }

    const list = await ExpenseActionRequest.find(filter)
      .sort({ createdAt: -1 })
      .lean();

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

    const reqDoc = await ExpenseActionRequest.findById(id);
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

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let updatedRequester = null;
      if (reqDoc.requesterRole === "manager") {
        updatedRequester = await User.findOneAndUpdate(
          {
            _id: reqDoc.requesterId,
            martId: reqDoc.martId,
            openCashBalance: { $gte: amountNumber },
          },
          { $inc: { openCashBalance: -amountNumber } },
          { new: true, session },
        );

        if (!updatedRequester) {
          await session.abortTransaction();
          session.endSession();
          return res
            .status(400)
            .json({ message: "Insufficient open cash balance" });
        }
      }

      const expense = new Expense({
        martId: reqDoc.martId,
        category: payload.category || "miscellaneous",
        description: payload.description,
        name: payload.name || undefined,
        reason: payload.reason || undefined,
        amount: amountNumber,
        date: new Date(payload.date),
        createdBy: reqDoc.requesterId,
        createdByRole:
          reqDoc.requesterRole === "owner"
            ? "owner"
            : reqDoc.requesterRole === "manager"
              ? "manager"
              : "other",
        createdByName: reqDoc.requesterName || undefined,
        paymentType:
          reqDoc.requesterRole === "manager"
            ? "open_cash"
            : payload.paymentType || undefined,
        paymentScreenshot: payload.paymentScreenshot || undefined,
        productPicture: payload.productPicture || undefined,
        screenshots: Array.isArray(payload.screenshots)
          ? payload.screenshots
          : [],
      });
      await expense.save({ session });

      reqDoc.status = "approved";
      reqDoc.approverId = user.id;
      reqDoc.approverName = user.username || user.name;
      reqDoc.decidedAt = new Date();
      await reqDoc.save({ session });

      await createNotification(
        {
          martId: reqDoc.martId,
          userId: reqDoc.requesterId,
          type: "expense_action_result",
          title: "Expense request approved",
          message: "Your expense request was approved",
          metadata: {
            requestId: reqDoc._id,
            expenseId: expense._id,
            action: "create",
            result: "approved",
          },
        },
        session,
      );

      await session.commitTransaction();
      session.endSession();

      const responsePayload = { message: "Expense request approved", expense };
      if (updatedRequester) {
        responsePayload.openCashBalance = Number(
          updatedRequester.openCashBalance || 0,
        );
      }

      return res.json(responsePayload);
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
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

    const reqDoc = await ExpenseActionRequest.findById(id);
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

    reqDoc.status = "rejected";
    reqDoc.approverId = user.id;
    reqDoc.approverName = user.username || user.name;
    reqDoc.reason = reason || "";
    reqDoc.decidedAt = new Date();
    await reqDoc.save();

    await createNotification({
      martId: reqDoc.martId,
      userId: reqDoc.requesterId,
      type: "expense_action_result",
      title: "Expense request rejected",
      message: `Your expense request was rejected. ${reason || ""}`,
      metadata: {
        requestId: reqDoc._id,
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

    const reqDoc = new ExpenseActionRequest({
      martId: targetMartId,
      requesterId: user.id,
      requesterName: user.username || user.name,
      requesterRole: "manager",
      action: "create",
      approvalRole: "owner",
      payload: {
        category,
        description,
        amount: Number(amount),
        date,
        paymentType,
        name,
        reason,
        paymentScreenshot,
        productPicture,
        screenshots: Array.isArray(screenshots) ? screenshots : [],
      },
    });

    await reqDoc.save();

    await Promise.all(
      owners.map((owner) =>
        createNotification({
          martId: targetMartId,
          userId: owner._id,
          type: "expense_action_request",
          title: "Expense approval requested",
          message: `${reqDoc.requesterName || "Manager"} requested expense approval`,
          metadata: {
            requestId: reqDoc._id,
            action: "create",
            amount: Number(amount),
            description,
          },
        }),
      ),
    );

    return res.status(202).json({
      message: "Expense submitted for owner approval",
      requestId: reqDoc._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
