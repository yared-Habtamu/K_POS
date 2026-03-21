import { useEffect, useState, useMemo } from "react";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#c4b5fd",
  "#818cf8",
  "#7c3aed",
  "#4f46e5",
  "#6d28d9",
  "#5b21b6",
  "#4c1d95",
  "#a855f7",
  "#9333ea",
  "#7e22ce",
  "#6b21a8",
  "#581c87",
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
  const auth = useAuthStore((s) => s.user);
  const API_BASE =
    import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || "";

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [martFilter, setMartFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
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
      } catch (err: any) {
        setError(err.message || "Unknown error");
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
    return list;
  }, [data, search, martFilter, stockFilter]);

  const totalPages = Math.ceil(filteredProducts.length / ROWS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE,
  );

  useEffect(() => {
    setPage(1);
  }, [search, martFilter, stockFilter]);

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
      color: p.totalMonthlyProfit >= 0 ? "text-green-500" : "text-red-500",
      bg:
        p.totalMonthlyProfit >= 0 ? "bg-green-500/10" : "bg-red-500/10",
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
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
                    />
                    <XAxis
                      type="number"
                      className="text-xs"
                      tickFormatter={(v) => fmt(v)}
                    />
                    <YAxis
                      dataKey="martName"
                      type="category"
                      className="text-xs"
                      width={100}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toLocaleString()} ETB`, ""]} />
                    <Bar dataKey="monthlySales" fill="#6366f1" radius={[0, 4, 4, 0]} name="Sales" />
                    <Bar dataKey="monthlyExpenses" fill="#f43f5e" radius={[0, 4, 4, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
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
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={2}
                      label={({ category, percent }) =>
                        `${category} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {data.categoryDistribution.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend
                      wrapperStyle={{ fontSize: "11px" }}
                      formatter={(val) =>
                        String(val).length > 15
                          ? String(val).slice(0, 15) + "…"
                          : val
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Mart Comparison
              <Badge variant="secondary" className="ml-1">{data.martAnalytics.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mart</TableHead>
                    <TableHead className="text-center">Products</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-right">Inventory Value</TableHead>
                    <TableHead className="text-right">Selling Value</TableHead>
                    <TableHead className="text-right">Avg Margin</TableHead>
                    <TableHead className="text-right">Monthly Sales</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.martAnalytics.map((m) => (
                    <TableRow key={m.martId}>
                      <TableCell className="font-medium">{m.martName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{m.productCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{m.userCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{m.inventoryValue.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{m.sellingValue.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={m.avgMargin >= 20 ? "text-green-500" : m.avgMargin >= 10 ? "text-amber-500" : "text-red-500"}>
                          {m.avgMargin.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{m.monthlySales.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{m.monthlyExpenses.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={m.profit >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                          {m.profit.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.martAnalytics.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No marts found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Margin Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topMarginProducts}
                    layout="vertical"
                    margin={{ left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="text-xs" tickFormatter={(v) => `${v}%`} />
                    <YAxis dataKey="name" type="category" width={100} className="text-xs" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toFixed(1)}%`, "Margin"]} />
                    <Bar dataKey="margin" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Most Expensive Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Mart</TableHead>
                      <TableHead className="text-right">Purchase</TableHead>
                      <TableHead className="text-right">Selling</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topExpensiveProducts.map((pr, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{pr.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{pr.martName}</TableCell>
                        <TableCell className="text-right text-sm">{pr.purchasePrice.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{pr.sellingPrice.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              All Products
              <Badge variant="secondary" className="ml-1">{filteredProducts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products, categories, marts..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={martFilter} onValueChange={setMartFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Marts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Marts</SelectItem>
                  {data.martAnalytics.map((m) => (
                    <SelectItem key={m.martId} value={m.martId}>{m.martName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Mart</TableHead>
                    <TableHead className="text-right">Purchase</TableHead>
                    <TableHead className="text-right">Selling</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((pr, i) => (
                    <TableRow key={pr._id}>
                      <TableCell className="text-muted-foreground text-xs">{(page - 1) * ROWS_PER_PAGE + i + 1}</TableCell>
                      <TableCell className="font-medium">{pr.name}</TableCell>
                      <TableCell className="text-muted-foreground">{pr.category}</TableCell>
                      <TableCell>{pr.martName}</TableCell>
                      <TableCell className="text-right">{pr.purchasePrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">{pr.sellingPrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={pr.margin >= 20 ? "text-green-500" : pr.margin >= 10 ? "text-amber-500" : "text-red-500"}>
                          {pr.margin.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{pr.quantity}</TableCell>
                      <TableCell>
                        {pr.stockStatus === "out_of_stock" ? (
                          <Badge variant="destructive" className="text-xs">Out</Badge>
                        ) : pr.stockStatus === "low_stock" ? (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">Low</Badge>
                        ) : (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No products found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {filteredProducts.length} products • Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 hover:bg-accent transition-colors"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 hover:bg-accent transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}
