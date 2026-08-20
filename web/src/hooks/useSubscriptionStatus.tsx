import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from "react";
import { useAuthStore } from "@/stores/authStore";

type SubscriptionState = {
  loaded: boolean;
  isTrial: boolean;
  isExpired: boolean;
  isWarning: boolean;
  subscriptionStatus: string;
  daysLeft: number | null;
  packageName: string | null;
  startDate: string | null;
  endDate: string | null;
};

const defaultState: SubscriptionState = {
  loaded: false,
  isTrial: false,
  isExpired: false,
  isWarning: false,
  subscriptionStatus: "active",
  daysLeft: null,
  packageName: null,
  startDate: null,
  endDate: null,
};

const SubscriptionContext = createContext<SubscriptionState>(defaultState);

export function useSubscriptionStatus() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const auth = useAuthStore((s) => s.user);
  const [state, setState] = useState<SubscriptionState>(defaultState);

  const checkStatus = useCallback(async () => {
    if (!auth?.token || auth.role !== "owner") {
      setState({ ...defaultState, loaded: true });
      return;
    }

    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${API_BASE}/api/subscriptions/my-status`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        setState({ ...defaultState, loaded: true });
        return;
      }

      const data = await res.json();
      const sub = data.subscription;
      if (!sub) {
        setState({ ...defaultState, loaded: true });
        return;
      }

      const status = sub.subscriptionStatus || sub.status || "active";
      const expired = status === "suspended" || sub.status === "suspended";
      const warning = status === "warning";

      setState({
        loaded: true,
        isTrial: Boolean(sub.isTrial),
        isExpired: expired,
        isWarning: warning,
        subscriptionStatus: status,
        daysLeft: typeof sub.daysLeft === "number" ? sub.daysLeft : null,
        packageName: sub.packageName || null,
        startDate: sub.startDate || null,
        endDate: sub.endDate || null,
      });
    } catch (err) {
      console.error("Failed to check subscription status", err);
      setState({ ...defaultState, loaded: true });
    }
  }, [auth?.token, auth?.role]);

  useEffect(() => {
    checkStatus();
    // Re-check every 2 minutes to stay current
    const interval = setInterval(checkStatus, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return (
    <SubscriptionContext.Provider value={state}>
      {children}
    </SubscriptionContext.Provider>
  );
}
