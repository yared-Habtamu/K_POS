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
    return (items || []).map((p: any) => {
      const qty = Number(p.qty || 0);
      const subtotal = Number(p.subtotal || 0);
      const vatAmount = Number(p.vatAmount || 0);
      const total = Number(
        p.total || subtotal + vatAmount,
      );
      const weightedSellingPrice = qty > 0 ? subtotal / qty : Number(p.sellingPrice || 0);
      // Row shows the product's current updated price when known, falling back
      // to the sale-time average for legacy/free-text items.
      const rowSellingPrice =
        p.currentPrice != null && p.currentPrice !== undefined
          ? Number(p.currentPrice)
          : weightedSellingPrice;
      return {
        id: `${p.productId || p.id || p.sku || p.name}-${p.soldById || p.soldByName || ''}-${p.soldByRole || ''}-${p.paymentMethod || ''}`,
        name: p.name || "Unknown",
        qty,
        sellingPrice: rowSellingPrice,
        subtotal,
        vatAmount,
        img: p.image || p.imageUrl || "",
        paymentMethod: p.paymentMethod || "unknown",
        paymentMethods: Array.isArray(p.paymentMethods) ? p.paymentMethods : (p.paymentMethod ? [p.paymentMethod] : []),
        soldById: p.soldById || null,
        soldByName: p.soldByName || p.soldBy || "unknown",
        soldByRole: p.soldByRole || "cashier",
        date: p.date || p.lastSaleDate || "",
        total,
        priceTiers: Array.isArray(p.priceTiers)
          ? p.priceTiers.map((tier: any) => ({
              price: Number(tier.price || 0),
              qty: Number(tier.qty || 0),
              subtotal: Number(tier.subtotal || 0),
            }))
          : [],
        details: Array.isArray(p.details)
          ? p.details.map((line: any) => ({
              soldById: line.soldById || null,
              soldByName: line.soldByName || line.soldBy || "unknown",
              soldByRole: line.soldByRole || p.soldByRole || "cashier",
              paymentMethod: String(line.paymentMethod || "unknown"),
              price: Number(line.price || 0),
              qty: Number(line.qty || 0),
              subtotal: Number(line.subtotal || 0),
              vat: Number(line.vat || 0),
              total: Number(line.total || 0),
              date: line.date || p.date || p.lastSaleDate || "",
            }))
          : [],
      };
    });
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
