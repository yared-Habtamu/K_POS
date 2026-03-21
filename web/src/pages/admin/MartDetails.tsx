import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  ArrowLeft,
  Package,
  TrendingUp,
  DollarSign,
  Search,
  Building2,
  Users,
  Wallet,
  Loader2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

type Product = {
  _id: string;
  name: string;
  category: string;
  sellingPrice: number;
  quantity: number;
  stockStatus: string;
  martId: string;
  martName: string;
  purchasePrice: number;
  margin: number;
};

type MartAnalytics = {
  martId: string;
  martName: string;
  productCount: number;
  userCount: number;
  inventoryValue: number;
  sellingValue: number;
  avgMargin: number;
  monthlySales: number;
  monthlyExpenses: number;
  profit: number;
};

type AnalyticsData = {
  platform: {
    totalProducts: number;
    totalInventoryValue: number;
    totalSellingValue: number;
    overallAvgMargin: number;
    totalMonthlySales: number;
    totalMonthlyExpenses: number;
    totalMonthlyProfit: number;
    lowStockCount: number;
  };
  martAnalytics: MartAnalytics[];
  products: Product[];
  categoryDistribution: { category: string; count: number }[];
};

export default function MartDetails() {
  const { martId } = useParams();
  const navigate = useNavigate();
  const auth = useAuthStore((s) => s.user);
  const API_BASE =
    import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || "";

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  useEffect(() => {
    async function fetchDetails() {
      if (!API_BASE || !auth?.token) return;
      try {
        const res = await fetch(`${API_BASE}/api/reports/admin-analytics`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const json = await res.json();
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to fetch analytics");
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [API_BASE, auth?.token]);

  const martInfo = useMemo(() => {
    if (!data || !martId) return null;
    return data.martAnalytics.find((m) => m.martId === martId);
  }, [data, martId]);

  const martProducts = useMemo(() => {
    if (!data || !data.products || !martId) return [];
    return data.products.filter((p) => p.martId === martId);
  }, [data, martId]);

  const filteredProducts = useMemo(() => {
    let list = [...martProducts];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    if (categoryFilter !== "all") {
      list = list.filter((p) => p.category === categoryFilter);
    }

    if (stockFilter !== "all") {
      if (stockFilter === "low") list = list.filter((p) => p.stockStatus === "low_stock");
      if (stockFilter === "out") list = list.filter((p) => p.stockStatus === "out_of_stock");
      if (stockFilter === "in") list = list.filter((p) => p.stockStatus === "in_stock");
    }

    return list;
  }, [martProducts, search, stockFilter, categoryFilter]);

  const paginatedProducts = filteredProducts.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE,
  );

  const totalPages = Math.ceil(filteredProducts.length / ROWS_PER_PAGE);

  if (loading) {
    return (
      <RoleLayout allowedRoles={["system_admin"]}>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground animate-pulse">Loading mart details...</p>
          </div>
        </div>
      </RoleLayout>
    );
  }

  if (error || !martInfo) {
    return (
      <RoleLayout allowedRoles={["system_admin"]}>
        <div className="flex h-[60vh] items-center justify-center">
          <Card className="max-w-md border-destructive/20 bg-destructive/5">
            <CardContent className="pt-6 text-center space-y-4">
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-bold">Error Loading Details</h3>
                <p className="text-sm text-muted-foreground">{error || "Market not found"}</p>
              </div>
              <Button onClick={() => navigate("/admin/analytics")} variant="outline">
                Back to Analytics
              </Button>
            </CardContent>
          </Card>
        </div>
      </RoleLayout>
    );
  }

  return (
    <RoleLayout allowedRoles={["system_admin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/admin/analytics")}
            className="group text-muted-foreground hover:text-primary pl-0"
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Analytics
          </Button>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1">
            <Building2 className="h-3 w-3 mr-2" />
            {martInfo.martName}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card border-none glass hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Products</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{martInfo.productCount}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Across all categories</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-none glass hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Inventory Value</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{martInfo.inventoryValue.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Cost basis</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-none glass hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monthly Revenue</CardTitle>
              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{martInfo.monthlySales.toLocaleString()}</div>
              <div className="flex items-center gap-1 mt-1 text-[10px]">
                <ArrowUpRight className="h-3 w-3 text-success" />
                <span className="text-success font-medium">Active sales</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-none glass hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monthly Profit</CardTitle>
              <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${martInfo.profit >= 0 ? "text-success" : "text-destructive"}`}>
                {martInfo.profit.toLocaleString()}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{martInfo.avgMargin.toFixed(1)}% Avg Margin</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card border-none glass">
          <CardHeader className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Market Products
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none">{filteredProducts.length}</Badge>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full max-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name..."
                  className="pl-9 h-9 bg-muted/30 border-none focus-visible:ring-primary/20"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px] h-9 bg-muted/30 border-none">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {data?.categoryDistribution.map((c) => (
                    <SelectItem key={c.category} value={c.category}>{c.category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-[130px] h-9 bg-muted/30 border-none">
                  <SelectValue placeholder="Stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in">In Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="text-xs font-semibold">Name</TableHead>
                    <TableHead className="text-xs font-semibold">Category</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Stock</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Purchase</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Price</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Margin</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((p) => (
                    <TableRow key={p._id} className="border-border/40 hover:bg-muted/10 transition-colors">
                      <TableCell className="font-medium text-xs">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] bg-muted/30 font-normal border-border/50">
                          {p.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">{p.quantity}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{p.purchasePrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">{p.sellingPrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-[11px]">
                        <span className={p.margin >= 20 ? "text-success font-medium" : p.margin >= 10 ? "text-warning" : "text-destructive"}>
                          {p.margin.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {p.stockStatus === "out_of_stock" ? (
                          <Badge variant="destructive" className="text-[10px] px-1.5 h-5 flex w-fit gap-1 items-center bg-destructive/10 text-destructive border-destructive/20 font-medium">
                            <XCircle className="h-3 w-3" /> Out of stock
                          </Badge>
                        ) : p.stockStatus === "low_stock" ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 h-5 flex w-fit gap-1 items-center bg-amber-500/10 text-amber-500 border-amber-500/20 font-medium">
                            <AlertTriangle className="h-3 w-3" /> Low stock
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-5 flex w-fit gap-1 items-center bg-success/10 text-success border-success/20 font-medium">
                            <Package className="h-3 w-3" /> In stock
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-8 w-8 opacity-20" />
                          <p>No products found for this criteria</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-xs text-muted-foreground">
                  Showing <span className="font-medium">{(page - 1) * ROWS_PER_PAGE + 1}</span> to{" "}
                  <span className="font-medium">{Math.min(page * ROWS_PER_PAGE, filteredProducts.length)}</span> of{" "}
                  <span className="font-medium">{filteredProducts.length}</span> results
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="h-8 border-border/50 bg-muted/10 text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="h-8 border-border/50 bg-muted/10 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}
