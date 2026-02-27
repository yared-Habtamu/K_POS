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
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAsRead, isConnected } = useSSE();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative transition-transform active:scale-95"
          aria-label="Notifications"
        >
          <Bell className={cn("h-5 w-5", isConnected ? "text-foreground" : "text-muted-foreground")} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center text-[10px] font-bold border-2 border-background animate-in zoom-in"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {!isConnected && (
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-yellow-500 border border-background" title="Reconnecting..." />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96 p-0 glass-strong border-border/50 shadow-xl overflow-hidden">
        <div className="p-4 flex items-center justify-between bg-primary/5">
          <DropdownMenuLabel className="p-0 font-bold text-lg">
            {t('notifications')}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              {unreadCount} {t('unread')}
            </Badge>
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
                    "flex flex-col items-start gap-1 p-4 cursor-default border-b border-border/30 last:border-0",
                    !notification.read ? "bg-primary/5" : "opacity-80"
                  )}
                  onSelect={(e) => {
                    e.preventDefault(); // Don't close on clicking the item itself
                  }}
                >
                  <div className="flex w-full justify-between items-start gap-2">
                    <span className={cn("font-semibold text-sm leading-tight", !notification.read ? "text-foreground" : "text-muted-foreground")}>
                      {notification.title}
                    </span>
                    {!notification.read && (
                      <Button
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-full hover:bg-success/20 hover:text-success"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification._id);
                        }}
                        title={t('mark_as_read')}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
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
          <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-primary">
            {t('view_all_notifications')}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
