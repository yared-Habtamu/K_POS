const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const Mart = require("../models/mart.model");

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

    // Try to fetch fresh user data from DB (ensures up-to-date martId and permissions)
    let dbUser = null;
    try {
      const User = require("../models/user.model");
      dbUser = await User.findById(payload.id)
        .select("username role martId permissions")
        .lean();
    } catch (e) {
      // ignore DB errors; we'll fall back to token payload
    }

    const source = dbUser || payload;

    // attach a sanitized user object (including permissions if present)
    req.user = {
      id: payload.id,
      username: source.username || payload.username,
      role: source.role || payload.role,
      martId: source.martId || payload.martId,
      permissions: Array.isArray(source.permissions)
        ? source.permissions
        : Array.isArray(payload.permissions)
          ? payload.permissions
          : [],
    };

    // Notifications should remain reachable so owners can read suspension messages.
    const isNotificationsEndpoint = String(req.originalUrl || "").startsWith(
      "/api/notifications",
    );

    // Block suspended/inactive marts from accessing protected APIs.
    if (req.user.role !== "systemAdmin" && req.user.martId) {
      const mart = await Mart.findById(req.user.martId)
        .select("status isDeleted")
        .lean();

      if (!mart || mart.isDeleted) {
        return res.status(403).json({
          message: "Mart is unavailable. Contact system administrator.",
        });
      }

      if (
        ["suspended", "disabled", "pending", "rejected"].includes(
          String(mart.status || ""),
        ) &&
        !isNotificationsEndpoint
      ) {
        return res.status(403).json({
          message:
            "Mart access is blocked by current status. Contact system administrator.",
          martStatus: mart.status,
        });
      }
    }

    console.log("[auth] user attached to req:", req.user);
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { authenticate };
