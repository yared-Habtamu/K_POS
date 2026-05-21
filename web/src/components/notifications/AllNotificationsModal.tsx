import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Notification } from "@/hooks/useSSE";

function getNotificationKey(notification: Notification, index: number) {
  return [
    notification?._id || "notification",
    notification?.createdAt || "unknown",
    index,
  ].join("-");
}

interface AllNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: Notification) => void;
}

export function AllNotificationsModal({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
}: AllNotificationsModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] flex flex-col h-[80vh] max-h-[800px] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t("all_notifications", "All Notifications")}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkAllAsRead}
              className="hidden sm:flex"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t("mark_all_read", "Mark all as read")}
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-10 min-h-[300px]">
              <Bell className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg">
                {t("no_notifications", "No notifications")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification, index) => (
                <div
                  key={getNotificationKey(notification, index)}
                  className={cn(
                    "flex flex-col items-start gap-2 p-4 cursor-pointer border-b hover:bg-muted/50 transition-colors",
                    !notification.read ? "bg-primary/5" : "",
                  )}
                  onClick={() => {
                    if (!notification.read) {
                      onMarkAsRead(notification._id);
                    }
                    onNotificationClick(notification);
                    onClose();
                  }}
                >
                  <div className="flex w-full justify-between items-start gap-4">
                    <span
                      className={cn(
                        "font-semibold text-base",
                        !notification.read
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {notification.title}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      {!notification.read && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
