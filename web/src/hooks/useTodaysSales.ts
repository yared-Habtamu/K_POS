import { useEffect, useMemo, useState } from "react";
import reportsApi from "@/lib/api/reports";
import { useAuthStore } from "@/stores/authStore";

export default function useTodaysSales(date?: string) {
  const auth = useAuthStore((s) => s.user);
  const token = auth?.token;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params: any = {};
        if (date) {
          params.date = date;
        }
        if (auth?.martId) {
          params.martId = auth.martId;
        }
        // systemAdmin may provide martId via UI; otherwise owner/manager use their martId
        if (auth && auth.role === "system_admin" && auth.martId) {
          params.martId = auth.martId;
        }

        const res = await reportsApi.fetchTodaysSales(params, token);
        if (!mounted) return;
        setItems(res.items || []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || String(e));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [auth?.role, auth?.martId, date, token]);

  const mappedItems = useMemo(() => {
    return (items || []).map((p: any) => ({
      id: `${p.productId || p.id || p.sku || p.name}-${p.soldById || p.soldByName || ''}-${p.paymentMethod || ''}`,
      name: p.name || "Unknown",
      qty: Number(p.qty || 0),
      sellingPrice: Number(p.sellingPrice || 0),
      subtotal: Number(p.subtotal || 0),
      vatAmount: Number(p.vatAmount || 0),
      img: p.image || p.imageUrl || "",
      paymentMethod: p.paymentMethod || "unknown",
      soldById: p.soldById || null,
      soldByName: p.soldByName || p.soldBy || "unknown",
      total: Number(
        p.total || Number(p.subtotal || 0) + Number(p.vatAmount || 0),
      ),
    }));
  }, [items]);

  const totals = useMemo(() => {
    const totalItemsSold = mappedItems.reduce((s, it) => s + (it.qty || 0), 0);
    const totalBeforeVat = mappedItems.reduce(
      (s, it) => s + (it.subtotal || 0),
      0,
    );
    const totalVat = mappedItems.reduce((s, it) => s + (it.vatAmount || 0), 0);
    const grandTotal = mappedItems.reduce((s, it) => s + (it.total || 0), 0);
    return { totalItemsSold, totalBeforeVat, totalVat, grandTotal };
  }, [mappedItems]);

  return {
    items: mappedItems,
    totals,
    loading,
    error,
    refetch: async () => {
      /* simple refetch by re-running effect */
    },
  };
}
