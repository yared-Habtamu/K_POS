const express = require("express");
const router = express.Router();
const prisma = require("../repositories/prismaClient");
const { authenticate } = require("../middleware/auth");
const { emitToUser } = require("../socket");
const { createNotification } = require("../services/notification.service");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  return next();
}

// Any logged-in user assigned to a mart may use the internal chat.
function requireParty(req, res, next) {
  if (req.user.role !== "systemAdmin" && !req.user.martId) {
    return res
      .status(403)
      .json({ message: "User is not assigned to any market" });
  }
  return next();
}

// Stable ordering of two participants so the unique key is (martId, user1Id, user2Id).
function pair(userAId, userBId) {
  const [u1, u2] = [String(userAId), String(userBId)].sort();
  return { user1Id: u1, user2Id: u2 };
}

// ─── GET /api/chat/conversations ─────────────────────────────────────────────
// List conversations the current user is a participant in (within their mart).

router.get(
  "/conversations",
  authenticate,
  requireAuth,
  requireParty,
  async (req, res) => {
    try {
      const { martId, id: userId } = req.user;

      const conversations = await prisma.chatConversation.findMany({
        where: {
          martId,
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
        include: {
          user1: { select: { id: true, name: true, role: true } },
          user2: { select: { id: true, name: true, role: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: { id: true, name: true, role: true } } },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      const conversationsWithUnread = await Promise.all(
        conversations.map(async (conv) => {
          const unreadCount = await prisma.chatMessage.count({
            where: {
              conversationId: conv.id,
              senderId: { not: userId },
              readAt: null,
            },
          });
          return {
            ...conv,
            lastMessage: conv.messages[0]?.message || null,
            lastMessageAt: conv.messages[0]?.createdAt || null,
            unreadCount,
          };
        }),
      );

      return res.json({ data: conversationsWithUnread });
    } catch (err) {
      console.error("[chat] GET conversations error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
);

// ─── POST /api/chat/conversations ────────────────────────────────────────────
// Get or create a conversation between the current user and any other user
// in the same mart.

router.post(
  "/conversations",
  authenticate,
  requireAuth,
  requireParty,
  async (req, res) => {
    try {
      const { martId, id: userId } = req.user;
      const { otherUserId } = req.body;

      if (!otherUserId) {
        return res
          .status(400)
          .json({ message: "otherUserId is required" });
      }

      if (String(otherUserId) === String(userId)) {
        return res
          .status(400)
          .json({ message: "Cannot start a conversation with yourself" });
      }

      // Recipient must belong to the same mart and be an active user.
      const other = await prisma.user.findFirst({
        where: {
          id: otherUserId,
          martId,
          active: true,
          isDeleted: false,
        },
        select: { id: true, name: true, role: true },
      });
      if (!other) {
        return res.status(404).json({ message: "User not found" });
      }

      const { user1Id, user2Id } = pair(userId, other.id);

      const conversation = await prisma.chatConversation.upsert({
        where: {
          martId_user1Id_user2Id: { martId, user1Id, user2Id },
        },
        create: {
          martId,
          user1Id,
          user2Id,
        },
        update: {},
        include: {
          user1: { select: { id: true, name: true, role: true } },
          user2: { select: { id: true, name: true, role: true } },
        },
      });

      return res.json(conversation);
    } catch (err) {
      console.error("[chat] POST conversations error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
);

// ─── GET /api/chat/conversations/:id/messages ────────────────────────────────
// Get messages for a conversation with pagination. Only participants may list.

router.get(
  "/conversations/:id/messages",
  authenticate,
  requireAuth,
  requireParty,
  async (req, res) => {
    try {
      const { id: userId } = req.user;
      const { id } = req.params;
      const { before, limit = "50" } = req.query;

      const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

      const conversation = await prisma.chatConversation.findUnique({
        where: { id },
        select: { user1Id: true, user2Id: true },
      });
      if (
        !conversation ||
        (conversation.user1Id !== userId && conversation.user2Id !== userId)
      ) {
        return res.status(403).json({ message: "Not a conversation participant" });
      }

      const where = { conversationId: id };
      if (before) {
        where.createdAt = { lt: new Date(before) };
      }

      const messages = await prisma.chatMessage.findMany({
        where,
        include: {
          sender: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: pageSize,
      });

      // Mark messages as read
      const unreadMessageIds = messages
        .filter((m) => m.senderId !== userId && !m.readAt)
        .map((m) => m.id);

      if (unreadMessageIds.length > 0) {
        await prisma.chatMessage.updateMany({
          where: { id: { in: unreadMessageIds } },
          data: { readAt: new Date() },
        });
      }

      return res.json({ data: messages.reverse() });
    } catch (err) {
      console.error("[chat] GET messages error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
);

// ─── POST /api/chat/conversations/:id/messages ───────────────────────────────
// Send a message in a conversation. Only participants may send.

router.post(
  "/conversations/:id/messages",
  authenticate,
  requireAuth,
  requireParty,
  async (req, res) => {
    try {
      const { id: userId } = req.user;
      const { id: conversationId } = req.params;
      const { message } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ message: "Message cannot be empty" });
      }

      const conversation = await prisma.chatConversation.findUnique({
        where: { id: conversationId },
        select: { id: true, martId: true, user1Id: true, user2Id: true },
      });
      if (
        !conversation ||
        (conversation.user1Id !== userId && conversation.user2Id !== userId)
      ) {
        return res.status(403).json({ message: "Not a conversation participant" });
      }

      const newMessage = await prisma.chatMessage.create({
        data: {
          conversationId,
          senderId: userId,
          message: message.trim(),
        },
        include: {
          sender: { select: { id: true, name: true, role: true } },
        },
      });

      // Update conversation timestamp
      await prisma.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // Emit to the other participant via Socket.IO
      const recipientId =
        userId === conversation.user1Id
          ? conversation.user2Id
          : conversation.user1Id;

      try {
        emitToUser(recipientId, "chat_message", {
          conversationId,
          message: newMessage,
        });
      } catch (socketErr) {
        console.warn("[chat] Socket emit failed:", socketErr.message);
      }

      // Create an in-app notification for the recipient so the message
      // shows up in the notification bell and can deep-link to this chat.
      try {
        await createNotification({
          martId: conversation.martId,
          userId: recipientId,
          type: "chat_message",
          title: newMessage.sender.name || "New message",
          message: newMessage.message,
          metadata: { conversationId },
        });
      } catch (notifErr) {
        console.warn("[chat] Notification creation failed:", notifErr.message);
      }

      return res.status(201).json(newMessage);
    } catch (err) {
      console.error("[chat] POST messages error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
);

// ─── PUT /api/chat/conversations/:id/read ────────────────────────────────────
// Mark all messages in a conversation as read for the current user.

router.put(
  "/conversations/:id/read",
  authenticate,
  requireAuth,
  requireParty,
  async (req, res) => {
    try {
      const { id: userId } = req.user;
      const { id: conversationId } = req.params;

      const conversation = await prisma.chatConversation.findUnique({
        where: { id: conversationId },
        select: { user1Id: true, user2Id: true },
      });
      if (
        !conversation ||
        (conversation.user1Id !== userId && conversation.user2Id !== userId)
      ) {
        return res.status(403).json({ message: "Not a conversation participant" });
      }

      const result = await prisma.chatMessage.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      // Notify the other participant in realtime so their "sent" ticks
      // can flip to "read" without a page refresh.
      if (result.count > 0) {
        const otherUserId =
          conversation.user1Id === userId
            ? conversation.user2Id
            : conversation.user1Id;
        try {
          emitToUser(otherUserId, "chat_read", {
            conversationId,
            readerId: userId,
            readAt: new Date(),
          });
        } catch (socketErr) {
          console.warn("[chat] Read emit failed:", socketErr.message);
        }
      }

      // Mark this conversation's chat notifications as read so the
      // notification bell badge stays in sync with the chat unread count.
      try {
        await prisma.notification.updateMany({
          where: {
            userId,
            type: "chat_message",
            read: false,
            data: { path: ["conversationId"], equals: conversationId },
          },
          data: { read: true },
        });
        const { sseManager } = require("../utils/sse");
        const { getUnreadCount } = require("../services/notification.service");
        const count = await getUnreadCount(userId, req.user.martId);
        sseManager.sendUnreadCountUpdate(userId, count);
      } catch (notifErr) {
        console.warn("[chat] Notification read sync failed:", notifErr.message);
      }

      return res.json({ success: true });
    } catch (err) {
      console.error("[chat] PUT read error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
);

// ─── GET /api/chat/users ─────────────────────────────────────────────────────
// List other active users in the same mart (for starting a new conversation).

router.get(
  "/users",
  authenticate,
  requireAuth,
  requireParty,
  async (req, res) => {
    try {
      const { martId, id: userId } = req.user;
      if (!martId) {
        return res.json({ data: [] });
      }

      const users = await prisma.user.findMany({
        where: {
          martId,
          active: true,
          isDeleted: false,
          id: { not: userId },
        },
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      });

      return res.json({ data: users });
    } catch (err) {
      console.error("[chat] GET users error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
);

module.exports = router;