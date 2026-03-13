import { useEffect } from 'react';
import { useSSE } from '@/hooks/useSSE';

/**
 * Empty component that just maintains the notification connection.
 * Should be mounted at the top level (App.tsx).
 */
export function NotificationService() {
  // useSSE hook now handles the connection logic
  useSSE();
  return null;
}
