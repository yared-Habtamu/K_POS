const express = require("express");
const router = express.Router();
const prisma = require("../repositories/prismaClient");
const { authenticate } = require("../middleware/auth");
const { emitToUser } = require("../socket");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  return next();
}

function requireManagerOrCashier(req, res, next) {
  if (!["manager", "cashier"].includes(req.user.role)) {
    return res
      .status(403)
      .json({ message: "Only managers and cashiers can use chat" });
  }
  return next();
}

// ─── GET /api/chat/conversations ─────────────────────────────────────────────
// List conversations for the current user.
// Managers see all conversations in their mart.
// Cashiers see only their conversation with the manager.

router.get(
  "/conversations",
  authenticate,
  requireAuth,
  requireManagerOrCashier,
  async (req, res) => {
    try {
      const { martId, id: userId, role } = req.user;

      const where = { martId };
      if (role === "cashier") {
        where.cashierId = userId;
      }

      const conversations = await prisma.chatConversation.findMany({
        where,
        include: {
          manager: { select: { id: true, name: true } },
          cashier: { select: { id: true, name: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: { id: true, name: true } } },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      // Get unread counts
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
// Get or create a conversation between manager and cashier.

router.post(
  "/conversations",
  authenticate,
  requireAuth,
  requireManagerOrCashier,
  async (req, res) => {
    try {
      const { martId, id: userId, role } = req.user;
      const { cashierId, managerId } = req.body;

      let resolvedManagerId, resolvedCashierId;

      if (role === "manager") {
        resolvedManagerId = userId;
        resolvedCashierId = cashierId;
      } else {
        // cashier
        resolvedCashierId = userId;
        resolvedManagerId = managerId;
      }

      if (!resolvedManagerId || !resolvedCashierId) {
        return res
          .status(400)
          .json({ message: "Both managerId and cashierId are required" });
      }

      // Upsert conversation
      const conversation = await prisma.chatConversation.upsert({
        where: {
          martId_managerId_cashierId: {
            martId,
            managerId: resolvedManagerId,
            cashierId: resolvedCashierId,
          },
        },
        create: {
          martId,
          managerId: resolvedManagerId,
          cashierId: resolvedCashierId,
        },
        update: {},
        include: {
          manager: { select: { id: true, name: true } },
          cashier: { select: { id: true, name: true } },
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
// Get messages for a conversation with pagination.

router.get(
  "/conversations/:id/messages",
  authenticate,
  requireAuth,
  requireManagerOrCashier,
  async (req, res) => {
    try {
      const { id: userId } = req.user;
      const { id } = req.params;
      const { before, limit = "50" } = req.query;

      const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

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
// Send a message in a conversation.

router.post(
  "/conversations/:id/messages",
  authenticate,
  requireAuth,
  requireManagerOrCashier,
  async (req, res) => {
    try {
      const { id: userId } = req.user;
      const { id: conversationId } = req.params;
      const { message } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ message: "Message cannot be empty" });
      }

      // Verify conversation exists
      const conversation = await prisma.chatConversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
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
        userId === conversation.managerId
          ? conversation.cashierId
          : conversation.managerId;

      try {
        emitToUser(recipientId, "chat_message", {
          conversationId,
          message: newMessage,
        });
      } catch (socketErr) {
        // Socket might not be initialized; ignore
        console.warn("[chat] Socket emit failed:", socketErr.message);
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
  requireManagerOrCashier,
  async (req, res) => {
    try {
      const { id: userId } = req.user;
      const { id: conversationId } = req.params;

      await prisma.chatMessage.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      return res.json({ success: true });
    } catch (err) {
      console.error("[chat] PUT read error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
);

// ─── GET /api/chat/cashiers ──────────────────────────────────────────────
// List cashiers in the same mart (for starting a new conversation).

router.get(
  "/cashiers",
  authenticate,
  requireAuth,
  requireManagerOrCashier,
  async (req, res) => {
    try {
      const { martId } = req.user;
      if (!martId) {
        return res.json({ data: [] });
      }

      const cashiers = await prisma.user.findMany({
        where: {
          martId,
          role: "cashier",
          active: true,
          isDeleted: false,
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

      return res.json({ data: cashiers });
    } catch (err) {
      console.error("[chat] GET cashiers error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
);

module.exports = router;
