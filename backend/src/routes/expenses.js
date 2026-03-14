const express = require("express");
const router = express.Router();
const Expense = require("../models/expense.model");
const { authenticate } = require("../middleware/auth");
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

// List expenses. Query: ?martId=... optional. Non-systemAdmin users limited to their mart.
router.get("/", authenticate, async (req, res) => {
  try {
    const { martId, createdByRole, createdBy, createdByName } = req.query;
    const filter = {};

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

    const list = await Expense.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .lean();
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

      const expense = new Expense({
        martId: targetMartId,
        category,
        description,
        name: name || undefined,
        reason: reason || undefined,
        amount: Number(amount),
        date: new Date(date),
        createdBy: req.user.id,
        createdByRole:
          req.user.role === "owner"
            ? "owner"
            : req.user.role === "manager"
              ? "manager"
              : "other",
        createdByName: req.user.name || undefined,
        paymentType: paymentType || undefined,
      });

      // attach uploaded files (if any) as accessible URLs
      try {
        if (
          req.files &&
          req.files.paymentScreenshot &&
          req.files.paymentScreenshot[0]
        ) {
          const f = req.files.paymentScreenshot[0];
          expense.paymentScreenshot = `${req.protocol}://${req.get("host")}/uploads/${f.filename}`;
        }
        if (
          req.files &&
          req.files.productPicture &&
          req.files.productPicture[0]
        ) {
          const f = req.files.productPicture[0];
          expense.productPicture = `${req.protocol}://${req.get("host")}/uploads/${f.filename}`;
        }
        if (
          req.files &&
          req.files.screenshots &&
          req.files.screenshots.length
        ) {
          expense.screenshots = req.files.screenshots.map(
            (f) => `${req.protocol}://${req.get("host")}/uploads/${f.filename}`,
          );
        }
      } catch (e) {
        console.warn("Failed to attach uploaded files", e);
      }

      await expense.save();
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

      const expense = await Expense.findById(id);
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

      // update allowed fields
      if (category !== undefined) expense.category = category;
      if (description !== undefined) expense.description = description;
      if (name !== undefined) expense.name = name;
      if (reason !== undefined) expense.reason = reason;
      if (amount !== undefined) expense.amount = Number(amount);
      if (date !== undefined) expense.date = new Date(date);
      if (paymentType !== undefined) expense.paymentType = paymentType;

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
          expense.paymentScreenshot = `${req.protocol}://${req.get("host")}/uploads/${f.filename}`;
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
          expense.productPicture = `${req.protocol}://${req.get("host")}/uploads/${f.filename}`;
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
          expense.screenshots = req.files.screenshots.map(
            (f) => `${req.protocol}://${req.get("host")}/uploads/${f.filename}`,
          );
        }
      } catch (e) {
        console.warn("Error handling uploaded files", e);
      }

      await expense.save();
      res.json(expense);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Delete expense
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findById(id);
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

    await Expense.findByIdAndDelete(id);
    res.json({ message: "Expense deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
