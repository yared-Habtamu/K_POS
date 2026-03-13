import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
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

// Module-level singleton to persist across hook instantiations
let globalEventSource: EventSource | null = null;

export function useSSE() {
  const { user } = useAuthStore();
  const { 
    notifications, 
    unreadCount, 
    isConnected, 
    setNotifications, 
    addNotification, 
    setUnreadCount, 
    setIsConnected,
    markAsRead: storeMarkAsRead,
    markAllAsRead: storeMarkAllAsRead
  } = useNotificationStore();

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
  }, [user?.token, API_BASE, setNotifications]);

  useEffect(() => {
    if (!user?.token) {
      setIsConnected(false);
      if (globalEventSource) {
        globalEventSource.close();
        globalEventSource = null;
      }
      return;
    }

    // Only fetch if we don't have notifications yet or to refresh
    if (notifications.length === 0) {
      fetchNotifications();
    }

    // If already connected, don't open another one
    if (globalEventSource) return;

    const url = `${API_BASE}/api/notifications/stream?token=${user.token}`;
    const eventSource = new EventSource(url);
    globalEventSource = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'notification') {
          const newNotif = payload.data;
          addNotification(newNotif);
          
          toast.info(newNotif.title, {
            description: newNotif.message,
            duration: 5000,
          });
        } else if (payload.type === 'unread_count') {
          setUnreadCount(payload.count);
        }
      } catch (err) {
        console.error('[SSE] Error parsing message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Connection error:', err);
      setIsConnected(false);
      eventSource.close();
      globalEventSource = null;
    };

    return () => {
      // Keep globalEventSource alive across navigation
    };
  }, [user?.token, API_BASE, fetchNotifications, addNotification, setNotifications, setUnreadCount, setIsConnected, notifications.length]);

  const markAsRead = async (id: string) => {
    if (!user?.token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        storeMarkAsRead(id);
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
        storeMarkAllAsRead();
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
