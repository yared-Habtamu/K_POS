import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import reportsApi from '@/lib/api/reports';

type UseReportsOptions = {
  period?: 'daily' | 'weekly' | 'monthly' | 'custom';
  start?: string;
  end?: string;
};

const defaultShape = () => ({
  totalSales: '0.00',
  totalOrders: 0,
  totalItemsSold: 0,
  avgOrderValue: '0.00',
  grossSales: '0.00',
  netSales: '0.00',
  discounts: '0.00',
  refunds: '0.00',
  taxes: '0.00',
  paymentMethods: { cash: '0.00', card: '0.00', mobile: '0.00', credit: '0.00' },
  topProducts: [] as any[],
  revenue: '0.00',
  cogs: '0.00',
  grossProfit: '0.00',
  grossMargin: 0,
  netProfit: '0.00',
  totalTax: '0.00',
  taxByCategory: [] as any[],
  products: [] as any[],
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
      const params: Record<string, string> = { range: opts.period || 'monthly' };
      if (opts.period === 'custom') {
        if (opts.start) params.start = opts.start;
        if (opts.end) params.end = opts.end;
      }
      if (auth?.martId) params.martId = auth.martId;

      // For owner/manager prefer mart scoped endpoint, fallback to summary
      let summaryJson: any = null;
      if (role === 'owner' || role === 'manager') {
        if (!auth?.martId) throw new Error('martId missing for user');
        try {
          const martResp = await reportsApi.fetchMartReport({ martId: auth.martId!, range: params.range, start: params.start, end: params.end }, token);
          // martResp contains metrics like cogs, expenses, profit, topProducts, series
          summaryJson = { ...martResp };
          // also fetch summary for payment breakdown/counts
          try {
            const s = await reportsApi.fetchSummary({ range: params.range, start: params.start, end: params.end, martId: auth.martId }, token);
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
      const pm = (summaryJson.salesByPaymentMethod || []).reduce((acc: any, p: any) => { acc[p.method] = p.total; return acc; }, {});
      const mapped = {
        totalSales: (summaryJson.totalSales || 0).toFixed ? summaryJson.totalSales.toFixed(2) : String(summaryJson.totalSales || '0.00'),
        totalOrders: summaryJson.count || 0,
        totalItemsSold: summaryJson.totalItemsSold || 0,
        avgOrderValue: summaryJson.count ? ((summaryJson.totalSales || 0) / summaryJson.count).toFixed(2) : '0.00',
        grossSales: (summaryJson.grossSales || 0).toFixed ? summaryJson.grossSales.toFixed(2) : String(summaryJson.grossSales || '0.00'),
        netSales: (summaryJson.totalSales || 0).toFixed ? summaryJson.totalSales.toFixed(2) : String(summaryJson.totalSales || '0.00'),
        discounts: (summaryJson.discountsTotal || summaryJson.discounts || 0).toFixed ? (summaryJson.discountsTotal || summaryJson.discounts || 0).toFixed(2) : String(summaryJson.discountsTotal || summaryJson.discounts || '0.00'),
        refunds: (summaryJson.refunds || 0).toFixed ? (summaryJson.refunds || 0).toFixed(2) : String(summaryJson.refunds || '0.00'),
        taxes: (summaryJson.totalTax || 0).toFixed ? (summaryJson.totalTax || 0).toFixed(2) : String(summaryJson.totalTax || '0.00'),
        paymentMethods: {
          cash: (pm.cash || pm['cash'] || 0).toFixed ? (pm.cash || pm['cash'] || 0).toFixed(2) : String(pm.cash || pm['cash'] || 0),
          card: (pm.card || pm['card'] || 0).toFixed ? (pm.card || pm['card'] || 0).toFixed(2) : String(pm.card || pm['card'] || 0),
          mobile: (pm.telebirr || pm.mobile || pm['mobile'] || 0).toFixed ? (pm.telebirr || pm.mobile || pm['mobile'] || 0).toFixed(2) : String(pm.telebirr || pm.mobile || pm['mobile'] || 0),
          credit: (pm.credit || pm['credit'] || 0).toFixed ? (pm.credit || pm['credit'] || 0).toFixed(2) : String(pm.credit || pm['credit'] || 0),
        },
        topProducts: (summaryJson.topProducts || []).map((p: any) => ({ name: p.name || p.productName || p.title || 'Unknown', sold: Number(p.sold ?? p.quantity ?? p.totalSold ?? 0), revenue: Number(p.revenue ?? p.total ?? 0) })),
        revenue: (summaryJson.totalSales || 0).toFixed ? summaryJson.totalSales.toFixed(2) : String(summaryJson.totalSales || '0.00'),
        cogs: (summaryJson.cogs || 0).toFixed ? summaryJson.cogs.toFixed(2) : String(summaryJson.cogs || '0.00'),
        grossProfit: (summaryJson.grossSales || summaryJson.grossProfit || 0).toFixed ? (summaryJson.grossSales || summaryJson.grossProfit || 0).toFixed(2) : String(summaryJson.grossSales || summaryJson.grossProfit || '0.00'),
        grossMargin: summaryJson.grossMargin || 0,
        netProfit: (summaryJson.profit || summaryJson.netProfit || 0).toFixed ? (summaryJson.profit || summaryJson.netProfit || 0).toFixed(2) : String(summaryJson.profit || summaryJson.netProfit || '0.00'),
        totalTax: (summaryJson.totalTax || 0).toFixed ? (summaryJson.totalTax || 0).toFixed(2) : String(summaryJson.totalTax || '0.00'),
        taxByCategory: summaryJson.taxByCategory || [],
        products: summaryJson.products || [],
      };

      setData(mapped);
    } catch (e: any) {
      console.error('useReports error', e);
      setError(e?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [opts.period, opts.start, opts.end, auth?.martId, role, token]);

  useEffect(() => { fetch(); }, [fetch]);

  return useMemo(() => ({ data, loading, error, refetch: fetch }), [data, loading, error, fetch]);
}

export default useReports;
