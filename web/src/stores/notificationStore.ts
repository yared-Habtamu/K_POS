import { create } from 'zustand';

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  setUnreadCount: (count: number) => void;
  setIsConnected: (isConnected: boolean) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) => set((state) => ({ 
    notifications: [notification, ...state.notifications] 
  })),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setIsConnected: (isConnected) => set({ isConnected }),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) => 
      n._id === id ? { ...n, read: true } : n
    )
  })),
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, read: true })),
    unreadCount: 0
  })),
}));
