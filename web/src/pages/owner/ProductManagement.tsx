// src/pages/owner/ProductManagement.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useProductStore } from "@/stores/productStore";
import { useAuthStore } from "@/stores/authStore";
import type { Product, ProductUnit } from "@/types";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Barcode,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const units: ProductUnit[] = ["pcs", "kg", "g", "l", "ml", "box"];
const ITEMS_PER_PAGE = 7; // ✅ Set to 7 items per page

export default function ProductManagement() {
  const { t } = useTranslation();
  const { products, categories, addProduct, updateProduct, deleteProduct } =
    useProductStore();
  const navigate = useNavigate();

  // Must be declared before any useEffect that references it in a dependency array
  const [currentPage, setCurrentPage] = useState(1); // Pagination state

  useEffect(() => {
    // fetch from backend on mount
    (async () => {
      try {
        // initial page load (server-side pagination)
        await (useProductStore
          .getState()
          .fetchProducts?.(1, ITEMS_PER_PAGE) as Promise<void>);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Fetch page when currentPage changes
  useEffect(() => {
    (async () => {
      try {
        await (useProductStore
          .getState()
          .fetchProducts?.(currentPage, ITEMS_PER_PAGE) as Promise<void>);
      } catch (e) {
        // ignore
      }
    })();
  }, [currentPage]);

  // Fetch sales to compute sold counts per product (so we can show remaining = quantity - sold)
  useEffect(() => {
    let mounted = true;
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const token = useAuthStore.getState().user?.token;
    const martId = useAuthStore.getState().user?.martId;

    async function loadSales() {
      if (!martId) return;
      try {
        const res = await fetch(`${API_BASE}/api/sales?martId=${martId}`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (!res.ok) return;
        const sales = await res.json();
        const map: Record<string, number> = {};
        for (const s of sales || []) {
          for (const it of s.items || []) {
            const pid = (
              it.productId ||
              it.product?._id ||
              it.product?.id ||
              it.id ||
              ""
            ).toString();
            map[pid] = (map[pid] || 0) + Number(it.quantity || 0);
          }
        }
        if (!mounted) return;
        setSoldMap(map);
      } catch (err) {
        // ignore
      }
    }

    // run on mount and whenever products change (so UI updates after product list refresh)
    loadSales();
    return () => {
      mounted = false;
    };
  }, [useProductStore.getState().products]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [soldMap, setSoldMap] = useState<Record<string, number>>({});

  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "pcs" as ProductUnit,
    purchasePrice: "",
    sellingPrice: "",
    quantity: "",
    lowStockThreshold: "10",
    expiryDate: "",
    barcodes: [] as string[],
    barcodeInput: "",
  });

  const [barcodeConflictOpen, setBarcodeConflictOpen] = useState(false);
  const [barcodeConflict, setBarcodeConflict] = useState<null | {
    code: string;
    productId: string;
    productName: string;
    storeQuantity: number;
  }>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const token = useAuthStore.getState().user?.token;

  const findProductByBarcode = async (code: string) => {
    const trimmed = (code || "").trim();
    if (!trimmed) return null;
    const res = await fetch(
      `${API_BASE}/api/products/by-barcode/${encodeURIComponent(trimmed)}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      },
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  };

  const generateUniqueBarcode = async () => {
    const candidate = () => `${Date.now()}`.slice(-12);
    for (let i = 0; i < 6; i++) {
      const code = i === 0 ? candidate() : `${candidate()}${Math.floor(Math.random() * 9)}`.slice(0, 12);
      const existing = await findProductByBarcode(code);
      if (!existing) return code;
    }
    return String(Math.floor(Math.random() * 1e12)).padStart(12, "0");
  };

  // Filter products based on search and category (applies to current page only)
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search);
    const matchCategory =
      categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  // Pagination logic - rely on server total when available
  const totalPages = Math.max(
    1,
    Math.ceil(
      (useProductStore.getState().totalProducts || filteredProducts.length) /
        ITEMS_PER_PAGE,
    ),
  );
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  const resetForm = () => {
    setForm({
      name: "",
      category: "",
      unit: "pcs",
      purchasePrice: "",
      sellingPrice: "",
      quantity: "",
      lowStockThreshold: "10",
      expiryDate: "",
      barcodes: [],
      barcodeInput: "",
    });
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    // product.quantity is authoritative remaining value after sales
    const remaining = Number(
      product.quantity ??
        product.supermarketQuantity ??
        product.storeQuantity ??
        0,
    );

    setForm({
      name: product.name,
      category: product.category,
      unit: product.unit,
      purchasePrice: product.purchasePrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      // show remaining quantity in the edit form so owner edits the remaining amount
      quantity: String(remaining),
      lowStockThreshold: product.lowStockThreshold.toString(),
      expiryDate: product.expiryDate
        ? new Date(product.expiryDate).toISOString().split("T")[0]
        : "",
      barcodes: Array.isArray(product.barcodes)
        ? product.barcodes.slice()
        : product.barcode
          ? [product.barcode]
          : [],
      barcodeInput: "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    toast({ title: t("product_deleted") });
    // Reset to page 1 if current page becomes empty
    if (
      filteredProducts.length <= (currentPage - 1) * ITEMS_PER_PAGE &&
      currentPage > 1
    ) {
      setCurrentPage(1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const productData = {
      name: form.name,
      category: form.category,
      unit: form.unit,
      purchasePrice: parseFloat(form.purchasePrice),
      sellingPrice: parseFloat(form.sellingPrice),
      quantity: parseInt(form.quantity),
      storeQuantity: parseInt(form.quantity),
      supermarketQuantity: parseInt(form.quantity),
      lowStockThreshold: parseInt(form.lowStockThreshold),
      expiryDate: form.expiryDate ? new Date(form.expiryDate) : undefined,
      barcodes: Array.isArray(form.barcodes)
        ? form.barcodes.filter(Boolean)
        : [],
      shopId: "shop-001",
    };

    try {
      if (editingProduct) {
        const result = await updateProduct(editingProduct.id, productData);
        if (result?.status === 202) {
          toast({
            title: "Sent for manager approval",
            description: "Your changes will apply after approval.",
          });
        } else {
          toast({ title: t("product_updated") });
        }
      } else {
        await addProduct(productData);
        toast({ title: t("product_added") });
        setCurrentPage(1); // Reset to first page after adding
      }
    } catch (error) {
      console.error("Save failed:", error);
      toast({ title: "Error saving product", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
      resetForm();
    }
  };

  const generateBarcode = () => {
    void (async () => {
      try {
        const b = await generateUniqueBarcode();
        const existing = Array.isArray(form.barcodes) ? form.barcodes.slice() : [];
        setForm({ ...form, barcodes: [...existing, b], barcodeInput: "" });
      } catch (e) {
        console.error("generate barcode failed", e);
        toast({ title: "Failed to generate barcode", variant: "destructive" });
      }
    })();
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <RoleLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t("products")}</h1>
            <p className="text-muted-foreground">
              Manage your product inventory
            </p>
          </div>

          <div>
            <Button onClick={() => navigate("/owner/products/add")}>
              <Plus className="mr-2 h-4 w-4" />
              {t("add_product")}
            </Button>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? t("edit_product") : t("add_product")}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("product_name")} *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">{t("category")} *</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm({ ...form, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">{t("unit")} *</Label>
                    <Select
                      value={form.unit}
                      onValueChange={(v) =>
                        setForm({ ...form, unit: v as ProductUnit })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">{t("quantity")} *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={form.quantity}
                      onChange={(e) =>
                        setForm({ ...form, quantity: e.target.value })
                      }
                      required
                    />
                    {editingProduct && (
                      <div className="text-xs text-muted-foreground">
                        Showing remaining quantity (total - sold). If you change
                        this value it will be submitted as the new remaining
                        quantity and may require approval.
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchasePrice">
                      {t("purchase_price")} (ETB) *
                    </Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      value={form.purchasePrice}
                      onChange={(e) =>
                        setForm({ ...form, purchasePrice: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sellingPrice">
                      {t("selling_price")} (ETB) *
                    </Label>
                    <Input
                      id="sellingPrice"
                      type="number"
                      step="0.01"
                      value={form.sellingPrice}
                      onChange={(e) =>
                        setForm({ ...form, sellingPrice: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lowStock">Low Stock Threshold</Label>
                    <Input
                      id="lowStock"
                      type="number"
                      value={form.lowStockThreshold}
                      onChange={(e) =>
                        setForm({ ...form, lowStockThreshold: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">{t("expiry_date")}</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={form.expiryDate}
                      onChange={(e) =>
                        setForm({ ...form, expiryDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="barcodeInput">{t("barcodes")}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="barcodeInput"
                        value={form.barcodeInput}
                        onChange={(e) =>
                          setForm({ ...form, barcodeInput: e.target.value })
                        }
                        placeholder="Enter barcode to add"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          void (async () => {
                            const val = (form.barcodeInput || "").trim();
                            if (!val) return;
                            try {
                              const found = await findProductByBarcode(val);
                              if (found) {
                                const foundId = String(found._id || found.id);
                                const currentEditingId = String(
                                  (editingProduct as any)?.id ||
                                    (editingProduct as any)?._id ||
                                    "",
                                );
                                // allow adding the barcode if it belongs to the same product being edited
                                if (editingProduct && currentEditingId && foundId === currentEditingId) {
                                  const existing = Array.isArray(form.barcodes)
                                    ? form.barcodes.slice()
                                    : [];
                                  setForm({
                                    ...form,
                                    barcodes: [...existing, val],
                                    barcodeInput: "",
                                  });
                                  return;
                                }

                                setBarcodeConflict({
                                  code: val,
                                  productId: foundId,
                                  productName: String(found.name || "Product"),
                                  storeQuantity: Number(found.storeQuantity || 0),
                                });
                                setBarcodeConflictOpen(true);
                                return;
                              }

                              const existing = Array.isArray(form.barcodes)
                                ? form.barcodes.slice()
                                : [];
                              setForm({
                                ...form,
                                barcodes: [...existing, val],
                                barcodeInput: "",
                              });
                            } catch (e: any) {
                              console.error("barcode lookup failed", e);
                              toast({
                                title: "Failed to check barcode",
                                description: e?.message || "Server error",
                                variant: "destructive",
                              });
                            }
                          })();
                        }}
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateBarcode}
                      >
                        <Barcode className="mr-2 h-4 w-4" />
                        Generate
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {(Array.isArray(form.barcodes) ? form.barcodes : []).map(
                        (b, idx) => (
                          <div
                            key={b + "-" + idx}
                            className="inline-flex items-center gap-2 px-2 py-1 rounded border"
                          >
                            <span className="font-mono text-sm">{b}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-destructive p-1"
                              onClick={() => {
                                const arr = (form.barcodes || []).slice();
                                arr.splice(idx, 1);
                                setForm({ ...form, barcodes: arr });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ),
                      )}
                    </div>

                    {editingProduct && (
                      <div className="text-xs text-muted-foreground">
                        Previously registered barcodes are shown above. Add or
                        generate new ones.
                      </div>
                    )}

                    <AlertDialog
                      open={barcodeConflictOpen}
                      onOpenChange={setBarcodeConflictOpen}
                    >
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Barcode already registered
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {barcodeConflict
                              ? `This barcode is already registered for ${barcodeConflict.productName}. Do you want to increase its quantity instead?`
                              : "This barcode is already registered. Do you want to increase its quantity instead?"}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              void (async () => {
                                if (!barcodeConflict) return;
                                try {
                                  // Load the existing product so user can edit quantity and then Save.
                                  const res = await fetch(
                                    `${API_BASE}/api/products/${encodeURIComponent(
                                      barcodeConflict.productId,
                                    )}`,
                                    {
                                      headers: token
                                        ? { Authorization: `Bearer ${token}` }
                                        : undefined,
                                    },
                                  );
                                  if (!res.ok) throw new Error(await res.text());
                                  const p = await res.json();
                                  const normalized: any = {
                                    ...p,
                                    id: p.id || p._id,
                                  };

                                  setEditingProduct(normalized);
                                  setForm({
                                    name: String(normalized.name || ''),
                                    category: String(normalized.category || ''),
                                    unit: (normalized.unit as any) || 'pcs',
                                    purchasePrice: String(normalized.purchasePrice ?? 0),
                                    sellingPrice: String(normalized.sellingPrice ?? 0),
                                    quantity: String(
                                      normalized.storeQuantity ??
                                        normalized.quantity ??
                                        normalized.supermarketQuantity ??
                                        0,
                                    ),
                                    lowStockThreshold: String(normalized.lowStockThreshold ?? 10),
                                    expiryDate: normalized.expiryDate
                                      ? new Date(normalized.expiryDate)
                                          .toISOString()
                                          .split('T')[0]
                                      : '',
                                    barcodes: Array.isArray(normalized.barcodes)
                                      ? normalized.barcodes.map(String)
                                      : normalized.barcode
                                        ? [String(normalized.barcode)]
                                        : [],
                                    barcodeInput: '',
                                  });

                                  toast({
                                    title: 'Product loaded',
                                    description: 'Update quantity and press Save.',
                                  });

                                  setBarcodeConflictOpen(false);
                                  setBarcodeConflict(null);
                                } catch (e: any) {
                                  console.error("increase quantity failed", e);
                                  toast({
                                    title: "Failed to load product",
                                    description: e?.message || "Server error",
                                    variant: "destructive",
                                  });
                                }
                              })();
                            }}
                          >
                            Increase quantity
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    {t("cancel")}
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      t("save")
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t("products")}
              <Badge variant="secondary" className="ml-2">
                {filteredProducts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Image</TableHead>
                    <TableHead>{t("product_name")}</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead className="text-right">
                      {t("purchase_price")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("selling_price")}
                    </TableHead>
                    <TableHead className="text-right">{t("stock")}</TableHead>
                    <TableHead className="text-right">Mart Qty</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          {product.pictureUrl ? (
                            <img
                              src={product.pictureUrl}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {product.purchasePrice} ETB
                        </TableCell>
                        <TableCell className="text-right">
                          {product.sellingPrice} ETB
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const storeQty = Number(product.storeQuantity ?? 0);
                            return (
                              <Badge variant="secondary">
                                {storeQty} {product.unit}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            // product.quantity is the authoritative sellable quantity (mart/front)
                            const martQty = Number(
                              product.quantity ??
                                product.supermarketQuantity ??
                                0,
                            );
                            const lowThreshold = Number(
                              product.lowStockThreshold || 0,
                            );
                            const variant =
                              martQty <= lowThreshold
                                ? "destructive"
                                : "secondary";
                            return (
                              <Badge variant={variant}>
                                {martQty} {product.unit}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(product.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-4 text-muted-foreground"
                      >
                        {search || categoryFilter !== "all"
                          ? "No products found"
                          : "No products yet. Add your first product."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ✅ PAGINATION CONTROLS (ALWAYS VISIBLE) */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-3 border-t border-border">
              <div className="text-xs text-muted-foreground mb-2 sm:mb-0">
                Showing <span className="font-medium">{startIndex + 1}</span>–
                <span className="font-medium">
                  {startIndex + filteredProducts.length}
                </span>{" "}
                of
                <span className="font-medium">
                  {" "}
                  {useProductStore.getState().totalProducts ||
                    filteredProducts.length}
                </span>{" "}
                products
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={currentPage === 1}
                >
                  Prev
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </Button>
                  ),
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}
