const notificationRepository = require('../repositories/notificationRepository');
const { sseManager } = require('../utils/sse');

/**
 * Create a notification and broadcast it via SSE
 */
async function createNotification(data, tx = null) {
  try {
    const { martId, userId, type, title, message, metadata } = data;

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

    // Broadcast the notification
    if (userId) {
      // Send to specific user
      sseManager.sendToUser(userId, notification);
      
      // Send updated unread count
      const unreadCount = await notificationRepository.countDocuments({ userId, read: false });
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
  return await notificationRepository.countDocuments({ userId, read: false });
}

module.exports = {
  createNotification,
  getUnreadCount,
};
