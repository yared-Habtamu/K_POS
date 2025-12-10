const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

const Mart = require("../models/mart.model");
const User = require("../models/user.model");
const { authenticate } = require("../middleware/auth");

// Register a new mart and owner user
router.post("/register", async (req, res) => {
  try {
    const {
      martName,
      phone,
      email,
      country,
      region,
      city,
      address,
      receiptHeader,
      receiptMessage,
      shopLogoUrl,
      ownerName,
      ownerPhone,
      ownerUsername,
      ownerPassword,
      ownerConfirmPassword,
    } = req.body;

    // ownerUsername is required now — owner should provide username on registration
    if (
      !martName ||
      !ownerName ||
      !ownerPhone ||
      !ownerPassword ||
      !ownerUsername ||
      !ownerConfirmPassword
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (ownerPassword !== ownerConfirmPassword) {
      return res.status(400).json({ message: "Owner passwords do not match" });
    }

    // create owner user - generate username since owner doesn't enter one in the registration form
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(ownerPassword, salt);

    // sanitize helper
    const sanitize = (s) =>
      (s || "")
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 30);

    let username = "";
    if (ownerUsername) {
      // owner provided a username — sanitize and ensure uniqueness
      const proposed = sanitize(ownerUsername);
      if (!proposed)
        return res.status(400).json({ message: "Invalid owner username" });
      const existing = await User.findOne({ username: proposed });
      if (existing)
        return res.status(409).json({ message: "Username already exists" });
      username = proposed;
    } else {
      // fallback to generating username from owner's name, ensure uniqueness
      let baseUsername = sanitize(ownerName) || `owner${Date.now() % 10000}`;
      username = baseUsername;
      let suffix = 0;
      while (await User.findOne({ username })) {
        suffix += 1;
        username = `${baseUsername}${suffix}`;
        if (suffix > 50) {
          // fallback to a timestamp if collisions are unexpectedly high
          username = `${baseUsername}${Date.now() % 100000}`;
          break;
        }
      }
    }

    const owner = new User({
      name: ownerName,
      username,
      phone: ownerPhone,
      passwordHash,
      role: "owner",
    });
    await owner.save();

    const mart = new Mart({
      ownerId: owner._id,
      martName,
      phone,
      email,
      country,
      region,
      city,
      address,
      receiptHeader,
      receiptMessage,
      shopLogoUrl,
      status: "pending",
    });

    await mart.save();

    // update owner's martId
    owner.martId = mart._id;
    await owner.save();

    return res.status(201).json({ mart, owner });
  } catch (err) {
    console.error(err);
    // Better error responses for validation and duplicate key errors
    if (err && err.name === "ValidationError") {
      const details = Object.keys(err.errors || {}).reduce((acc, k) => {
        acc[k] = err.errors[k].message;
        return acc;
      }, {});
      return res.status(400).json({ message: "Validation error", details });
    }

    if (err && err.code === 11000) {
      // duplicate key
      return res
        .status(409)
        .json({ message: "Duplicate resource", key: err.keyValue });
    }

    res.status(500).json({ message: "Server error" });
  }
});

// List pending marts (for admin)
router.get("/pending", async (req, res) => {
  try {
    const list = await Mart.find({ status: "pending" }).populate(
      "ownerId",
      "name phone"
    );
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Approve a mart
router.put("/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const mart = await Mart.findByIdAndUpdate(
      id,
      { status: "approved" },
      { new: true }
    );
    if (!mart) return res.status(404).json({ message: "Mart not found" });
    res.json(mart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Disable a mart
router.put("/:id/disable", async (req, res) => {
  try {
    const { id } = req.params;
    const mart = await Mart.findByIdAndUpdate(
      id,
      { status: "disabled" },
      { new: true }
    );
    if (!mart) return res.status(404).json({ message: "Mart not found" });
    res.json(mart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get mart by id (with owner info)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const mart = await Mart.findById(id).populate("ownerId", "name phone");
    if (!mart) return res.status(404).json({ message: "Mart not found" });
    res.json(mart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update mart settings (owner or systemAdmin)
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    const allowed = [
      "currency",
      "paymentSystem",
      "paymentAccounts",
      "receiptHeader",
      "receiptMessage",
      "shopLogoUrl",
      "phone",
      "email",
      "address",
    ];
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, k))
        updates[k] = req.body[k];
    }

    // authorization: systemAdmin can update any mart. owner can update their own mart only.
    if (req.user.role !== "systemAdmin") {
      if (!req.user.martId || String(req.user.martId) !== String(id)) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions to update mart" });
      }
    }

    const mart = await Mart.findByIdAndUpdate(id, updates, { new: true });
    if (!mart) return res.status(404).json({ message: "Mart not found" });
    res.json(mart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// List marts (optional status filter)
router.get("/", async (req, res) => {
  try {
    const { status } = req.query; // optional: pending, approved, disabled, rejected
    const filter = {};
    if (status) filter.status = status;
    const list = await Mart.find(filter).populate("ownerId", "name phone");
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Reject a mart
router.put("/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const mart = await Mart.findByIdAndUpdate(
      id,
      { status: "rejected" },
      { new: true }
    );
    if (!mart) return res.status(404).json({ message: "Mart not found" });
    res.json(mart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
