import { useEffect, useMemo, useState } from "react";
import reportsApi from "@/lib/api/reports";
import { useAuthStore } from "@/stores/authStore";

export default function useTodaysSales() {
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
        // systemAdmin may provide martId via UI; otherwise owner/manager use their martId
        if (
          auth &&
          auth.role !== "system_admin" &&
          auth.role !== "systemAdmin"
        ) {
          // backend will use req.user.martId or cashier restriction; no need to pass martId here
        } else if (auth && auth.role === "system_admin" && auth.martId) {
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
  }, [auth?.role, auth?.martId, token]);

  const mappedItems = useMemo(() => {
    return (items || []).map((p: any) => ({
      id: p.productId || p.id || p.sku || p.name,
      name: p.name || "Unknown",
      qty: Number(p.qty || 0),
      sellingPrice: Number(p.sellingPrice || 0),
      subtotal: Number(p.subtotal || 0),
      vatAmount: Number(p.vatAmount || 0),
      img: p.image || p.imageUrl || "",
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
