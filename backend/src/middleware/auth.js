const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'Authorization header required' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'Invalid authorization header' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // attach a sanitized user object (including permissions if present)
    req.user = {
      id: payload.id,
      username: payload.username,
      role: payload.role,
      martId: payload.martId,
      permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
    };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };
