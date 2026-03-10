import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useState } from "react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProductStore } from "@/stores/productStore";
import { useAuthStore } from "@/stores/authStore";
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// Chart data is provided by the backend via `metrics.series`.

// topProducts fallback will be defined from metrics or mock later

export default function OwnerDashboard() {
  const { t } = useTranslation();
  const [range, setRange] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const { products, getLowStockProducts, searchProducts } = useProductStore();
  const [search, setSearch] = useState("");

  const API_BASE =
    import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || "";

  const filteredProducts = search ? searchProducts(search) : products;
  const lowStock = getLowStockProducts();

  // Chart data: prefer metrics.series returned by backend
  // Only use real metrics series; do not fall back to mock data here.
  const chartData =
    metrics && Array.isArray(metrics.series) && metrics.series.length > 0
      ? metrics.series.map((s: any) => ({ name: s.date, sales: s.total }))
      : [];

  useEffect(() => {
    let mounted = true;
    const fetchMetrics = async () => {
      setIsLoadingMetrics(true);
      setMetricsError(null);
      try {
        const token = useAuthStore.getState().user?.token;
        console.debug("ManagerDashboard: fetching metrics", {
          API_BASE,
          range,
          tokenPresent: !!token,
        });
        const headers: any = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_BASE}/api/reports/mart?range=${range}`, {
          headers,
        });
        const text = await res.text();
        let json: any = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch (parseErr) {
          console.warn(
            "Failed to parse /api/reports/mart response as JSON",
            parseErr,
            text,
          );
        }
        if (!res.ok) {
          const msg = (json && json.message) || `status ${res.status}`;
          setMetricsError(String(msg));
          console.warn("Failed to fetch metrics", res.status, json || text);
          return;
        }
        console.debug("ManagerDashboard: metrics response", json);
        if (mounted) setMetrics(json);
      } catch (err: any) {
        console.warn("Failed to load owner metrics", err);
        setMetricsError(String(err?.message || err));
      } finally {
        if (mounted) setIsLoadingMetrics(false);
      }
    };
    fetchMetrics();
    return () => {
      mounted = false;
    };
  }, [range, API_BASE]);

  // Fallback: if metrics not available, fetch raw sales and compute series/topProducts client-side
  useEffect(() => {
    const tryFallback = async () => {
      if (metrics || isLoadingMetrics) return;
      try {
        const token = useAuthStore.getState().user?.token;
        const martId = useAuthStore.getState().user?.martId;
        if (!martId) return;
        const headers: any = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        // fetch sales for mart (no date filter for now)
        const res = await fetch(`${API_BASE}/api/sales?martId=${martId}`, {
          headers,
        });
        if (!res.ok) return;
        const sales = await res.json();
        if (!Array.isArray(sales) || sales.length === 0) return;
        const derived = computeMetricsFromSales(sales, range);
        setMetrics(derived);
      } catch (err) {
        // ignore fallback errors
      }
    };
    tryFallback();
  }, [metrics, isLoadingMetrics, range, API_BASE]);

  function computeMetricsFromSales(
    sales: any[],
    rangeKey: "daily" | "weekly" | "monthly",
  ) {
    const now = new Date();
    const buckets: string[] = [];
    const byBucket: Record<string, number> = {};
    if (rangeKey === "daily") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        buckets.push(key);
        byBucket[key] = 0;
      }
    } else if (rangeKey === "weekly") {
      for (let i = 3; i >= 0; i--) {
        const start = new Date(now);
        start.setDate(now.getDate() - i * 7);
        const key = `${start.toISOString().slice(0, 10)}`;
        buckets.push(key);
        byBucket[key] = 0;
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        buckets.push(key);
        byBucket[key] = 0;
      }
    }

    let totalSales = 0;
    const prodAgg: Record<
      string,
      { name: string; sold: number; revenue: number }
    > = {};
    for (const s of sales) {
      const sDate = new Date(s.date || s.createdAt || Date.now());
      let bucketKey = "";
      if (rangeKey === "daily") bucketKey = sDate.toISOString().slice(0, 10);
      else if (rangeKey === "weekly") {
        for (const b of buckets) {
          const start = new Date(b + "T00:00:00.000Z");
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          if (sDate >= start && sDate <= end) {
            bucketKey = b;
            break;
          }
        }
      } else bucketKey = sDate.toISOString().slice(0, 7);

      const saleTotal = Number(s.total || 0);
      totalSales += saleTotal;
      if (
        bucketKey &&
        Object.prototype.hasOwnProperty.call(byBucket, bucketKey)
      ) {
        byBucket[bucketKey] = (byBucket[bucketKey] || 0) + saleTotal;
      }

      for (const it of s.items || []) {
        const pid = it.productId ? String(it.productId) : it.name || "unknown";
        if (!prodAgg[pid])
          prodAgg[pid] = { name: it.name || pid, sold: 0, revenue: 0 };
        prodAgg[pid].sold += Number(it.quantity || 0);
        prodAgg[pid].revenue += Number(
          it.total != null ? it.total : (it.quantity || 0) * (it.price || 0),
        );
      }
    }

    const series = buckets.map((k) => ({ date: k, total: byBucket[k] || 0 }));
    const topProducts = Object.values(prodAgg)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10);
    return {
      start: series.length ? series[0].date : new Date().toISOString(),
      end: series.length
        ? series[series.length - 1].date
        : new Date().toISOString(),
      totalSales,
      transactions: sales.length,
      cogs: 0,
      expenses: 0,
      profit: totalSales,
      topProducts,
      series,
    };
  }

  // (metrics refresh is handled by the range change effect; debug UI removed)

  const stats = [
    {
      title: t("today_sales"),
      value: metrics ? Number(metrics.totalSales || 0).toLocaleString() : "—",
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
      color: "text-primary",
    },
    {
      title: t("transactions"),
      value: metrics ? String(metrics.transactions || 0) : "—",
      change: "+8.2%",
      trend: "up",
      icon: ShoppingCart,
      color: "text-success",
    },
    {
      title: t("products"),
      value: products.length.toString(),
      change: `${lowStock.length} low`,
      trend: "down",
      icon: Package,
      color: "text-warning",
    },
    {
      title: t("profit"),
      value: metrics ? Number(metrics.profit || 0).toLocaleString() : "—",
      change: "+5.3%",
      trend: "up",
      icon: TrendingUp,
      color: "text-chart-2",
    },
  ];

  // Only show actual top products when metrics exists
  const topProducts =
    metrics &&
    Array.isArray(metrics.topProducts) &&
    metrics.topProducts.length > 0
      ? metrics.topProducts.map((p: any) => ({
          name: p.name || p.productId,
          sold: p.sold || 0,
          revenue: p.revenue || 0,
        }))
      : [];

  return (
    <RoleLayout allowedRoles={["manager"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
          <p className="text-muted-foreground">{t("welcome_back_today")}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold mt-1">
                        {stat.value}{" "}
                        {stat.title.includes("Sales") ||
                        stat.title.includes("Profit")
                          ? t("etb")
                          : ""}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {stat.trend === "up" ? (
                          <ArrowUpRight className="h-3 w-3 text-success" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-destructive" />
                        )}
                        <span
                          className={`text-xs ${stat.trend === "up" ? "text-success" : "text-destructive"}`}
                        >
                          {stat.change}
                        </span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl bg-accent ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Sales Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>
                  {(range === "daily"
                    ? t("daily")
                    : range === "monthly"
                      ? t("monthly")
                      : t("weekly")) + ` ${t("sales")}`}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className={`${range === "daily" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"} h-8 px-3`}
                    onClick={() => setRange("daily")}
                  >
                    {t("daily")}
                  </Button>
                  <Button
                    size="sm"
                    className={`${range === "weekly" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"} h-8 px-3`}
                    onClick={() => setRange("weekly")}
                  >
                    {t("weekly")}
                  </Button>
                  <Button
                    size="sm"
                    className={`${range === "monthly" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"} h-8 px-3`}
                    onClick={() => setRange("monthly")}
                  >
                    {t("monthly")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {isLoadingMetrics ? (
                    <div className="flex items-center justify-center h-full">
                      {t("loading_metrics")}
                    </div>
                  ) : metricsError ? (
                    <div className="text-sm text-destructive p-4">
                      {t("failed_load_metrics")}: {metricsError}
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      {t("no_sales_data_selected_range")}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-border"
                        />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="sales"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Products */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t("top_selling")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {isLoadingMetrics ? (
                    <div className="flex items-center justify-center h-full">
                      Loading top products...
                    </div>
                  ) : metricsError ? (
                    <div className="text-sm text-destructive p-4">
                      Failed to load top products: {metricsError}
                    </div>
                  ) : topProducts.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      No top products data available.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProducts} layout="vertical">
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-border"
                        />
                        <XAxis type="number" className="text-xs" />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={100}
                          className="text-xs"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="sold"
                          fill="hsl(var(--primary))"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Debug panel removed for production */}
      </div>
    </RoleLayout>
  );
}
