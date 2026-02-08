// src/utils/socket.ts
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/hooks/use-toast';

let socket: Socket | null = null;

export function initSocket(token?: string) {
  const API_BASE = import.meta.env.VITE_API_URL || '';
  if (!token) return;
  // Disconnect existing
  if (socket) {
    try { socket.disconnect(); } catch (e) {}
    socket = null;
  }

  socket = io(API_BASE, {
    autoConnect: false,
    auth: { token },
  });

  socket.on('connect', () => {
    // send explicit authenticate event for servers that expect it
    console.debug('Socket connected, sending authenticate');
    socket?.emit('authenticate', token);
  });

  socket.on('permissions_updated', (payload: { userId: string; permissions: string[] }) => {
    try {
      console.debug('permissions_updated received', payload);
      const current = useAuthStore.getState().user;
      if (current && String(current.id) === String(payload.userId)) {
        useAuthStore.getState().setUser({ ...current, permissions: payload.permissions || [] });
        // notify user
        toast({ title: 'Permissions updated', description: 'Your permissions were updated by the owner.' });
      }
    } catch (e) {
      // ignore
      console.error('Failed to apply realtime permissions update', e);
    }
  });

  socket.on('disconnect', () => {
    // noop
  });

  socket.connect();
}

export function disconnectSocket() {
  if (!socket) return;
  try { socket.disconnect(); } catch (e) {}
  socket = null;
}

export default socket;
