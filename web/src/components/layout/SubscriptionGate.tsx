import { formatLocalizedDate } from "@/utils/ethiopian-calendar";
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useAuthStore } from "@/stores/authStore";
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * SubscriptionGate wraps all owner routes.
 * When the subscription/trial has expired, it blocks all pages EXCEPT
 * the subscription page itself, forcing the owner to renew.
 * It also shows a warning banner when the subscription is about to expire.
 */
export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const auth = useAuthStore((s) => s.user);
  const sub = useSubscriptionStatus();
  const navigate = useNavigate();
  const location = useLocation();

  const isOwner = auth?.role === "owner";
  const isSubscriptionPage = location.pathname === "/owner/subscription";

  // If not owner, or sub not loaded yet, just render children
  if (!isOwner || !sub.loaded) {
    return <>{children}</>;
  }

  // If on the subscription page, always allow access (so they can pay)
  if (isSubscriptionPage) {
    return <>{children}</>;
  }

  // If expired → show full-screen lock overlay
  if (sub.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-lg w-full space-y-6">
          {/* Lock Card */}
          <div className="rounded-2xl border-2 border-destructive/40 bg-card shadow-2xl overflow-hidden">
            {/* Red top bar */}
            <div className="h-2 w-full bg-gradient-to-r from-destructive via-red-500 to-orange-500" />

            <div className="p-8 text-center space-y-5">
              {/* Lock Icon */}
              <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="w-10 h-10 text-destructive" />
              </div>

              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {sub.isTrial ? t("trial_expired") : t("subscription_expired")}
                </h1>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {t("expired_restriction_msg")}
                </p>
              </div>

              {/* Expiry Info */}
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
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

              {/* CTA Button */}
              <Button
                size="lg"
                onClick={() => navigate("/owner/subscription")}
                className="w-full gap-2.5 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg"
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
      </div>
    );
  }

  // If warning (expiring soon) → show a dismissable top banner + render children
  if (sub.isWarning) {
    return (
      <>
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-3 sticky top-0 z-50">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-foreground/90 truncate">
              <span className="font-semibold text-amber-600">{t("expiring_soon")}:</span>{" "}
              {sub.daysLeft !== null
                ? `${sub.daysLeft} ${t("days")} ${t("days_remaining").toLowerCase()}`
                : t("expiring_soon")}
              {" — "}
              {sub.isTrial
                ? t("trial_expired").replace("Expired", "Ending")
                : t("subscription_expired").replace("Expired", "Ending")}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/owner/subscription")}
            className="shrink-0 gap-1.5 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 text-xs"
          >
            <CreditCard className="w-3.5 h-3.5" />
            {t("select_and_pay")}
          </Button>
        </div>
        {children}
      </>
    );
  }

  // Active subscription → render normally
  return <>{children}</>;
}
