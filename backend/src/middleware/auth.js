const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const martRepository = require("../repositories/martRepository");
const userRepository = require("../repositories/userRepository");

async function authenticate(req, res, next) {
  let auth = req.headers.authorization;
  if (!auth && req.query.token) {
    auth = `Bearer ${req.query.token}`;
  }
  if (!auth)
    return res.status(401).json({ message: "Authorization header required" });
  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer")
    return res.status(401).json({ message: "Invalid authorization header" });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Fetch fresh user data from DB. This is non-optional for security.
    const dbUser = await userRepository.findById(payload.id, {
      select: { id: true, username: true, role: true, martId: true, permissions: true, isDeleted: true }
    });

    // CRITICAL: If user was deleted from DB, reject even if token is valid
    if (!dbUser || dbUser.isDeleted) {
      return res.status(401).json({ message: "User account no longer exists or is deleted" });
    }

    // Attach sanitized user object
    req.user = {
      id: dbUser.id,
      username: dbUser.username,
      role: dbUser.role,
      martId: dbUser.martId,
      permissions: Array.isArray(dbUser.permissions) ? dbUser.permissions : [],
    };

    // Notifications should remain reachable so owners can read suspension messages.
    const isNotificationsEndpoint = String(req.originalUrl || "").startsWith("/api/notifications");

    // Non-admin users must always be assigned to a mart
    if (req.user.role !== "systemAdmin" && !req.user.martId) {
      return res.status(403).json({ message: "User is not assigned to any market" });
    }

    // Block suspended/inactive/deleted marts
    if (req.user.role !== "systemAdmin" && req.user.martId) {
      const mart = await martRepository.findById(req.user.martId, {
        select: { status: true, isDeleted: true }
      });

      if (!mart || mart.isDeleted) {
        return res.status(403).json({
          message: "The market associated with this account has been deleted or is unavailable.",
        });
      }

      const blockedStatuses = ["suspended", "disabled", "pending", "rejected"];
      if (blockedStatuses.includes(String(mart.status || "")) && !isNotificationsEndpoint) {
        return res.status(403).json({
          message: `Access blocked. Your market status is ${mart.status}.`,
          martStatus: mart.status,
        });
      }
    }

    return next();
  } catch (err) {
    console.error("[auth] Token verification failed:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { authenticate };
