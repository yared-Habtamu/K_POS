import { formatLocalizedDate } from "@/utils/ethiopian-calendar";
import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, ShieldAlert, CreditCard, Sparkles, Lock } from "lucide-react";
import type { UserRole } from "@/types";

let authHydrationGatePassed = false;

interface RoleLayoutProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export function RoleLayout({ children, allowedRoles }: RoleLayoutProps) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);
  const { user, isAuthenticated, isHydrated } = useAuthStore();
  const sub = useSubscriptionStatus();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isHydrated) return;

    const timeoutId = window.setTimeout(() => {
      setHydrationTimedOut(true);
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [isHydrated]);

  useEffect(() => {
    if (isHydrated || hydrationTimedOut) {
      authHydrationGatePassed = true;
    }
  }, [isHydrated, hydrationTimedOut]);

  if (!authHydrationGatePassed && !isHydrated && !hydrationTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to their own dashboard
    const roleDashboards: Record<UserRole, string> = {
      system_admin: "/admin",
      owner: "/owner",
      manager: "/manager",
      cashier: "/cashier",
      store_keeper: "/store-keeper",
    };
    return <Navigate to={roleDashboards[user.role]} replace />;
  }

  const isOwner = user.role === "owner";
  const isSystemAdmin = user.role === "system_admin";
  const isSubscriptionPage = location.pathname === "/owner/subscription";

  // Check if store subscription is expired/suspended
  const isExpired = !isSystemAdmin && sub.loaded && sub.isExpired;

  // Render Paywall Lock for non-admin users when subscription is expired
  const renderSubscriptionLock = () => {
    if (isOwner) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-2xl border-2 border-destructive/40 bg-card shadow-2xl overflow-hidden">
            <div className="h-2 w-full bg-gradient-to-r from-destructive via-red-500 to-orange-500" />
            <div className="p-8 text-center space-y-5">
              <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="w-10 h-10 text-destructive" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {sub.isTrial ? t("trial_expired") : t("subscription_expired")}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {t("expired_restriction_msg")}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground flex-wrap">
                {sub.packageName && (
                  <Badge variant="outline" className="gap-1.5 px-3 py-1">
                    <Sparkles className="w-3 h-3" />
                    {sub.packageName}
                  </Badge>
                )}
                {sub.endDate && (
                  <Badge variant="destructive" className="gap-1.5 px-3 py-1">
                    <Clock className="w-3 h-3" />
                    {t("expired_label")}: {formatLocalizedDate(sub.endDate)}
                  </Badge>
                )}
              </div>

              <Button
                size="lg"
                onClick={() => navigate("/owner/subscription")}
                className="w-full gap-2.5 text-base font-semibold shadow-lg"
              >
                <CreditCard className="w-5 h-5" />
                {t("select_and_pay")}
              </Button>

              <p className="text-xs text-muted-foreground">
                {t("payment_review_note")}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // For employees (cashier, manager, store keeper)
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border bg-card shadow-xl p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Store Operations Locked</h2>
          <p className="text-sm text-muted-foreground">
            The subscription license for this store has expired. Please contact the store owner to renew the subscription.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex w-full bg-background overflow-hidden">
      <Sidebar
        role={user.role}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Header onToggleSidebar={() => setMobileOpen(true)} />

        {/* Warning Banner when nearing expiration (e.g. 5 days remaining) */}
        {!isSystemAdmin && sub.loaded && sub.isWarning && !isExpired && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-3 shrink-0 z-20">
            <div className="flex items-center gap-2 min-w-0 text-xs sm:text-sm text-foreground/90 truncate">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate">
                <strong>{t("expiring_soon")}:</strong>{" "}
                {sub.daysLeft !== null
                  ? `${sub.daysLeft} ${t("days")} ${t("days_remaining").toLowerCase()}`
                  : t("expiring_soon")}
                {" — "}
                {sub.isTrial ? t("seven_day_free_trial") : t("active_subscription")}
              </span>
            </div>
            {isOwner && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/owner/subscription")}
                className="shrink-0 gap-1.5 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 text-xs h-7 px-2.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                {t("select_and_pay")}
              </Button>
            )}
          </div>
        )}

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6">
          <div className="w-full max-w-full">
            {/* If expired and not on the subscription renewal page, render the paywall lock */}
            {isExpired && !isSubscriptionPage ? renderSubscriptionLock() : children}
          </div>
        </main>
      </div>
    </div>
  );
}
