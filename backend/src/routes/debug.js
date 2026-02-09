const express = require('express');
const router = express.Router();
const { setIo, emitToUser } = require('../socket');

// Development-only endpoint to trigger permissions_updated for a user
router.post('/emit-permissions', async (req, res) => {
  const { userId, username, permissions, actor } = req.body;

  // Allow callers to pass username for convenience in development
  let targetId = userId;
  if (!targetId && username) {
    try {
      const User = require('../models/user.model');
      const u = await User.findOne({ username }).select('_id');
      if (!u) return res.status(404).json({ message: 'User not found for username' });
      targetId = String(u._id);
    } catch (err) {
      console.error('debug lookup failed', err);
      return res.status(500).json({ message: 'user lookup failed' });
    }
  }

  if (!targetId) return res.status(400).json({ message: 'userId or username required' });

  try {
    // Allow optional actor override for testing; fall back to dev marker
    const actorInfo = actor || { id: 'debug', role: 'dev', name: 'debug-emitter' };
    emitToUser(targetId, 'permissions_updated', { userId: String(targetId), permissions: Array.isArray(permissions) ? permissions : [], actor: actorInfo });
    res.json({ ok: true, userId: targetId });
  } catch (e) {
    console.error('debug emit failed', e);
    res.status(500).json({ message: 'emit failed' });
  }
});

// GET /api/debug/online-users - returns list of userIds with active sockets
router.get('/online-users', (req, res) => {
  try {
    const socketHelper = require('../socket');
    const users = socketHelper.getConnectedUserIds();
    res.json({ users });
  } catch (e) {
    console.error('failed to list online users', e);
    res.status(500).json({ message: 'failed' });
  }
});

module.exports = router;