import { Bell, Check, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSSE } from '@/hooks/useSSE';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { AllNotificationsModal } from './AllNotificationsModal';
import { CheckCircle2 } from 'lucide-react';

export function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, isConnected } = useSSE();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    // Route based on notification data or type if applicable
    if (notification.data?.url) {
      navigate(notification.data.url);
    } else if (notification.type === 'new_order' || notification.type === 'sale_completed') {
      navigate('/transactions'); // Example routing
    }
    // Otherwise just mark as read (no navigation target known)
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative transition-transform active:scale-95"
          aria-label="Notifications"
        >
          <Bell className={cn("h-5 w-5 transition-colors", isConnected ? "text-foreground" : "text-muted-foreground")} />
          
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-2 w-2 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive border-[1px] border-background shadow-sm"></span>
            </span>
          )}

          {!isConnected && (
            <span 
              className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-yellow-500 border border-background" 
              title="Reconnecting to real-time service..." 
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96 p-0 glass-strong border-border/50 shadow-xl overflow-hidden">
        <div className="p-4 flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-2">
            <DropdownMenuLabel className="p-0 font-bold text-lg">
              {t('notifications', 'Notifications')}
            </DropdownMenuLabel>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-[20px] px-1 flex items-center justify-center text-[10px] font-bold rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {t('mark_all_read', 'Mark all read')}
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-4">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">{t('no_notifications')}</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification._id}
                  className={cn(
                    "flex flex-col items-start gap-1 p-4 cursor-pointer border-b border-border/30 last:border-0 transition-colors",
                    !notification.read ? "bg-primary/5 hover:bg-primary/10" : "opacity-80 hover:bg-muted/50"
                  )}
                  onSelect={(e) => {
                    e.preventDefault();
                    handleNotificationClick(notification);
                  }}
                  onClick={() => {
                    handleNotificationClick(notification);
                  }}
                >
                  <div className="flex w-full justify-between items-start gap-2">
                    <span className={cn("font-semibold text-sm leading-tight", !notification.read ? "text-foreground" : "text-muted-foreground")}>
                      {notification.title}
                    </span>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <span className="text-[10px] text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <DropdownMenuSeparator className="m-0" />
        <div className="p-2 flex justify-center bg-primary/5">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs text-muted-foreground hover:text-primary"
            onClick={() => setIsModalOpen(true)}
          >
            {t('view_all_notifications', 'View all notifications')}
          </Button>
        </div>
      </DropdownMenuContent>

      <AllNotificationsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onNotificationClick={handleNotificationClick}
      />
    </DropdownMenu>
  );
}
