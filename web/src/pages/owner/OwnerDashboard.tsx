import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// removed unused header icons (Invite / Register buttons removed)
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardInsights } from "@/components/reports/DashboardInsights";
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

// Metrics will be fetched from the backend (/api/reports/mart)

export default function OwnerDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [range, setRange] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const API_BASE =
    import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || "";
  const {
    products,
    getAlertProducts,
    searchProducts,
    isLoading: productsLoading,
    fetchError,
  } = useProductStore();
  const [search, setSearch] = useState("");

  const filteredProducts = search ? searchProducts(search) : products;
  const alerts = fetchError ? [] : getAlertProducts();
  const chartData =
    metrics && Array.isArray(metrics.series) && metrics.series.length > 0
      ? metrics.series.map((s: any) => ({ name: s.date, sales: s.total }))
      : [];

  const topProducts =
    metrics && Array.isArray(metrics.topProducts)
      ? metrics.topProducts.map((p: any) => ({
          name: p.name || p.productName || (p.product && p.product.name) || "—",
          sold: p.sold || p.quantity || p.count || 0,
        }))
      : [];

  useEffect(() => {
    let mounted = true;
    const fetchMetrics = async () => {
      setIsLoadingMetrics(true);
      setMetricsError(null);
      try {
        const token = useAuthStore.getState().user?.token;
        console.debug("OwnerDashboard: fetching metrics", {
          API_BASE,
          range,
          tokenPresent: !!token,
        });
        if (!token) {
          setMetricsError("Not authenticated: please login");
          return;
        }
        const headers: any = { Authorization: `Bearer ${token}` };
        const res = await fetch(`${API_BASE}/api/reports/mart?range=${range}`, {
          headers,
        });
        const text = await res.text();
        let json: any = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch (e) {
          json = null;
        }
        if (!res.ok) {
          const msg = (json && json.message) || `status ${res.status}`;
          if (res.status === 401) {
            setMetricsError("Unauthorized: please login again");
            useAuthStore.getState().logout();
          } else {
            setMetricsError(String(msg));
          }
          return;
        }
        if (mounted) setMetrics(json);
      } catch (err: any) {
        setMetricsError(String(err?.message || err));
      } finally {
        if (mounted) setIsLoadingMetrics(false);
      }
    };
    void fetchMetrics();
    const intervalId = window.setInterval(fetchMetrics, 30_000);
    window.addEventListener("focus", fetchMetrics);

    // ensure products are loaded for dashboard counts
    (async () => {
      try {
        await (useProductStore.getState().fetchProducts?.() as Promise<void>);
      } catch (e) {
        // ignore here; product store exposes fetchError for UI to react to
      }
    })();
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", fetchMetrics);
    };
  }, [range, API_BASE]);

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
      value: fetchError
        ? "Failed"
        : productsLoading
          ? "Loading..."
          : products.length.toString(),
      change: fetchError ? "Failed to load" : `${alerts.length} low/exp`,
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

  return (
    <RoleLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
              <p className="text-muted-foreground">{t("welcome_back_today")}</p>
              {fetchError && (
                <div className="mt-2 text-sm text-destructive">
                  Failed to load products: {fetchError}
                </div>
              )}
            </div>
            {/* Owner actions removed: Invite Owner and Register a Mart buttons intentionally hidden for owner role */}
          </div>
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
                          className={`text-xs ${
                            stat.trend === "up"
                              ? "text-success"
                              : "text-destructive"
                          }`}
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
                    className={`${
                      range === "daily"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground"
                    } h-8 px-3`}
                    onClick={() => setRange("daily")}
                  >
                    {t("daily")}
                  </Button>
                  <Button
                    size="sm"
                    className={`${
                      range === "weekly"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground"
                    } h-8 px-3`}
                    onClick={() => setRange("weekly")}
                  >
                    {t("weekly")}
                  </Button>
                  <Button
                    size="sm"
                    className={`${
                      range === "monthly"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground"
                    } h-8 px-3`}
                    onClick={() => setRange("monthly")}
                  >
                    {t("monthly")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
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
                      {metricsError &&
                        metricsError.toLowerCase().includes("unauthorized") && (
                          <div className="mt-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate("/login")}
                            >
                              Login
                            </Button>
                          </div>
                        )}
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <DashboardInsights
            metrics={metrics}
            isLoadingMetrics={isLoadingMetrics}
            metricsError={metricsError}
          />
        </motion.div>
      </div>
    </RoleLayout>
  );
}
