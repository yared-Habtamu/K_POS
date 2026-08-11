import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { buildLastSaleDates } from "@/utils/agingStock";

/**
 * Fetches the mart's sales and builds a `productId -> latest sale date` map,
 * used by the aging / slow-moving stock alert.
 */
export function useLastSaleDates(): Map<string, string> {
  const user = useAuthStore((s) => s.user);
  const [lastSaleDates, setLastSaleDates] = useState<Map<string, string>>(
    () => new Map(),
  );

  useEffect(() => {
    const martId = user?.martId;
    const token = user?.token;
    if (!martId || !token) return;

    let cancelled = false;
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

    fetch(`${API_BASE}/api/sales?martId=${martId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((sales) => {
        if (!cancelled) setLastSaleDates(buildLastSaleDates(sales));
      })
      .catch(() => {
        /* keep empty map on failure */
      });

    return () => {
      cancelled = true;
    };
  }, [user?.martId, user?.token]);

  return lastSaleDates;
}
