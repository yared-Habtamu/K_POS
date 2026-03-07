import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

export function useSSE() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const fetchNotifications = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [user?.token, API_BASE]);

  useEffect(() => {
    if (!user?.token) {
      setIsConnected(false);
      return;
    }

    fetchNotifications();

    const url = `${API_BASE}/api/notifications/stream?token=${user.token}`;
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'notification') {
          const newNotif = payload.data;
          setNotifications((prev) => [newNotif, ...prev]);
          
          // Show real-time toast
          toast.info(newNotif.title, {
            description: newNotif.message,
            duration: 5000,
          });
          
          // Unread count will be updated by a separate message from server usually,
          // but if not, we could increment here. Our server sends unread_count update.
        } else if (payload.type === 'unread_count') {
          setUnreadCount(payload.count);
        } else if (payload.type === 'connected') {
          // Connected successfully
        }
      } catch (err) {
        console.error('[SSE] Error parsing message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Connection error:', err);
      setIsConnected(false);
      eventSource.close();
      // Browser usually auto-reconnects EventSource, but we might want to handle it explicitly if needed.
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [user?.token, API_BASE, fetchNotifications]);

  const markAsRead = async (id: string) => {
    if (!user?.token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, read: true } : n))
        );
        // Server will broadcast new unread count, which will be caught by onmessage
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };
  const markAllAsRead = async () => {
    if (!user?.token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true }))
        );
        // Server will broadcast new unread count = 0
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
