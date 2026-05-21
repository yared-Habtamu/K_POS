const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

const userRepository = require("../repositories/userRepository");
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
    isDeleted: false,
  };
  if (excludeUserId) {
    query.id = { not: excludeUserId };
  }

  const existing = await userRepository.findOne(query, { select: { id: true, name: true, role: true } });
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
    const filter = { isDeleted: false };

    if (requester.role === "systemAdmin") {
      if (martId) filter.martId = martId;
    } else if (requester.role === "owner" || requester.role === "manager") {
      filter.martId = requester.martId;
    } else {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    // If manager requester, exclude owner role from results.
    if (requester.role === "manager") {
      filter.role = { notIn: ["owner"] };
    }

    const users = await userRepository.findMany(filter);
    
    // Ensure active flag present for all users and passwordHash removed
    const normalized = users.map((u) => {
      const copy = { ...u };
      delete copy.passwordHash;
      copy.active = copy.active === undefined || copy.active === null ? true : copy.active;
      return copy;
    });
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
        const exists = await userRepository.findByUsername(maybe);
        if (!exists) {
          found = maybe;
          break;
        }
      }
      username = found || `${base}${Date.now().toString().slice(-4)}`;
    } else {
      const exists = await userRepository.findByUsername(username);
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

    const user = await userRepository.create({
      name,
      username,
      passwordHash,
      role: normRole,
      martId: assignedMartId,
      phone: phone || null,
      salary: salary ? Number(salary) : null,
      active: true,
      isDeleted: false,
    });

    res.status(201).json({
      user: {
        id: user.id,
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
    const target = await userRepository.findById(id);
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
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        if (k === "salary") {
          update[k] = req.body[k] !== null ? Number(req.body[k]) : null;
        } else {
          update[k] = req.body[k];
        }
      }
    }
    
    if (req.body.password) {
      update.passwordHash = await bcrypt.hash(req.body.password, 10);
    }

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
      excludeUserId: target.id,
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

    const updated = await userRepository.update(id, update);
    const copy = { ...updated };
    delete copy.passwordHash;
    res.json(copy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update open cash balance for a manager (owner/systemAdmin only)
router.put("/:id/open-cash", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const requester = req.user;
    const { amount, mode } = req.body || {};

    if (!id) return res.status(400).json({ message: "User id is required" });

    if (requester.role !== "systemAdmin" && requester.role !== "owner") {
      return res.status(403).json({ message: "Only owners can update open cash" });
    }

    const target = await userRepository.findById(id);
    if (!target) return res.status(404).json({ message: "User not found" });

    if (
      requester.role !== "systemAdmin" &&
      String(requester.martId) !== String(target.martId)
    ) {
      return res.status(403).json({ message: "Cannot update another mart" });
    }

    if (String(target.role || "").toLowerCase() !== "manager") {
      return res
        .status(400)
        .json({ message: "Open cash is only available for managers" });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount)) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const normalizedMode = String(mode || "add").toLowerCase();
    let updated;
    if (normalizedMode === "set") {
      updated = await userRepository.update(id, {
        openCashBalance: Math.max(0, parsedAmount)
      });
    } else {
      if (parsedAmount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
      }
      updated = await userRepository.update(id, {
        openCashBalance: {
          increment: parsedAmount
        }
      });
    }

    return res.json({
      userId: updated.id,
      openCashBalance: Number(updated.openCashBalance || 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete employee (soft delete to keep foreign keys intact)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const requester = req.user;
    const target = await userRepository.findById(id);
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

    await userRepository.softDelete(id);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
