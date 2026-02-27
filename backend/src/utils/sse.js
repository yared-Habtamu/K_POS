const { Response } = require("express");

/**
 * SSE Connection Manager
 * Manages Server-Sent Events connections for real-time notifications
 */

class SSEConnectionManager {
  constructor() {
    this.clients = new Map(); // clientId -> { userId, martId, response, lastHeartbeat }
    this.heartbeatInterval = null;
    this.startHeartbeatCheck();
  }

  /**
   * Add a new SSE client connection
   */
  addClient(clientId, userId, martId, response, origin = "*") {
    // Set SSE headers
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    };

    response.writeHead(200, headers);

    // Send initial connection event
    response.write(`data: ${JSON.stringify({ type: "connected", clientId })}\n\n`);

    const client = {
      id: clientId,
      userId: String(userId),
      martId: String(martId),
      response,
      lastHeartbeat: new Date(),
    };

    this.clients.set(clientId, client);

    console.log(`[SSE] Client ${clientId} connected for user ${userId}. Total clients: ${this.clients.size}`);
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.response.end();
      } catch (e) {}
      this.clients.delete(clientId);
      console.log(`[SSE] Client ${clientId} disconnected. Total clients: ${this.clients.size}`);
    }
  }

  /**
   * Send notification to a specific user
   */
  sendToUser(userId, notification) {
    let sent = 0;
    const uid = String(userId);
    this.clients.forEach((client) => {
      if (client.userId === uid) {
        try {
          client.response.write(`data: ${JSON.stringify({ type: "notification", data: notification })}\n\n`);
          sent++;
        } catch (error) {
          console.error(`[SSE] Error sending to client ${client.id}:`, error);
          this.removeClient(client.id);
        }
      }
    });

    if (sent > 0) {
      console.log(`[SSE] Sent notification to ${sent} connection(s) for user ${userId}`);
    }
  }

  /**
   * Send unread count update to a specific user
   */
  sendUnreadCountUpdate(userId, count) {
    const uid = String(userId);
    this.clients.forEach((client) => {
      if (client.userId === uid) {
        try {
          client.response.write(`data: ${JSON.stringify({ type: "unread_count", count })}\n\n`);
        } catch (error) {
          console.error(`[SSE] Error sending count update to client ${client.id}:`, error);
          this.removeClient(client.id);
        }
      }
    });
  }

  /**
   * Send heartbeat to all clients
   */
  sendHeartbeat() {
    const now = new Date();
    this.clients.forEach((client) => {
      try {
        client.response.write(`: heartbeat ${now.toISOString()}\n\n`);
        client.lastHeartbeat = now;
      } catch (error) {
        console.error(`[SSE] Heartbeat failed for client ${client.id}, removing`);
        this.removeClient(client.id);
      }
    });
  }

  /**
   * Start periodic heartbeat check
   */
  startHeartbeatCheck() {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // 30 seconds
  }

  /**
   * Cleanup - call on server shutdown
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.clients.forEach((client) => {
      try {
        client.response.end();
      } catch (e) {}
    });
    this.clients.clear();
    console.log("[SSE] Connection manager cleaned up");
  }
}

// Singleton instance
const sseManager = new SSEConnectionManager();

module.exports = { sseManager };
