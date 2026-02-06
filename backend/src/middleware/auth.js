const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

async function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'Authorization header required' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'Invalid authorization header' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Try to fetch fresh user data from DB (ensures up-to-date martId and permissions)
    let dbUser = null;
    try {
      const User = require('../models/user.model');
      dbUser = await User.findById(payload.id).select('username role martId permissions').lean();
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
      permissions: Array.isArray(source.permissions) ? source.permissions : (Array.isArray(payload.permissions) ? payload.permissions : []),
    };

    console.log('[auth] user attached to req:', req.user);
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };
