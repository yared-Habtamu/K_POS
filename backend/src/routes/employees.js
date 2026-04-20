const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

const User = require("../models/user.model");
const Mart = require("../models/mart.model");
const { authenticate } = require("../middleware/auth");

// Helper to accept human-friendly role strings and normalize to backend values
function normalizeRole(r) {
  if (!r) return null;
  const s = String(r).toLowerCase();
  if (s.includes("manager")) return "manager";
  if (s.includes("cashier")) return "cashier";
  if (
    s.replace(/[^a-z]/g, "").includes("storekeeper") ||
    (s.includes("store") && s.includes("keeper"))
  )
    return "storeKeeper";
  return null;
}

async function ensureUniqueMartRole({ martId, role, excludeUserId = null }) {
  if (!martId) return null;
  if (!["manager", "storeKeeper"].includes(String(role || ""))) return null;

  const query = {
    martId,
    role,
    isDeleted: { $ne: true },
  };
  if (excludeUserId) query._id = { $ne: excludeUserId };

  const existing = await User.findOne(query).select("_id name role").lean();
  if (existing) {
    return `${role} already exists for this mart`;
  }
  return null;
}

// List employees by mart (systemAdmin may provide martId)
router.get("/", authenticate, async (req, res) => {
  try {
    const { martId } = req.query;
    const requester = req.user;
    const filter = {};

    if (requester.role === "systemAdmin") {
      if (martId) filter.martId = martId;
    } else if (requester.role === "owner" || requester.role === "manager") {
      filter.martId = requester.martId;
    } else {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    // If manager requester, exclude owner role from results.
    // Keep manager users included so assignment dropdowns can target them.
    if (requester.role === "manager") {
      filter.role = { $nin: ["owner"] };
    }

    const users = await User.find(filter).select("-passwordHash -__v").lean();
    // Ensure active flag present for all users (default to true)
    const normalized = users.map((u) => ({
      ...u,
      active: u.active === undefined || u.active === null ? true : u.active,
    }));
    res.json(normalized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create employee (owner only)
router.post("/", authenticate, async (req, res) => {
  try {
    const requester = req.user;
    let { name, username, password, role, martId, phone, salary } = req.body;

    if (!name || !password || !role)
      return res.status(400).json({ message: "Missing required fields" });

    // normalize role from friendly label
    const normRole = normalizeRole(role);
    if (!normRole) return res.status(400).json({ message: "Invalid role" });

    const allowedRoles = ["manager", "cashier", "storeKeeper"];
    if (!allowedRoles.includes(normRole))
      return res.status(400).json({ message: "Invalid role" });

    // Only owners are allowed to create employees
    if (requester.role !== "owner")
      return res
        .status(403)
        .json({ message: "Only owner can create employees" });

    // Owners must have a mart assigned
    if (!requester.martId)
      return res
        .status(400)
        .json({ message: "Requester has no mart assigned" });

    // If username not provided, auto-generate a unique one
    if (!username || username.trim() === "") {
      const base = name.toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
      let candidate = base;
      let found = null;
      for (let i = 0; i < 10; i++) {
        const suffix = Math.floor(Math.random() * 9000) + 1000;
        const maybe = `${candidate}${suffix}`;
        const exists = await User.findOne({ username: maybe });
        if (!exists) {
          found = maybe;
          break;
        }
      }
      username = found || `${base}${Date.now().toString().slice(-4)}`;
    } else {
      const exists = await User.findOne({ username });
      if (exists)
        return res.status(409).json({ message: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const assignedMartId =
      requester.role === "systemAdmin" ? martId || null : requester.martId;

    const uniquenessError = await ensureUniqueMartRole({
      martId: assignedMartId,
      role: normRole,
    });
    if (uniquenessError)
      return res.status(409).json({ message: uniquenessError });

    const user = new User({
      name,
      username,
      passwordHash,
      role: normRole,
      martId: assignedMartId,
      phone,
      salary,
    });
    await user.save();

    res.status(201).json({
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        martId: user.martId,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update employee
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const requester = req.user;
    const target = await User.findById(id);
    if (!target) return res.status(404).json({ message: "User not found" });

    // Only systemAdmin or same mart owner/manager can update
    if (requester.role !== "systemAdmin") {
      if (
        !requester.martId ||
        String(requester.martId) !== String(target.martId)
      )
        return res.status(403).json({ message: "Insufficient permissions" });
    }

    const update = {};
    const allowed = ["name", "phone", "role", "salary", "permissions"];
    for (const k of allowed)
      if (req.body[k] !== undefined) update[k] = req.body[k];
    if (req.body.password)
      update.passwordHash = await bcrypt.hash(req.body.password, 10);

    // normalize role if provided
    if (update.role) {
      const nr = normalizeRole(update.role);
      if (!nr) return res.status(400).json({ message: "Invalid role" });
      update.role = nr;
    }

    const nextRole = update.role || target.role;
    const nextMartId = target.martId;
    const uniquenessError = await ensureUniqueMartRole({
      martId: nextMartId,
      role: nextRole,
      excludeUserId: target._id,
    });
    if (uniquenessError)
      return res.status(409).json({ message: uniquenessError });

    // managers cannot escalate roles
    if (requester.role === "manager" && update.role) {
      if (["manager", "owner", "systemAdmin"].includes(update.role))
        return res
          .status(403)
          .json({ message: "Manager cannot set this role" });
    }

    const updated = await User.findByIdAndUpdate(id, update, {
      new: true,
    }).select("-passwordHash -__v");
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete employee
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const requester = req.user;
    const target = await User.findById(id);
    if (!target) return res.status(404).json({ message: "User not found" });

    if (requester.role !== "systemAdmin") {
      if (
        !requester.martId ||
        String(requester.martId) !== String(target.martId)
      )
        return res.status(403).json({ message: "Insufficient permissions" });
      if (requester.role !== "owner")
        return res
          .status(403)
          .json({ message: "Only owners can delete employees" });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
