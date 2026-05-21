const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

const martRepository = require("../repositories/martRepository");
const userRepository = require("../repositories/userRepository");
const prisma = require("../repositories/prismaClient");
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
      userRepository.findOne({ name: { equals: normalizedOwnerName, mode: 'insensitive' } }),
      normalizedOwnerPhone ? userRepository.findOne({ phone: normalizedOwnerPhone }) : null,
      normalizedOwnerPhone ? martRepository.findOne({ phone: normalizedOwnerPhone }) : null,
      martRepository.findOne({ martName: { equals: normalizedMartName, mode: 'insensitive' } }),
      normalizedEmail ? martRepository.findOne({ email: { equals: normalizedEmail, mode: 'insensitive' } }) : null,
    ]);

    if (existingOwnerName) duplicateMessages.push("Owner Name already exists");
    if (existingPhoneInUsers || existingPhoneInMarts) duplicateMessages.push("Phone already exists");
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

      const existingUsername = await userRepository.findByUsername(proposed);
      if (existingUsername) duplicateMessages.push("Username already exists");

      username = proposed;
    } else {
      // fallback to generating username from owner's name, ensure uniqueness
      let baseUsername = sanitize(ownerName) || `owner${Date.now() % 10000}`;
      username = baseUsername;
      let suffix = 0;
      while (await userRepository.findByUsername(username)) {
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

    // Since mart and owner depend on each other, create owner first without martId,
    // then mart, then update owner.
    const owner = await userRepository.create({
      name: normalizedOwnerName,
      username,
      phone: normalizedOwnerPhone,
      passwordHash,
      role: "owner",
    });

    const parsedTaxRate = Number(taxRate);
    const mart = await martRepository.create({
      ownerId: owner.id,
      martName: normalizedMartName,
      phone: normalizedOwnerPhone,
      email: normalizedEmail || null,
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

    // update owner's martId
    await userRepository.update(owner.id, { martId: mart.id });
    owner.martId = mart.id;
    delete owner.passwordHash;

    // Return assigned username explicitly so clients can show it (useful if sanitized/altered)
    return res.status(201).json({ mart, owner, assignedUsername: username });
  } catch (err) {
    console.error(err);
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
      userRepository.findOne({ name: { equals: normalizedOwnerName, mode: 'insensitive' } }),
      userRepository.findByUsername(normalizedUsername),
      normalizedOwnerPhone ? userRepository.findOne({ phone: normalizedOwnerPhone }) : null,
      normalizedOwnerPhone ? martRepository.findOne({ phone: normalizedOwnerPhone }) : null,
      martRepository.findOne({ martName: { equals: normalizedMartName, mode: 'insensitive' } }),
      normalizedEmail ? martRepository.findOne({ email: { equals: normalizedEmail, mode: 'insensitive' } }) : null,
    ]);

    if (existingOwnerName) duplicateMessages.push("Owner Name already exists");
    if (existingUsername) duplicateMessages.push("Username already exists");
    if (existingPhoneInUsers || existingPhoneInMarts) duplicateMessages.push("Phone already exists");
    if (existingMartName) duplicateMessages.push("Mart Name already exists");
    if (existingEmail) duplicateMessages.push("Email already exists");

    if (duplicateMessages.length > 0) {
      return res.status(409).json({
        message: `Duplicate registration data found: ${duplicateMessages.join(", ")}. Please change and try again.`,
        duplicates: duplicateMessages,
      });
    }

    const passwordHash = await bcrypt.hash(ownerPassword, 10);

    const owner = await userRepository.create({
      name: normalizedOwnerName,
      username: normalizedUsername,
      phone: normalizedOwnerPhone,
      email: normalizedEmail || null,
      passwordHash,
      role: "owner",
    });

    const parsedTaxRate = Number(taxRate);
    const mart = await martRepository.create({
      ownerId: owner.id,
      martName: normalizedMartName,
      phone: normalizedOwnerPhone,
      email: normalizedEmail || null,
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

    await userRepository.update(owner.id, { martId: mart.id });
    owner.martId = mart.id;
    delete owner.passwordHash;

    return res.status(201).json({
      mart,
      owner,
      assignedUsername: normalizedUsername,
      message: "Mart created and approved successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// List pending marts (for admin)
router.get("/pending", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "systemAdmin")
      return res.status(403).json({ message: "Insufficient permissions" });
    const list = await martRepository.findMany(
      { status: "pending" }, 
      { 
        include: { owner: { select: { name: true, username: true, phone: true } } },
        orderBy: { createdAt: "desc" }
      }
    );
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
    const mart = await martRepository.update(id, { status: "approved" });
    if (!mart) return res.status(404).json({ message: "Mart not found" });

    // Ensure owner has martId set (in case owner existed before registration)
    try {
      if (mart.ownerId) {
        const owner = await userRepository.findById(mart.ownerId);
        if (
          owner &&
          (!owner.martId || String(owner.martId) !== String(mart.id))
        ) {
          await userRepository.update(owner.id, { martId: mart.id });
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
    const mart = await martRepository.update(id, { status: "disabled" });
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
    const mart = await martRepository.findById(id, { include: { owner: { select: { name: true, username: true, phone: true } } } });
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
      "globalDiscountType",
      "globalDiscountRate",
      "enableDiscountByItems",
      "enableDiscountByAmount",
      "discountMinItems",
      "discountMinAmount",
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

    const mart = await martRepository.update(id, updates);
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
    // By default exclude soft-deleted marts. Client can request deleted records
    // via `?includeDeleted=true` when intentional.
    if (req.query.includeDeleted !== "true") filter.isDeleted = false;
    
    const list = await martRepository.findMany(
      filter, 
      { 
        include: { owner: { select: { name: true, username: true, phone: true } } },
        orderBy: { createdAt: "desc" }
      }
    );
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Hard-delete a mart and its owner user (system admin only)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "systemAdmin")
      return res.status(403).json({ message: "Insufficient permissions" });

    const { id } = req.params;
    const mart = await martRepository.findById(id);
    if (!mart) return res.status(404).json({ message: "Mart not found" });

    try {
      // First, delete all related data based on martId
      const modelFiles = [
        "Asset", "AssetActionRequest", "Attendance", "Category", "Customer",
        "DailyReport", "Expense", "ExpenseActionRequest", "ExpenseCategory",
        "Notification", "PaymentType", "Product", "ProductAddRequest",
        "ProductEditRequest", "Sale", "StockTransferRequest", "User"
      ];
      
      await prisma.$transaction(async (tx) => {
         for (const modelName of modelFiles) {
            const clientProp = modelName.charAt(0).toLowerCase() + modelName.slice(1);
            if (tx[clientProp]) {
               await tx[clientProp].deleteMany({ where: { martId: mart.id } });
            }
         }
         await tx.mart.delete({ where: { id: mart.id } });
      });
      console.log(`Deleted all users and related records for mart ${mart.id}`);
      
    } catch (e) {
      console.error("Failed to delete related data during mart deletion", e);
      return res.status(500).json({ message: "Failed to delete related records" });
    }

    res.json({ message: "Mart permanently deleted" });
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
    const mart = await martRepository.update(id, { status: "rejected" });
    if (!mart) return res.status(404).json({ message: "Mart not found" });
    res.json(mart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
