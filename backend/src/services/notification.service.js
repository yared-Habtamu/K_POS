const Notification = require('../models/notification.model');
const { sseManager } = require('../utils/sse');

/**
 * Create a notification and broadcast it via SSE
 */
async function createNotification(data, session = null) {
  try {
    const { martId, userId, type, title, message, metadata } = data;

    const notification = new Notification({
      martId,
      userId,
      type,
      title,
      message,
      data: metadata,
      read: false,
    });

    await notification.save({ session });

    // Broadcast the notification
    if (userId) {
      // Send to specific user
      sseManager.sendToUser(userId, notification);
      
      // Send updated unread count
      const unreadCount = await Notification.countDocuments({ userId, read: false });
      sseManager.sendUnreadCountUpdate(userId, unreadCount);
    } else if (martId) {
      // Broadcast to all users in the mart
      // Note: sseManager would need a broad cast method for marts if needed, 
      // but usually notifications are user-specific or we can filter on the client.
      // For now, we assume user-specific notification for high relevance.
      // If needed, we can add sendToMart in sseManager.
    }

    return notification;
  } catch (error) {
    console.error('[NotificationService] Error creating notification:', error);
    throw error;
  }
}

/**
 * Get unread count for a user
 */
async function getUnreadCount(userId) {
  return await Notification.countDocuments({ userId, read: false });
}

module.exports = {
  createNotification,
  getUnreadCount,
};
