const notificationRepository = require('../repositories/notificationRepository');
const { sseManager } = require('../utils/sse');

/**
 * Create a notification and broadcast it via SSE
 */
async function createNotification(data, tx = null) {
  try {
    const { martId, userId, type, title, message, metadata } = data;

    // INVARIANT: every notification belongs to exactly one recipient.
    // Notifications without a specific recipient are dropped — this prevents
    // anyone in a mart from seeing notifications not meant for them
    // (e.g., a manager seeing an owner-only approval request).
    if (!userId) {
      console.warn(
        `[NotificationService] Dropped "${type}" notification without a recipient (martId=${martId})`,
      );
      return null;
    }

    const notifData = {
      martId,
      userId,
      type,
      title,
      message,
      data: metadata || {},
      read: false,
    };

    let notification;
    if (tx && typeof tx.notification !== 'undefined') {
        notification = await tx.notification.create({ data: notifData });
    } else {
        notification = await notificationRepository.create(notifData);
    }

    // Broadcast to the specific recipient only
    sseManager.sendToUser(userId, notification);

    // Send updated unread count (scoped to the user's mart when provided)
    const unreadCount = await getUnreadCount(userId, martId);
    sseManager.sendUnreadCountUpdate(userId, unreadCount);

    return notification;
  } catch (error) {
    console.error('[NotificationService] Error creating notification:', error);
    throw error;
  }
}

/**
 * Get unread count for a user, optionally scoped to a mart.
 * Scoping by mart guarantees notifications from other stores are never counted.
 */
async function getUnreadCount(userId, martId = null) {
  const query = { userId, read: false };
  if (martId) query.martId = martId;
  return await notificationRepository.countDocuments(query);
}

module.exports = {
  createNotification,
  getUnreadCount,
};
