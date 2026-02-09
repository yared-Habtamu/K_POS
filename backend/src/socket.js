// src/socket.js
// Lightweight socket manager used by routes to emit events to specific users.
// Requires `socket.io` on the server.

let io = null;
const userSocketMap = new Map(); // userId -> socketId

function setIo(serverIo) {
  io = serverIo;
  // attach connection handlers
  io.on('connection', (socket) => {
    // Expect client to authenticate by sending a short-lived token
    socket.on('authenticate', (token) => {
      // We verify token here using same JWT secret as auth route
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        const userId = payload && payload.id ? String(payload.id) : null;
        if (userId) {
          userSocketMap.set(userId, socket.id);
          socket._userId = userId;
          console.log(`Socket authenticated for user ${userId}, socketId=${socket.id}`);
        } else {
          console.log('Socket authenticate: token did not contain user id');
        }
      } catch (err) {
        console.log('Socket authenticate failed:', err.message);
      }
    });

    socket.on('disconnect', () => {
      if (socket._userId) userSocketMap.delete(socket._userId);
    });
  });
}

function emitToUser(userId, event, payload) {
  if (!io) {
    console.warn('emitToUser called but io not initialized');
    return;
  }
  const uid = String(userId);
  const sockId = userSocketMap.get(uid);
  if (!sockId) {
    console.warn(`emitToUser: no active socket for user ${uid}`);
    return;
  }
  console.log(`emitToUser: emitting ${event} to user ${uid} (socket ${sockId})`);
  io.to(sockId).emit(event, payload);
}

function getConnectedUserIds() {
  return Array.from(userSocketMap.keys());
}

module.exports = { setIo, emitToUser, getConnectedUserIds };
