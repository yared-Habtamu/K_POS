const express = require("express");
const router = express.Router();
const expenseRepository = require("../repositories/expenseRepository");
const { expenseActionRequestRepository } = require("../repositories/requestRepositories");
const userRepository = require("../repositories/userRepository");
const { authenticate } = require("../middleware/auth");
const { createNotification } = require("../services/notification.service");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Upload directory: backend/uploads (served by index.js at /uploads)
const uploadDir = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

async function getMartOwners(martId) {
  if (!martId) return [];
  return userRepository.findMany({
    martId,
    role: "owner",
    isDeleted: false,
    active: true,
  });
}

// List expenses. Query: ?martId=... optional. Non-systemAdmin users limited to their mart.
router.get("/", authenticate, async (req, res) => {
  try {
    const { martId, createdByRole, createdBy, createdByName } = req.query;
    const filter = { isDeleted: false };

    if (req.user.role === "systemAdmin") {
      if (martId) filter.martId = martId;
    } else {
      // owners/managers/cashiers can only query their own mart
      filter.martId = req.user.martId;
      if (martId && String(martId) !== String(req.user.martId)) {
        return res
          .status(403)
          .json({ message: "Cannot list expenses for another mart" });
      }
    }

    if (
      createdByRole &&
      ["owner", "manager", "other"].includes(createdByRole)
    ) {
      filter.createdByRole = createdByRole;
    }

    if (createdBy) {
      filter.createdBy = createdBy;
    }

    if (createdByName) {
      filter.createdByName = createdByName;
    }

    const list = await expenseRepository.findMany(filter, {
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" }
      ]
    });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create expense (supports multipart/form-data file uploads)
router.post(
  "/",
  authenticate,
  upload.fields([
    { name: "paymentScreenshot", maxCount: 1 },
    { name: "productPicture", maxCount: 1 },
    { name: "screenshots", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const {
        category,
        description,
        amount,
        date,
        martId,
        paymentType,
        name,
        reason,
      } = req.body;
      // determine martId: systemAdmin may provide, others use their mart
      const targetMartId =
        req.user.role === "systemAdmin"
          ? martId || req.user.martId
          : req.user.martId;
      if (!targetMartId)
        return res.status(400).json({ message: "martId is required" });
      if (!description || amount == null || !date)
        return res.status(400).json({ message: "Missing required fields" });

      const createdByRole =
        req.user.role === "owner"
          ? "owner"
          : req.user.role === "manager"
            ? "manager"
            : "other";

      const attachmentPayload = {
        paymentScreenshot: null,
        productPicture: null,
        screenshots: [],
      };

      // Attach uploaded files (if any) as accessible URLs.
      try {
        if (
          req.files &&
          req.files.paymentScreenshot &&
          req.files.paymentScreenshot[0]
        ) {
          const f = req.files.paymentScreenshot[0];
          attachmentPayload.paymentScreenshot = `${req.protocol}://${req.get("host")}/uploads/${f.filename}`;
        }
        if (
          req.files &&
          req.files.productPicture &&
          req.files.productPicture[0]
        ) {
          const f = req.files.productPicture[0];
          attachmentPayload.productPicture = `${req.protocol}://${req.get("host")}/uploads/${f.filename}`;
        }
        if (
          req.files &&
          req.files.screenshots &&
          req.files.screenshots.length
        ) {
          attachmentPayload.screenshots = req.files.screenshots.map(
            (f) => `${req.protocol}://${req.get("host")}/uploads/${f.filename}`,
          );
        }
      } catch (e) {
        console.warn("Failed to attach uploaded files", e);
      }

      // Managers can only spend from Open Cash and it requires owner approval.
      if (req.user.role === "manager") {
        const amountNumber = Number(amount);
        if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
          return res.status(400).json({ message: "Invalid amount" });
        }
        const owners = await getMartOwners(targetMartId);
        if (!owners || owners.length === 0) {
          return res
            .status(400)
            .json({ message: "No owner found for this mart to approve" });
        }

        const reqDoc = await expenseActionRequestRepository.create({
          martId: targetMartId,
          requesterId: req.user.id,
          requesterName: req.user.username || req.user.name,
          requesterRole: "manager",
          action: "create",
          approvalRole: "owner",
          payload: {
            category: category || "miscellaneous",
            description,
            amount: amountNumber,
            date: new Date(date).toISOString(),
            paymentType: "open_cash",
            name: name || null,
            reason: reason || null,
            paymentScreenshot: attachmentPayload.paymentScreenshot,
            productPicture: attachmentPayload.productPicture,
            screenshots: attachmentPayload.screenshots || [],
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
                amount: amountNumber,
                description,
              },
            }),
          ),
        );

        return res.status(202).json({
          message: "Expense submitted for owner approval",
          requestId: reqDoc.id,
        });
      }

      const expense = await expenseRepository.create({
        martId: targetMartId,
        category: category || "miscellaneous",
        description,
        name: name || null,
        reason: reason || null,
        amount: Number(amount),
        date: new Date(date),
        createdBy: req.user.id,
        createdByRole,
        createdByName: req.user.name || null,
        paymentType: paymentType || null,
        paymentScreenshot: attachmentPayload.paymentScreenshot,
        productPicture: attachmentPayload.productPicture,
        screenshots: attachmentPayload.screenshots || [],
        isDeleted: false,
      });

      res.status(201).json(expense);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Update expense
router.put(
  "/:id",
  authenticate,
  upload.fields([
    { name: "paymentScreenshot", maxCount: 1 },
    { name: "productPicture", maxCount: 1 },
    { name: "screenshots", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { category, description, amount, date, paymentType, name, reason } =
        req.body;

      const expense = await expenseRepository.findById(id);
      if (!expense)
        return res.status(404).json({ message: "Expense not found" });

      // authorization: systemAdmin can edit any; others only within their mart
      if (req.user.role !== "systemAdmin") {
        if (
          !req.user.martId ||
          String(expense.martId) !== String(req.user.martId)
        ) {
          return res
            .status(403)
            .json({ message: "Insufficient permissions to update expense" });
        }
      }

      // Role restriction: only the mart owner (or systemAdmin) may edit expenses.
      const requesterRole = String(req.user.role || "").toLowerCase();
      if (requesterRole !== "owner" && requesterRole !== "systemadmin") {
        return res
          .status(403)
          .json({ message: "Only the mart owner can edit expenses" });
      }

      const updateData = {};
      if (category !== undefined) updateData.category = category;
      if (description !== undefined) updateData.description = description;
      if (name !== undefined) updateData.name = name;
      if (reason !== undefined) updateData.reason = reason;
      if (amount !== undefined) updateData.amount = Number(amount);
      if (date !== undefined) updateData.date = new Date(date);
      if (paymentType !== undefined) updateData.paymentType = paymentType;

      let updatedPaymentScreenshot = expense.paymentScreenshot;
      let updatedProductPicture = expense.productPicture;
      let updatedScreenshots = expense.screenshots;

      // handle uploaded files: replace existing and remove old file if present
      try {
        if (
          req.files &&
          req.files.paymentScreenshot &&
          req.files.paymentScreenshot[0]
        ) {
          const f = req.files.paymentScreenshot[0];
          // delete old file if stored locally
          if (expense.paymentScreenshot) {
            try {
              const oldName = path.basename(expense.paymentScreenshot);
              const oldPath = path.join(uploadDir, oldName);
              if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            } catch (e) {
              console.warn("Failed to delete old paymentScreenshot", e);
            }
          }
          updatedPaymentScreenshot = `${req.protocol}://${req.get("host")}/uploads/${f.filename}`;
        }
        if (
          req.files &&
          req.files.productPicture &&
          req.files.productPicture[0]
        ) {
          const f = req.files.productPicture[0];
          if (expense.productPicture) {
            try {
              const oldName = path.basename(expense.productPicture);
              const oldPath = path.join(uploadDir, oldName);
              if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            } catch (e) {
              console.warn("Failed to delete old productPicture", e);
            }
          }
          updatedProductPicture = `${req.protocol}://${req.get("host")}/uploads/${f.filename}`;
        }
        // handle screenshots array
        if (
          req.files &&
          req.files.screenshots &&
          req.files.screenshots.length
        ) {
          // delete old local screenshot files if any
          if (
            Array.isArray(expense.screenshots) &&
            expense.screenshots.length
          ) {
            for (const url of expense.screenshots) {
              try {
                const oldName = path.basename(url);
                const oldPath = path.join(uploadDir, oldName);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
              } catch (e) {
                console.warn("Failed to delete old screenshot file", e);
              }
            }
          }
          updatedScreenshots = req.files.screenshots.map(
            (f) => `${req.protocol}://${req.get("host")}/uploads/${f.filename}`,
          );
        }
      } catch (e) {
        console.warn("Error handling uploaded files", e);
      }

      updateData.paymentScreenshot = updatedPaymentScreenshot;
      updateData.productPicture = updatedProductPicture;
      updateData.screenshots = updatedScreenshots;

      const updatedExpense = await expenseRepository.update(id, updateData);
      res.json(updatedExpense);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Delete expense (soft delete to keep foreign keys intact)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await expenseRepository.findById(id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    // authorization: systemAdmin can delete any; others only within their mart
    if (req.user.role !== "systemAdmin") {
      if (
        !req.user.martId ||
        String(expense.martId) !== String(req.user.martId)
      ) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions to delete expense" });
      }
    }

    await expenseRepository.softDelete(id);
    res.json({ message: "Expense deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
