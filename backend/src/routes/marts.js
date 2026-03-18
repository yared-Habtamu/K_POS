const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

const Mart = require("../models/mart.model");
const User = require("../models/user.model");
const { authenticate } = require("../middleware/auth");

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
      taxRate,
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

    const normalizedOwnerName = ownerName.trim();
    const normalizedOwnerPhone = (ownerPhone || phone || "").trim();
    const normalizedMartName = martName.trim();
    const normalizedEmail = (email || "").trim();

    const duplicateMessages = [];

    const [
      existingOwnerName,
      existingPhoneInUsers,
      existingPhoneInMarts,
      existingMartName,
      existingEmail,
    ] = await Promise.all([
      User.findOne({
        name: {
          $regex: `^${escapeRegex(normalizedOwnerName)}$`,
          $options: "i",
        },
      }).lean(),
      normalizedOwnerPhone
        ? User.findOne({ phone: normalizedOwnerPhone }).lean()
        : null,
      normalizedOwnerPhone
        ? Mart.findOne({ phone: normalizedOwnerPhone }).lean()
        : null,
      Mart.findOne({
        martName: {
          $regex: `^${escapeRegex(normalizedMartName)}$`,
          $options: "i",
        },
      }).lean(),
      normalizedEmail
        ? Mart.findOne({
            email: {
              $regex: `^${escapeRegex(normalizedEmail)}$`,
              $options: "i",
            },
          }).lean()
        : null,
    ]);

    if (existingOwnerName) duplicateMessages.push("Owner Name already exists");
    if (existingPhoneInUsers || existingPhoneInMarts)
      duplicateMessages.push("Phone already exists");
    if (existingMartName) duplicateMessages.push("Mart Name already exists");
    if (existingEmail) duplicateMessages.push("Email already exists");

    // create owner user
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
      // owner provided a username — sanitize and reject duplicates
      const proposed = sanitize(ownerUsername);
      if (!proposed)
        return res.status(400).json({ message: "Invalid owner username" });

      const existingUsername = await User.findOne({
        username: proposed,
      }).lean();
      if (existingUsername) duplicateMessages.push("Username already exists");

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

    if (duplicateMessages.length > 0) {
      return res.status(409).json({
        message: `Duplicate registration data found: ${duplicateMessages.join(", ")}. Please change and try again.`,
        duplicates: duplicateMessages,
      });
    }

    const owner = new User({
      name: normalizedOwnerName,
      username,
      phone: normalizedOwnerPhone,
      passwordHash,
      role: "owner",
    });
    await owner.save();

    const parsedTaxRate = Number(taxRate);
    const mart = new Mart({
      ownerId: owner._id,
      martName: normalizedMartName,
      phone: normalizedOwnerPhone,
      email: normalizedEmail,
      country,
      region,
      city,
      address,
      receiptHeader,
      receiptMessage,
      shopLogoUrl,
      taxRate: Number.isFinite(parsedTaxRate) ? parsedTaxRate : 0,
      customPaymentFields: Array.isArray(req.body.customPaymentFields)
        ? req.body.customPaymentFields
        : [],
      status: "pending",
    });

    await mart.save();

    // update owner's martId
    owner.martId = mart._id;
    await owner.save();

    // Return assigned username explicitly so clients can show it (useful if sanitized/altered)
    return res.status(201).json({ mart, owner, assignedUsername: username });
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

// System admin direct registration: create mart + owner as approved (no approval step)
router.post("/admin-register", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "systemAdmin") {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

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
      taxRate,
      ownerName,
      ownerPhone,
      ownerUsername,
      ownerPassword,
      ownerConfirmPassword,
    } = req.body || {};

    if (
      !martName ||
      !ownerName ||
      !ownerUsername ||
      !ownerPassword ||
      !ownerConfirmPassword
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (ownerPassword !== ownerConfirmPassword) {
      return res.status(400).json({ message: "Owner passwords do not match" });
    }

    const normalizedOwnerName = String(ownerName).trim();
    const normalizedOwnerPhone = String(ownerPhone || phone || "").trim();
    const normalizedMartName = String(martName).trim();
    const normalizedEmail = String(email || "").trim();

    const sanitize = (s) =>
      (s || "")
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 30);

    const normalizedUsername = sanitize(ownerUsername);
    if (!normalizedUsername) {
      return res.status(400).json({ message: "Invalid owner username" });
    }

    const duplicateMessages = [];
    const [
      existingOwnerName,
      existingUsername,
      existingPhoneInUsers,
      existingPhoneInMarts,
      existingMartName,
      existingEmail,
    ] = await Promise.all([
      User.findOne({
        name: {
          $regex: `^${escapeRegex(normalizedOwnerName)}$`,
          $options: "i",
        },
      }).lean(),
      User.findOne({ username: normalizedUsername }).lean(),
      normalizedOwnerPhone
        ? User.findOne({ phone: normalizedOwnerPhone }).lean()
        : null,
      normalizedOwnerPhone
        ? Mart.findOne({ phone: normalizedOwnerPhone }).lean()
        : null,
      Mart.findOne({
        martName: {
          $regex: `^${escapeRegex(normalizedMartName)}$`,
          $options: "i",
        },
      }).lean(),
      normalizedEmail
        ? Mart.findOne({
            email: {
              $regex: `^${escapeRegex(normalizedEmail)}$`,
              $options: "i",
            },
          }).lean()
        : null,
    ]);

    if (existingOwnerName) duplicateMessages.push("Owner Name already exists");
    if (existingUsername) duplicateMessages.push("Username already exists");
    if (existingPhoneInUsers || existingPhoneInMarts)
      duplicateMessages.push("Phone already exists");
    if (existingMartName) duplicateMessages.push("Mart Name already exists");
    if (existingEmail) duplicateMessages.push("Email already exists");

    if (duplicateMessages.length > 0) {
      return res.status(409).json({
        message: `Duplicate registration data found: ${duplicateMessages.join(", ")}. Please change and try again.`,
        duplicates: duplicateMessages,
      });
    }

    const passwordHash = await bcrypt.hash(ownerPassword, 10);

    const owner = new User({
      name: normalizedOwnerName,
      username: normalizedUsername,
      phone: normalizedOwnerPhone,
      email: normalizedEmail || undefined,
      passwordHash,
      role: "owner",
    });
    await owner.save();

    const parsedTaxRate = Number(taxRate);
    const mart = new Mart({
      ownerId: owner._id,
      martName: normalizedMartName,
      phone: normalizedOwnerPhone,
      email: normalizedEmail,
      country,
      region,
      city,
      address,
      receiptHeader,
      receiptMessage,
      shopLogoUrl,
      taxRate: Number.isFinite(parsedTaxRate) ? parsedTaxRate : 0,
      customPaymentFields: Array.isArray(req.body.customPaymentFields)
        ? req.body.customPaymentFields
        : [],
      status: "approved",
    });
    await mart.save();

    owner.martId = mart._id;
    await owner.save();

    return res.status(201).json({
      mart,
      owner,
      assignedUsername: normalizedUsername,
      message: "Mart created and approved successfully",
    });
  } catch (err) {
    console.error(err);
    if (err && err.name === "ValidationError") {
      const details = Object.keys(err.errors || {}).reduce((acc, k) => {
        acc[k] = err.errors[k].message;
        return acc;
      }, {});
      return res.status(400).json({ message: "Validation error", details });
    }
    if (err && err.code === 11000) {
      return res
        .status(409)
        .json({ message: "Duplicate resource", key: err.keyValue });
    }
    return res.status(500).json({ message: "Server error" });
  }
});

// List pending marts (for admin)
router.get("/pending", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "systemAdmin")
      return res.status(403).json({ message: "Insufficient permissions" });
    const list = await Mart.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .populate("ownerId", "name username phone");
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Approve a mart
router.put("/:id/approve", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "systemAdmin")
      return res.status(403).json({ message: "Insufficient permissions" });

    const { id } = req.params;
    const mart = await Mart.findByIdAndUpdate(
      id,
      { status: "approved" },
      { new: true },
    );
    if (!mart) return res.status(404).json({ message: "Mart not found" });

    // Ensure owner has martId set (in case owner existed before registration)
    try {
      if (mart.ownerId) {
        const owner = await User.findById(mart.ownerId);
        if (
          owner &&
          (!owner.martId || String(owner.martId) !== String(mart._id))
        ) {
          owner.martId = mart._id;
          await owner.save();
          console.log("Assigned mart to owner after approval", owner.username);
        }
      }
    } catch (e) {
      console.error("Failed to assign mart to owner after approval", e);
    }

    res.json(mart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Disable a mart
router.put("/:id/disable", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "systemAdmin")
      return res.status(403).json({ message: "Insufficient permissions" });
    const { id } = req.params;
    const mart = await Mart.findByIdAndUpdate(
      id,
      { status: "disabled" },
      { new: true },
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
    const mart = await Mart.findById(id).populate(
      "ownerId",
      "name username phone",
    );
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
      "martName",
      "currency",
      "paymentSystem",
      "paymentAccounts",
      "customPaymentFields",
      "taxRate",
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
    const list = await Mart.find(filter)
      .sort({ createdAt: -1 })
      .populate("ownerId", "name username phone");
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Reject a mart
router.put("/:id/reject", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "systemAdmin")
      return res.status(403).json({ message: "Insufficient permissions" });

    const { id } = req.params;
    const mart = await Mart.findByIdAndUpdate(
      id,
      { status: "rejected" },
      { new: true },
    );
    if (!mart) return res.status(404).json({ message: "Mart not found" });
    res.json(mart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

module.exports = router;
