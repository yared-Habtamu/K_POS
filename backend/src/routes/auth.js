const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");
const martRepository = require("../repositories/martRepository");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  runSubscriptionCheckForMart,
} = require("../services/subscription.service");

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

async function ensureUniqueMartRole({ martId, role, excludeUserId = null }) {
  if (!martId) return null;
  if (!["manager", "storeKeeper"].includes(String(role || ""))) return null;

  const query = {
    martId,
    role,
    isDeleted: false,
  };
  if (excludeUserId) query.id = { not: excludeUserId };

  const existing = await userRepository.findOne(query, { select: { id: true, name: true, role: true } });
  if (existing) {
    return `${role} already exists for this mart`;
  }

  return null;
}

// Login endpoint
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "Username and password required" });

  // Normalize helper to match system-admin username sanitization
  const sanitize = (s = "") =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 30);

  // Allow users to sign in using either their username (raw or sanitized) or phone number
  const sanitizedUsername = sanitize(username);
  const user = await userRepository.findOne({
    OR: [{ username }, { username: sanitizedUsername }, { phone: username }],
  });
  if (!user) {
    console.warn(`Login failed: user not found for '${username}'`);
    return res.status(401).json({ message: "Invalid username or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash || "");
  if (!valid) {
    console.warn(
      `Login failed: wrong password for user '${username}' (id=${user.id})`,
    );
    return res.status(401).json({ message: "Invalid username or password" });
  }

  // Block login for deleted or deactivated users
  if (user.isDeleted || user.active === false) {
    console.info(`Login blocked: user is deleted or inactive (id=${user.id})`);
    return res.status(401).json({ message: "Invalid username or password" });
  }

  // Users tied to a mart may only login if their mart is approved and active
  if (user.role !== "systemAdmin") {
    if (!user.martId) {
      console.warn(`Login blocked: no martId for user id=${user.id}`);
      return res.status(401).json({ message: "Invalid username or password" });
    }
    // include isDeleted flag so deleted marts cannot be used to login
    const mart = await martRepository.findById(user.martId, { select: { status: true, isDeleted: true }});
    if (!mart) {
      console.warn(`Login blocked: mart not found for martId=${user.martId}`);
      return res.status(401).json({ message: "Invalid username or password" });
    }
    if (mart.isDeleted) {
      console.info(`Login blocked: mart is deleted for martId=${user.martId}`);
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Re-evaluate subscription status before allowing access.
    try {
      await runSubscriptionCheckForMart(user.martId, { persist: true });
    } catch (subscriptionErr) {
      console.error(
        `Subscription check failed for martId=${user.martId}`,
        subscriptionErr,
      );
    }

    const refreshedMart = await martRepository.findById(user.martId, { select: { status: true } });
    const effectiveStatus = refreshedMart?.status || mart.status;

    // Specific messaging for mart status
    if (effectiveStatus === "pending") {
      console.info(`Login blocked: mart pending for martId=${user.martId}`);
      return res.status(403).json({ message: "Pending Mart not approved yet" });
    }

    if (effectiveStatus === "disabled") {
      console.info(`Login blocked: mart disabled for martId=${user.martId}`);
      return res.status(403).json({ message: "Mart disabled by system administrator" });
    }

    if (effectiveStatus === "suspended") {
      // Allow owner to login so they can view packages and submit payment receipt to reactivate
      if (user.role === "owner") {
        console.info(`Owner login permitted for suspended martId=${user.martId} (to enable renewal)`);
      } else {
        console.info(`Employee login blocked: mart suspended for martId=${user.martId}`);
        return res.status(403).json({
          message: "Store subscription has expired. Please contact the store owner to log in and renew.",
        });
      }
    }

    if (effectiveStatus === "rejected") {
      console.info(`Login blocked: mart rejected for martId=${user.martId}`);
      return res.status(401).json({ message: "Invalid username or password" });
    }
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      martId: user.martId,
      permissions: user.permissions || [],
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email || "",
      phone: user.phone || "",
      profilePictureUrl: user.profilePictureUrl || "",
      role: user.role,
      martId: user.martId,
      permissions: user.permissions || [],
      openCashBalance: Number(user.openCashBalance || 0),
    },
  });
});

// Current user profile
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await userRepository.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    // Remove passwordHash
    delete user.passwordHash;

    return res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email || "",
      phone: user.phone || "",
      profilePictureUrl: user.profilePictureUrl || "",
      role: user.role,
      martId: user.martId,
      permissions: user.permissions || [],
      openCashBalance: Number(user.openCashBalance || 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Register endpoint
// systemAdmin and owner can create manager/cashier/storeKeeper
// manager can create cashier inside their own mart
router.post("/register", authenticate, async (req, res) => {
  const {
    name,
    username,
    password,
    confirmPassword,
    role,
    martId,
    phone,
    email,
    salary,
    profilePictureUrl,
  } = req.body;
  const requesterRole = String(req.user.role || "")
    .trim()
    .toLowerCase();
  const normalizedRoleInput = String(role || "").trim();
  const normalizedTargetRole =
    normalizedRoleInput === "store_keeper" ||
    normalizedRoleInput === "storekeeper"
      ? "storeKeeper"
      : normalizedRoleInput === "system_admin"
        ? "systemAdmin"
        : normalizedRoleInput;
  const effectiveMartId =
    requesterRole === "systemadmin" ? martId : req.user.martId;

  if (
    !name ||
    !username ||
    !password ||
    !confirmPassword ||
    !normalizedTargetRole
  )
    return res.status(400).json({ message: "Missing required fields" });
  if (password !== confirmPassword)
    return res.status(400).json({ message: "Passwords do not match" });
  if (!["manager", "cashier", "storeKeeper"].includes(normalizedTargetRole))
    return res.status(400).json({ message: "Invalid role" });

  if (!effectiveMartId)
    return res.status(400).json({ message: "martId is required" });
  // only systemAdmin, owner, or manager are allowed to register employees
  if (!["systemadmin", "owner", "manager"].includes(requesterRole)) {
    return res
      .status(403)
      .json({ message: "Insufficient permissions to create users" });
  }

  // owners and managers can only create users within their mart
  if (
    (requesterRole === "owner" || requesterRole === "manager") &&
    String(req.user.martId) !== String(effectiveMartId)
  ) {
    return res
      .status(403)
      .json({ message: "Cannot create user outside your mart" });
  }

  // managers may only create cashiers
  if (requesterRole === "manager" && normalizedTargetRole !== "cashier") {
    return res
      .status(403)
      .json({ message: "Managers can only create cashier accounts" });
  }

  const uniquenessError = await ensureUniqueMartRole({
    martId: effectiveMartId,
    role: normalizedTargetRole,
  });
  if (uniquenessError) {
    return res.status(409).json({ message: uniquenessError });
  }

  const exists = await userRepository.findOne({ username });
  if (exists)
    return res.status(409).json({ message: "Username already exists" });
  
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userRepository.create({
    name,
    username,
    passwordHash,
    role: normalizedTargetRole,
    martId: effectiveMartId,
    phone,
    email,
    salary,
    profilePictureUrl,
  });
  
  res.status(201).json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email || "",
      phone: user.phone || "",
      profilePictureUrl: user.profilePictureUrl || "",
      role: user.role,
      martId: user.martId,
      openCashBalance: Number(user.openCashBalance || 0),
    },
  });
});

// List users by martId (owner/manager/systemAdmin)
router.get("/users", authenticate, async (req, res) => {
  try {
    const { martId, role } = req.query;
    const filter = { isDeleted: false };
    // system admin can query any mart (or all)
    if (req.user.role === "systemAdmin") {
      if (martId) filter.martId = martId;
    } else {
      // owner and manager can only list users in their mart
      filter.martId = req.user.martId;
      if (martId && String(martId) !== String(req.user.martId))
        return res
          .status(403)
          .json({ message: "Cannot list users for another mart" });
    }
    if (role) filter.role = role;
    const users = await userRepository.findMany(filter);
    
    // Sanitize output
    const sanitizedUsers = users.map(u => {
        delete u.passwordHash;
        return u;
    });

    res.json(sanitizedUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user (protected - requires owner/systemAdmin or manager limited)
router.put("/users/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const update = {};
    const allowed = [
      "name",
      "phone",
      "role",
      "salary",
      "martId",
      "username",
      "permissions",
      "email",
      "profilePictureUrl",
    ];
    for (const k of allowed)
      if (req.body[k] !== undefined) update[k] = req.body[k];
    if (req.body.password) {
      const hash = await bcrypt.hash(req.body.password, 10);
      update.passwordHash = hash;
    }
    // fetch target user
    const target = await userRepository.findById(id);
    if (!target) return res.status(404).json({ message: "User not found" });

    // Authorization: systemAdmin can update anyone
    // owner can update users inside their mart
    // manager can update users inside their mart but cannot manage store keepers
    const requester = req.user;
    if (requester.role !== "systemAdmin") {
      if (String(requester.martId) !== String(target.martId)) {
        return res
          .status(403)
          .json({ message: "Cannot modify users from another mart" });
      }
    }

    if (
      requester.role === "manager" &&
      (target.role === "storeKeeper" || target.role === "store_keeper")
    ) {
      return res
        .status(403)
        .json({ message: "Manager cannot modify store keeper accounts" });
    }

    if (requester.role === "manager") {
      const managerAllowedFields = [
        "name",
        "phone",
        "username",
        "email",
        "profilePictureUrl",
        "permissions",
      ];
      const invalidManagerFields = Object.keys(update).filter(
        (k) => !managerAllowedFields.includes(k),
      );
      if (invalidManagerFields.length) {
        return res.status(403).json({
          message: "Manager cannot modify private controls or salary",
        });
      }
    }

    // If permissions were provided ensure they are an array of strings
    if (req.body.permissions) {
      if (!Array.isArray(req.body.permissions))
        return res
          .status(400)
          .json({ message: "permissions must be an array" });

      // Validate by target role: only certain permissions make sense per role
      const targetRole = target.role;
      const allowedPerTarget = (r) => {
        if (r === "manager") return ["discount", "addItem"];
        if (r === "storeKeeper" || r === "store_keeper")
          return ["transferStock"];
        if (r === "cashier") return ["discount"];
        return [];
      };

      const allowedForTarget = allowedPerTarget(targetRole);
      const invalidForTarget = req.body.permissions.filter(
        (p) => !allowedForTarget.includes(p),
      );
      if (invalidForTarget.length)
        return res.status(403).json({
          message: "Some permissions are not valid for target user role",
        });

      // managers have limited permission scope and cannot modify peers
      if (requester.role === "manager") {
        // managers may only modify cashier permissions
        if (targetRole === "manager")
          return res
            .status(403)
            .json({ message: "Manager cannot modify other managers" });
        if (targetRole === "storeKeeper" || targetRole === "store_keeper") {
          return res.status(403).json({
            message: "Manager cannot modify store keeper permissions",
          });
        }

        // allow only manager-scoped permissions to be modified by managers
        const allowedForManager = ["discount"];
        const invalid = req.body.permissions.filter(
          (p) => !allowedForManager.includes(p),
        );
        if (invalid.length)
          return res
            .status(403)
            .json({ message: "Manager cannot change these permissions" });
      }

      update.permissions = req.body.permissions.map(String);
    }

    // ensure owners cannot change role to systemAdmin and similar protections
    if (update.role && requester.role !== "systemAdmin") {
      // only system admin can change role to systemAdmin or owner
      if (["systemAdmin", "owner"].includes(update.role))
        return res
          .status(403)
          .json({ message: "Insufficient permissions to set that role" });
    }

    const nextRole = update.role || target.role;
    const nextMartId = update.martId || target.martId;
    const updateUniquenessError = await ensureUniqueMartRole({
      martId: nextMartId,
      role: nextRole,
      excludeUserId: target.id,
    });
    if (updateUniquenessError) {
      return res.status(409).json({ message: updateUniquenessError });
    }

    const user = await userRepository.update(id, update);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    delete user.passwordHash;

    // Emit realtime notification if permissions were changed
    if (update.permissions) {
      try {
        // Log change and notify user in realtime
        console.log(
          `Permissions updated for user ${user.id}:`,
          user.permissions,
        );
        const socketHelper = require("../socket");
        // Include actor info so clients can show who changed permissions
        const actor = {
          id: requester.id ? String(requester.id) : null,
          role: requester.role || null,
          name: requester.name || requester.username || null,
        };
        socketHelper.emitToUser(user.id.toString(), "permissions_updated", {
          userId: user.id.toString(),
          permissions: user.permissions || [],
          actor,
        });

        // create a notification so offline sessions will see this change in notifications
        const {
          createNotification,
        } = require("../services/notification.service");
        await createNotification({
          martId: user.martId,
          userId: user.id,
          type: "permissions_changed",
          title: "Permissions updated",
          message: `Your permissions were changed by ${actor.role || "an administrator"}`,
          metadata: { permissions: user.permissions || [], actor },
        });
      } catch (e) {
        console.error("Failed to emit permissions update", e);
      }
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/change-password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message:
          "Current password, new password, and confirmation are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (String(newPassword).length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters long" });
    }

    const user = await userRepository.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const valid = await bcrypt.compare(
      String(currentPassword),
      user.passwordHash || "",
    );
    if (!valid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await userRepository.update(user.id, { passwordHash });

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Update user details (name, username, phone) — system admin only
router.put("/users/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, phone } = req.body || {};

    const requester = req.user;
    if (requester.role !== "systemAdmin" && String(requester.id) !== String(id)) {
      return res
        .status(403)
        .json({ message: "Insufficient permissions to update user" });
    }

    const targetUser = await userRepository.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (username !== undefined) {
      const sanitized = String(username)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 30);
      if (sanitized && sanitized !== targetUser.username) {
        const existing = await userRepository.findByUsername(sanitized);
        if (existing && String(existing.id) !== String(id)) {
          return res.status(409).json({ message: "Username already taken" });
        }
        updates.username = sanitized;
      }
    }

    const updated = await userRepository.update(id, updates);
    const safeUser = { ...updated };
    delete safeUser.passwordHash;
    return res.json(safeUser);
  } catch (err) {
    console.error("PUT /users/:id error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Admin reset user password
router.put("/users/:id/reset-password", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, confirmPassword } = req.body || {};

    // Only systemAdmin can reset any user's password
    const requester = req.user;
    if (requester.role !== "systemAdmin") {
      return res
        .status(403)
        .json({ message: "Insufficient permissions to reset passwords" });
    }

    if (!newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ message: "New password and confirmation are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (String(newPassword).length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters long" });
    }

    const targetUser = await userRepository.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await userRepository.update(id, { passwordHash });

    return res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Delete user
router.delete("/users/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const target = await userRepository.findById(id);
    if (!target) return res.status(404).json({ message: "User not found" });

    const requester = req.user;
    if (requester.role !== "systemAdmin") {
      if (requester.role === "owner") {
        if (String(requester.martId) !== String(target.martId))
          return res
            .status(403)
            .json({ message: "Cannot delete user from another mart" });
      } else {
        return res
          .status(403)
          .json({ message: "Insufficient permissions to delete user" });
      }
    }

    await userRepository.softDelete(id);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
