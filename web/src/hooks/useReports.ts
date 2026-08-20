import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import reportsApi from "@/lib/api/reports";

type UseReportsOptions = {
  period?: "daily" | "weekly" | "monthly" | "custom";
  start?: string;
  end?: string;
};

const defaultShape = () => ({
  totalSales: "0.00",
  totalOrders: 0,
  totalItemsSold: 0,
  avgOrderValue: "0.00",
  grossSales: "0.00",
  netSales: "0.00",
  discounts: "0.00",
  refunds: "0.00",
  taxes: "0.00",
  paymentMethods: {
    cash: "0.00",
    card: "0.00",
    mobile: "0.00",
    credit: "0.00",
  },
  topProducts: [] as any[],
  revenue: "0.00",
  cogs: "0.00",
  grossProfit: "0.00",
  grossMargin: 0,
  netProfit: "0.00",
  totalTax: "0.00",
  taxByCategory: [] as any[],
  products: [] as any[],
  expiredProductsCount: 0,
  expiredProducts: [] as any[],
  brokenAssetsCount: 0,
  brokenAssets: [] as any[],
});

export function useReports(opts: UseReportsOptions = {}) {
  const auth = useAuthStore((s) => s.user);
  const token = auth?.token;
  const role = auth?.role;

  const [data, setData] = useState(() => defaultShape());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        range: opts.period || "monthly",
      };
      if (opts.period === "custom") {
        if (opts.start) params.start = opts.start;
        if (opts.end) params.end = opts.end;
      }
      if (auth?.martId) params.martId = auth.martId;

      // For owner/manager prefer mart scoped endpoint, fallback to summary
      let summaryJson: any = null;
      if (role === "owner" || role === "manager") {
        if (!auth?.martId) throw new Error("martId missing for user");
        try {
          const martResp = await reportsApi.fetchMartReport(
            {
              martId: auth.martId!,
              range: params.range,
              start: params.start,
              end: params.end,
            },
            token,
          );
          // martResp contains metrics like cogs, expenses, profit, topProducts, series
          summaryJson = { ...martResp };
          // also fetch summary for payment breakdown/counts
          try {
            const s = await reportsApi.fetchSummary(
              {
                range: params.range,
                start: params.start,
                end: params.end,
                martId: auth.martId,
              },
              token,
            );
            summaryJson = { ...summaryJson, ...s };
          } catch (_) {
            // ignore secondary failure
          }
        } catch (e) {
          // if mart route fails, fall back to summary
          summaryJson = await reportsApi.fetchSummary(params, token);
        }
      } else {
        summaryJson = await reportsApi.fetchSummary(params, token);
      }

      // map to UI-friendly shape
      const pm = (summaryJson.salesByPaymentMethod || []).reduce(
        (acc: any, p: any) => {
          if (p && p.method) {
            acc[p.method] = Number(p.total || 0);
          }
          return acc;
        },
        {},
      );

      const dynamicPaymentMethods: Record<string, string> = {};
      Object.keys(pm).forEach((k) => {
        dynamicPaymentMethods[k] = Number(pm[k] || 0).toFixed(2);
      });

      const mapped = {
        totalSales: (summaryJson.totalSales || 0).toFixed
          ? summaryJson.totalSales.toFixed(2)
          : String(summaryJson.totalSales || "0.00"),
        totalOrders: summaryJson.count || 0,
        totalItemsSold: summaryJson.totalItemsSold || 0,
        avgOrderValue: summaryJson.count
          ? ((summaryJson.totalSales || 0) / summaryJson.count).toFixed(2)
          : "0.00",
        grossSales: (summaryJson.grossSales || 0).toFixed
          ? summaryJson.grossSales.toFixed(2)
          : String(summaryJson.grossSales || "0.00"),
        netSales: (summaryJson.totalSales || 0).toFixed
          ? summaryJson.totalSales.toFixed(2)
          : String(summaryJson.totalSales || "0.00"),
        discounts: (summaryJson.discountsTotal || summaryJson.discounts || 0)
          .toFixed
          ? (summaryJson.discountsTotal || summaryJson.discounts || 0).toFixed(
              2,
            )
          : String(
              summaryJson.discountsTotal || summaryJson.discounts || "0.00",
            ),
        refunds: (summaryJson.refunds || 0).toFixed
          ? (summaryJson.refunds || 0).toFixed(2)
          : String(summaryJson.refunds || "0.00"),
        taxes: (summaryJson.totalTax || 0).toFixed
          ? (summaryJson.totalTax || 0).toFixed(2)
          : String(summaryJson.totalTax || "0.00"),
        salesByPaymentMethod: Array.isArray(summaryJson.salesByPaymentMethod)
          ? summaryJson.salesByPaymentMethod.map((item: any) => ({
              method: String(item.method || "").toLowerCase(),
              total: Number(item.total || 0),
            }))
          : Object.entries(pm).map(([method, total]) => ({
              method,
              total: Number(total || 0),
            })),
        paymentMethods: dynamicPaymentMethods,
        topProducts: (summaryJson.topProducts || []).map((p: any) => ({
          name: p.name || p.productName || p.title || "Unknown",
          sold: Number(p.sold ?? p.quantity ?? p.totalSold ?? 0),
          revenue: Number(p.revenue ?? p.total ?? 0),
        })),
        revenue: (summaryJson.totalSales || 0).toFixed
          ? summaryJson.totalSales.toFixed(2)
          : String(summaryJson.totalSales || "0.00"),
        cogs: (summaryJson.cogs || 0).toFixed
          ? summaryJson.cogs.toFixed(2)
          : String(summaryJson.cogs || "0.00"),
        // Gross profit: prefer explicit grossSales/grossProfit, otherwise compute from totalSales - cogs
        grossProfit: (() => {
          const gp =
            summaryJson.grossSales || summaryJson.grossProfit ||
            (summaryJson.totalSales != null && summaryJson.cogs != null
              ? summaryJson.totalSales - summaryJson.cogs
              : undefined);
          return gp != null
            ? (Number(gp) || 0).toFixed(2)
            : "0.00";
        })(),
        grossMargin: summaryJson.grossMargin || 0,
        // Expenses: mart endpoint returns `expenses`; summary endpoint may not
        expenses: (summaryJson.expenses || summaryJson.totalExpenses || 0).toFixed
          ? (summaryJson.expenses || summaryJson.totalExpenses || 0).toFixed(2)
          : String(summaryJson.expenses || summaryJson.totalExpenses || "0.00"),
        // Net profit: prefer explicit profit (mart endpoint), otherwise grossProfit - expenses
        netProfit: (() => {
          if (summaryJson.profit != null || summaryJson.netProfit != null)
            return (summaryJson.profit || summaryJson.netProfit || 0).toFixed
              ? (summaryJson.profit || summaryJson.netProfit || 0).toFixed(2)
              : String(summaryJson.profit || summaryJson.netProfit || "0.00");
          const gpVal =
            summaryJson.grossSales || summaryJson.grossProfit ||
            (summaryJson.totalSales != null && summaryJson.cogs != null
              ? summaryJson.totalSales - summaryJson.cogs
              : 0);
          const expensesVal = summaryJson.expenses || summaryJson.totalExpenses || 0;
          const net = (Number(gpVal || 0) - Number(expensesVal || 0)) || 0;
          return Number(net).toFixed(2);
        })(),
        totalTax: (summaryJson.totalTax || 0).toFixed
          ? (summaryJson.totalTax || 0).toFixed(2)
          : String(summaryJson.totalTax || "0.00"),
        taxByCategory: summaryJson.taxByCategory || [],
        products: summaryJson.products || [],
        expiredProductsCount: Number(summaryJson.expiredProductsCount || 0),
        expiredProducts: summaryJson.expiredProducts || [],
        brokenAssetsCount: Number(summaryJson.brokenAssetsCount || 0),
        brokenAssets: summaryJson.brokenAssets || [],
      };

      setData(mapped);
    } catch (e: any) {
      console.error("useReports error", e);
      setError(e?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [opts.period, opts.start, opts.end, auth?.martId, role, token]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return useMemo(
    () => ({ data, loading, error, refetch: fetch }),
    [data, loading, error, fetch],
  );
}

export default useReports;
