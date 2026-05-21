import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Package,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Search,
  Building2,
  BarChart3,
  ShoppingCart,
  Users,
  Wallet,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  XCircle,
  Eye,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

const CHART_COLORS = [
  "hsl(217 60% 30%)", // Primary Navy
  "hsl(217 60% 45%)", // Lighter Navy
  "hsl(262 80% 55%)", // Purple
  "hsl(262 80% 65%)", // Lighter Purple
  "hsl(38 92% 50%)", // Amber
  "hsl(142 76% 36%)", // Green
  "hsl(0 84% 60%)", // Red
  "hsl(217 33% 40%)", // Muted Slate
  "hsl(217 33% 20%)", // Dark Slate
  "hsl(217 60% 20%)", // Deeper Navy
];

type Platform = {
  totalProducts: number;
  totalInventoryValue: number;
  totalSellingValue: number;
  overallAvgMargin: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalMonthlySales: number;
  totalMonthlyExpenses: number;
  totalMonthlyProfit: number;
  totalTransactions: number;
  totalMarts: number;
  totalUsers: number;
};

type MartAnalytic = {
  martId: string;
  martName: string;
  productCount: number;
  inventoryValue: number;
  sellingValue: number;
  avgMargin: number;
  monthlySales: number;
  monthlyExpenses: number;
  profit: number;
  userCount: number;
};

type TopProduct = {
  name: string;
  martName: string;
  purchasePrice: number;
  sellingPrice: number;
  margin?: number;
  category?: string;
};

type CategoryDist = {
  category: string;
  count: number;
};

type ProductRow = {
  _id: string;
  name: string;
  category: string;
  martName: string;
  martId: string;
  purchasePrice: number;
  sellingPrice: number;
  margin: number;
  quantity: number;
  stockStatus: string;
};

type AnalyticsData = {
  platform: Platform;
  martAnalytics: MartAnalytic[];
  topMarginProducts: TopProduct[];
  topExpensiveProducts: TopProduct[];
  categoryDistribution: CategoryDist[];
  products: ProductRow[];
};

const fmt = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}K`
      : n.toFixed(0);

const fmtCurrency = (n: number) => `${fmt(n)} ETB`;

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const auth = useAuthStore((s) => s.user);
  const API_BASE =
    import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || "";

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [martSearch, setMartSearch] = useState("");
  const [martFilter, setMartFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const headers: Record<string, string> = {};
        if (auth?.token) headers["Authorization"] = `Bearer ${auth.token}`;
        const res = await fetch(`${API_BASE}/api/reports/admin-analytics`, {
          headers,
        });
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const json: AnalyticsData = await res.json();
        setData(json);
      } catch (err: unknown) {
        console.error("Failed to load admin analytics", err);
        setError(
          err instanceof Error ? err.message : "Failed to load analytics",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [API_BASE, auth]);

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    let list = data.products;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.martName.toLowerCase().includes(q),
      );
    }
    if (martFilter !== "all") {
      list = list.filter((p) => p.martId === martFilter);
    }
    if (stockFilter !== "all") {
      list = list.filter((p) => p.stockStatus === stockFilter);
    }
    if (categoryFilter !== "all") {
      list = list.filter((p) => p.category === categoryFilter);
    }
    return list;
  }, [data, search, martFilter, stockFilter, categoryFilter]);

  const totalPages = Math.ceil(filteredProducts.length / ROWS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE,
  );

  const filteredMarts = useMemo(() => {
    if (!data) return [];
    if (!martSearch) return data.martAnalytics;
    const q = martSearch.toLowerCase();
    return data.martAnalytics.filter((m) =>
      m.martName.toLowerCase().includes(q),
    );
  }, [data, martSearch]);

  useEffect(() => {
    setPage(1);
  }, [search, martFilter, stockFilter, categoryFilter]);

  if (loading) {
    return (
      <RoleLayout allowedRoles={["system_admin"]}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">
              Loading analytics...
            </p>
          </div>
        </div>
      </RoleLayout>
    );
  }

  if (error || !data) {
    return (
      <RoleLayout allowedRoles={["system_admin"]}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-2">
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-destructive font-medium">
              {error || "No data available"}
            </p>
          </div>
        </div>
      </RoleLayout>
    );
  }

  const p = data.platform;

  const statCards = [
    {
      label: "Total Products",
      value: p.totalProducts.toLocaleString(),
      icon: Package,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
    {
      label: "Inventory Value",
      value: fmtCurrency(p.totalInventoryValue),
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Selling Value",
      value: fmtCurrency(p.totalSellingValue),
      icon: TrendingUp,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
    {
      label: "Avg Margin",
      value: `${p.overallAvgMargin.toFixed(1)}%`,
      icon: BarChart3,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Monthly Sales",
      value: fmtCurrency(p.totalMonthlySales),
      icon: ShoppingCart,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Monthly Profit",
      value: fmtCurrency(p.totalMonthlyProfit),
      icon: p.totalMonthlyProfit >= 0 ? ArrowUpRight : ArrowDownRight,
      color: p.totalMonthlyProfit >= 0 ? "text-success" : "text-destructive",
      bg: p.totalMonthlyProfit >= 0 ? "bg-success/10" : "bg-destructive/10",
    },
    {
      label: "Active Marts",
      value: p.totalMarts.toString(),
      icon: Building2,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      label: "Low Stock Alerts",
      value: (p.lowStockCount + p.outOfStockCount).toString(),
      icon: AlertTriangle,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  };

  return (
    <RoleLayout allowedRoles={["system_admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Platform Analytics</h1>
          <p className="text-muted-foreground">
            Deep insights across all marts — products, pricing, margins &
            performance
          </p>
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {statCards.map((c) => (
            <Card key={c.label} className="border border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">
                      {c.label}
                    </p>
                    <p className="text-lg font-bold mt-0.5 truncate">
                      {c.value}
                    </p>
                  </div>
                  <div className={`p-2 rounded-xl ${c.bg} shrink-0`}>
                    <c.icon className={`h-5 w-5 ${c.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-card border-none glass">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Mart Revenue Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.martAnalytics.slice(0, 10)}
                    layout="vertical"
                    margin={{ left: 10, right: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      className="text-xs"
                      tickFormatter={(v) => fmt(v)}
                    />
                    <YAxis
                      dataKey="martName"
                      type="category"
                      className="text-xs font-medium"
                      width={100}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: "hsl(var(--primary)/0.05)" }}
                      formatter={(v: number) => [
                        `${v.toLocaleString()} ETB`,
                        "",
                      ]}
                    />
                    <Bar
                      dataKey="monthlySales"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                      name="Sales"
                      barSize={12}
                    />
                    <Bar
                      dataKey="monthlyExpenses"
                      fill="hsl(var(--destructive))"
                      radius={[0, 4, 4, 0]}
                      name="Expenses"
                      barSize={12}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-none glass">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Category Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categoryDistribution}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="40%"
                      outerRadius={80}
                      innerRadius={50}
                      paddingAngle={4}
                      label={({ category, percent }) =>
                        `${category} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {data.categoryDistribution.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                          className="stroke-background hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: "11px", paddingTop: "20px" }}
                      formatter={(val) =>
                        String(val).length > 20
                          ? String(val).slice(0, 20) + "…"
                          : val
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card border-none glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              All Products
              <Badge
                variant="secondary"
                className="ml-1 bg-primary/10 text-primary border-none"
              >
                {filteredProducts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products, categories, marts..."
                  className="pl-9 bg-muted/30 border-none focus-visible:ring-primary/20"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={martFilter} onValueChange={setMartFilter}>
                  <SelectTrigger className="w-[160px] bg-muted/30 border-none">
                    <SelectValue placeholder="All Marts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Marts</SelectItem>
                    {data.martAnalytics.map((m) => (
                      <SelectItem key={m.martId} value={m.martId}>
                        {m.martName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-[160px] bg-muted/30 border-none">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {data.categoryDistribution.map((c) => (
                      <SelectItem key={c.category} value={c.category}>
                        {c.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-[150px] bg-muted/30 border-none">
                    <SelectValue placeholder="Stock Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="text-xs font-semibold">
                      Product
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Category
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Mart
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold">
                      Purchase
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold">
                      Selling
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold">
                      Margin
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold">
                      Qty
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((pr, i) => (
                    <TableRow
                      key={pr._id}
                      className="border-border/40 hover:bg-muted/20 transition-colors"
                    >
                      <TableCell className="font-medium text-sm">
                        {pr.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-normal border-border/50"
                        >
                          {pr.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-primary/80">
                        {pr.martName}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {Number(pr.purchasePrice || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {Number(pr.sellingPrice || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            pr.margin >= 20
                              ? "text-success font-medium text-sm"
                              : pr.margin >= 10
                                ? "text-warning font-medium text-sm"
                                : "text-destructive font-medium text-sm"
                          }
                        >
                          {pr.margin.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {pr.quantity}
                      </TableCell>
                      <TableCell className="text-center">
                        {pr.stockStatus === "out_of_stock" ? (
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-2 py-0 h-5"
                          >
                            Out
                          </Badge>
                        ) : pr.stockStatus === "low_stock" ? (
                          <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px] px-2 py-0 h-5">
                            Low
                          </Badge>
                        ) : (
                          <Badge className="bg-success/10 text-success border-success/20 text-[10px] px-2 py-0 h-5">
                            OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedProducts.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground py-12"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-8 w-8 opacity-20" />
                          <p>No products found matching your filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-xs text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {paginatedProducts.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">
                    {filteredProducts.length}
                  </span>{" "}
                  products
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 text-xs font-medium rounded-md disabled:opacity-30 hover:bg-muted/50 transition-colors border border-border/50"
                  >
                    Prev
                  </button>
                  <div className="flex items-center px-3">
                    <span className="text-xs text-muted-foreground">
                      Page{" "}
                      <span className="font-medium text-foreground">
                        {page}
                      </span>{" "}
                      of {totalPages}
                    </span>
                  </div>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 text-xs font-medium rounded-md disabled:opacity-30 hover:bg-muted/50 transition-colors border border-border/50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-card border-none glass">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Top Margin Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topMarginProducts}
                    layout="vertical"
                    margin={{ left: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      className="text-xs"
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      className="text-[10px] font-medium"
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: "hsl(var(--success)/0.05)" }}
                      formatter={(v: number) => [`${v.toFixed(1)}%`, "Margin"]}
                    />
                    <Bar
                      dataKey="margin"
                      fill="hsl(var(--success))"
                      radius={[0, 4, 4, 0]}
                      barSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-none glass">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Most Expensive Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[280px] overflow-y-auto rounded-lg border border-border/50">
                <Table>
                  <TableHeader className="bg-muted/30 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead className="text-xs font-semibold">
                        Product
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Mart
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold">
                        Purchase
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold">
                        Selling
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topExpensiveProducts.map((pr, i) => (
                      <TableRow
                        key={pr._id || i}
                        className="border-border/40 hover:bg-muted/20 transition-colors"
                      >
                        <TableCell className="font-medium text-sm">
                          {pr.name}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-primary/70">
                          {pr.martName}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {Number(pr.purchasePrice || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          {Number(pr.sellingPrice || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card border-none glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Mart Comparison
              <Badge
                variant="secondary"
                className="ml-1 bg-primary/10 text-primary border-none"
              >
                {filteredMarts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="text-xs font-semibold">
                      Mart
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold">
                      Products
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold">
                      Users
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold">
                      Inventory
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold">
                      Selling
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold">
                      Avg Margin
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold">
                      Revenue
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold">
                      Expenses
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold">
                      Profit
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMarts.map((m) => (
                    <TableRow
                      key={m.martId}
                      className="border-border/40 hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/mart/${m.martId}`)}
                    >
                      <TableCell className="font-semibold text-sm text-primary">
                        {m.martName}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-medium bg-muted/60 text-foreground border-none px-2"
                        >
                          {m.productCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-medium bg-muted/60 text-foreground border-none px-2"
                        >
                          {m.userCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {m.inventoryValue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {m.sellingValue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            m.avgMargin >= 20
                              ? "text-success font-medium text-xs"
                              : m.avgMargin >= 10
                                ? "text-warning font-medium text-xs"
                                : "text-destructive font-medium text-xs"
                          }
                        >
                          {m.avgMargin.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {m.monthlySales.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">
                        {m.monthlyExpenses.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            m.profit >= 0
                              ? "text-success font-bold text-sm"
                              : "text-destructive font-bold text-sm"
                          }
                        >
                          {m.profit.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/mart/${m.martId}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredMarts.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center text-muted-foreground py-12"
                      >
                        No marts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-start">
              <div className="relative w-full max-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search markets..."
                  className="pl-9 h-9 bg-muted/30 border-none focus-visible:ring-primary/20"
                  value={martSearch}
                  onChange={(e) => setMartSearch(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}
