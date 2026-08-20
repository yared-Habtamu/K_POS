import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/stores/authStore";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  Settings,
  Bell,
  Globe,
  Menu,
  Moon,
  Sun,
  User,
  Wifi,
  WifiOff,
  CreditCard,
  Sparkles,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const sub = useSubscriptionStatus();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const role = user?.role;
  const navigate = useNavigate();
  const isAmharic =
    i18n.resolvedLanguage?.startsWith("am") ?? i18n.language.startsWith("am");

  const settingsPath =
    role === "system_admin"
      ? "/admin/settings"
      : role === "owner"
        ? "/owner/settings"
        : role === "manager"
          ? "/manager/settings"
          : role === "cashier"
            ? "/cashier/settings"
            : role === "store_keeper"
              ? "/store-keeper/settings"
              : null;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const toggleLanguage = () => {
    i18n.changeLanguage(isAmharic ? "en" : "am");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const getInitials = (name?: string) => {
    return String(name || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderSubscriptionBadge = () => {
    if (role === "system_admin") {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/subscriptions")}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 px-2 sm:px-2.5"
          title={t("subscription_management")}
        >
          <CreditCard className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline font-medium">{t("subscriptions")}</span>
        </Button>
      );
    }

    if (role === "owner") {
      const days = typeof sub.daysLeft === "number" ? sub.daysLeft : null;

      if (sub.isExpired) {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/owner/subscription")}
            className="p-0 h-auto"
            title={`${t("subscription_expired")} - ${t("select_and_pay")}`}
          >
            <Badge
              variant="destructive"
              className="gap-1.5 px-2.5 py-1 text-xs cursor-pointer shadow-sm animate-pulse"
            >
              <AlertTriangle className="h-3 w-3" />
              <span>{t("expired_label")}</span>
            </Badge>
          </Button>
        );
      }

      if (sub.isTrial) {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/owner/subscription")}
            className="p-0 h-auto"
            title={`${t("seven_day_free_trial")} (${days ?? 0} ${t("days")}) - ${t("select_and_pay")}`}
          >
            <Badge
              className="gap-1.5 px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm"
            >
              <Sparkles className="h-3 w-3 text-amber-300" />
              <span className="hidden sm:inline">{t("seven_day_free_trial")}:</span>
              <span>{days !== null ? `${days}d` : "Trial"}</span>
            </Badge>
          </Button>
        );
      }

      if (sub.isWarning) {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/owner/subscription")}
            className="p-0 h-auto"
            title={`${t("expiring_soon")} (${days ?? 0} ${t("days")}) - ${t("select_and_pay")}`}
          >
            <Badge
              variant="secondary"
              className="gap-1.5 px-2.5 py-1 text-xs bg-amber-500/20 text-amber-500 border border-amber-500/30 cursor-pointer shadow-sm"
            >
              <Clock className="h-3 w-3" />
              <span>{days !== null ? `${days}d` : t("expiring_soon")}</span>
            </Badge>
          </Button>
        );
      }

      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/owner/subscription")}
          className="p-0 h-auto"
          title={`${t("active_subscription")} (${days ?? 0} ${t("days")} left)`}
        >
          <Badge
            className="gap-1.5 px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm"
          >
            <CreditCard className="h-3 w-3" />
            <span className="hidden sm:inline">{t("subscription")}:</span>
            <span>{days !== null ? `${days}d` : "Active"}</span>
          </Badge>
        </Button>
      );
    }

    return null;
  };

  return (
    <header className="sticky top-0 z-30 h-16 glass-strong border-b border-border/50 flex items-center justify-between px-3 sm:px-4 md:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => onToggleSidebar?.()}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Connection status */}
      <div className="flex items-center gap-2 min-w-0">
        <motion.div
          animate={{ scale: isOnline ? 1 : [1, 1.1, 1] }}
          transition={{ repeat: isOnline ? 0 : Infinity, duration: 2 }}
        >
          {isOnline ? (
            <Badge
              variant="secondary"
              className="gap-1.5 bg-success/10 text-success border-success/20"
            >
              <Wifi className="h-3 w-3" />
              <span className="hidden sm:inline">{t("online")}</span>
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="gap-1.5 bg-warning/10 text-warning border-warning/20"
            >
              <WifiOff className="h-3 w-3" />
              <span className="hidden sm:inline">{t("offline")}</span>
            </Badge>
          )}
        </motion.div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Subscription Status Badge right beside Language Selector */}
        {renderSubscriptionBadge()}

        {/* Language toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="gap-1.5 text-xs h-8 px-2 sm:px-2.5"
        >
          <Globe className="h-4 w-4" />
          <span className="font-medium">{isAmharic ? "አማ" : "EN"}</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={
            theme === "dark"
              ? t("switch_to_light_mode")
              : t("switch_to_dark_mode")
          }
          title={theme === "dark" ? t("light_mode") : t("dark_mode")}
          className="h-8 w-8"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-3 h-9">
              <Avatar className="h-7 w-7">
                {user?.profilePictureUrl ? (
                  <AvatarImage
                    src={user.profilePictureUrl}
                    alt={user?.name || user?.username}
                  />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                  {user ? t(user.role) : ""}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">
                {user?.email || user?.phone}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <User className="mr-2 h-4 w-4" />
              {t("profile")}
            </DropdownMenuItem>
            {settingsPath && (
              <DropdownMenuItem onClick={() => navigate(settingsPath)}>
                <Settings className="mr-2 h-4 w-4" />
                {t("settings")}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
