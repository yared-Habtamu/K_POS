// src/pages/manager/ProductManagement.tsx
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AdvancedFilters,
  type AdvancedFilterValues,
} from "@/components/ui/AdvancedFilters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutoComplete } from "@/components/ui/AutoComplete";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { generateUniqueBarcode, printBarcodeLabel } from "@/utils/barcodes";
import type { Product, ProductUnit } from "@/types";
import {
  Package,
  Search,
  Edit,
  Trash2,
  Barcode,
  Image as ImageIcon,
  Loader2,
  Printer,
  RotateCw,
  Scan,
} from "lucide-react";
import { BarcodeScanner } from "@/components/barcode/BarcodeScanner";
import { BarcodePreview } from "@/components/barcode/BarcodePreview";
import { BarcodePrintDialog } from "@/components/barcode/BarcodePrintDialog";

const units: ProductUnit[] = ["pcs", "kg", "g", "l", "ml", "box"];
const ITEMS_PER_PAGE = 7; // match owner
const defaultFilterValues: AdvancedFilterValues = {
  query: "",
  category: "",
  stockStatus: "",
  sortBy: "name_asc",
};

export default function ManagerProductManagement() {
  const { t } = useTranslation();
  const { products, categories, addProduct, updateProduct, deleteProduct } =
    useProductStore();
  const { user, isAuthenticated } = useAuthStore();
  const isOwner = user?.role === "owner";
  const canSetPurchase =
    user?.role === "owner" || (user?.permissions || []).includes("addItem");
  // Debug: confirm this page is rendered and show user role
  // Remove after debugging
  // eslint-disable-next-line no-console
  console.debug("ManagerProductManagement render", {
    role: user?.role,
    isAuthenticated,
    canSetPurchase,
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    (async () => {
      try {
        await (useProductStore
          .getState()
          .fetchProducts?.(1, ITEMS_PER_PAGE) as Promise<void>);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

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

    loadSales();
    return () => {
      mounted = false;
    };
  }, [useProductStore.getState().products]);

  const [filterValues, setFilterValues] =
    useState<AdvancedFilterValues>(defaultFilterValues);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [soldMap, setSoldMap] = useState<Record<string, number>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printTargetBarcode, setPrintTargetBarcode] = useState("");
  const [barcodeConflict, setBarcodeConflict] = useState<any>(null);
  const [barcodeConflictOpen, setBarcodeConflictOpen] = useState(false);

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

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.name,
        value: category.name,
      })),
    [categories],
  );

  const filteredProducts = useMemo(() => {
    const query = String(filterValues.query || "")
      .trim()
      .toLowerCase();
    const category = String(filterValues.category || "")
      .trim()
      .toLowerCase();
    const stockStatus = String(filterValues.stockStatus || "").trim();
    const sortBy = String(filterValues.sortBy || "name_asc");

    const filtered = products.filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const barcode = String(
        product.barcode || product.barcodes?.[0] || "",
      ).toLowerCase();
      const productCategory = String(product.category || "")
        .trim()
        .toLowerCase();
      const martQty = Number(
        product.quantity ?? product.supermarketQuantity ?? 0,
      );

      const matchesQuery =
        !query ||
        name.includes(query) ||
        barcode.includes(query) ||
        productCategory.includes(query);
      const matchesCategory = !category || productCategory === category;
      const matchesStockStatus =
        !stockStatus ||
        (stockStatus === "in_stock" && martQty > 10) ||
        (stockStatus === "low_stock" && martQty > 0 && martQty <= 10) ||
        (stockStatus === "out_of_stock" && martQty <= 0);

      return matchesQuery && matchesCategory && matchesStockStatus;
    });

    return filtered.sort((left, right) => {
      switch (sortBy) {
        case "name_desc":
          return String(right.name || "").localeCompare(
            String(left.name || ""),
          );
        case "category_asc":
          return String(left.category || "").localeCompare(
            String(right.category || ""),
          );
        case "price_asc":
          return (
            Number(left.sellingPrice || 0) - Number(right.sellingPrice || 0)
          );
        case "price_desc":
          return (
            Number(right.sellingPrice || 0) - Number(left.sellingPrice || 0)
          );
        case "stock_asc":
          return (
            Number(left.quantity ?? left.supermarketQuantity ?? 0) -
            Number(right.quantity ?? right.supermarketQuantity ?? 0)
          );
        case "stock_desc":
          return (
            Number(right.quantity ?? right.supermarketQuantity ?? 0) -
            Number(left.quantity ?? left.supermarketQuantity ?? 0)
          );
        case "name_asc":
        default:
          return String(left.name || "").localeCompare(
            String(right.name || ""),
          );
      }
    });
  }, [categories, filterValues, products]);

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
    if (
      filteredProducts.length <= (currentPage - 1) * ITEMS_PER_PAGE &&
      currentPage > 1
    ) {
      setCurrentPage(1);
    }
  };

  useEffect(() => {
    const editId = (location.state as any)?.editProductId;
    if (!editId) return;
    const product = products.find((p: any) => (p.id || p._id) === editId);
    if (!product) return;
    handleEdit(product);
    navigate("/manager/products", { replace: true, state: {} });
  }, [location.state, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (form.category && !categories.find((c) => c.name === form.category)) {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "";
        const token = useAuthStore.getState().user?.token;
        await fetch(`${API_BASE}/api/categories`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: form.category,
            martId: useAuthStore.getState().user?.martId,
          }),
        });
      } catch (err) {
        console.error("failed to create category", err);
      }
    }

    const pendingBarcode = (form.barcodeInput || "").trim();
    const productData = {
      name: form.name,
      category: form.category,
      unit: form.unit,
      purchasePrice:
        editingProduct && !canSetPurchase
          ? editingProduct.purchasePrice
          : parseFloat(form.purchasePrice),
      sellingPrice: parseFloat(form.sellingPrice),
      quantity: parseInt(form.quantity),
      storeQuantity: parseInt(form.quantity),
      supermarketQuantity: parseInt(form.quantity),
      lowStockThreshold: parseInt(form.lowStockThreshold),
      expiryDate: form.expiryDate ? new Date(form.expiryDate) : undefined,
      barcodes: Array.from(
        new Set(
          [
            ...(Array.isArray(form.barcodes) ? form.barcodes : []),
            pendingBarcode,
          ].filter(Boolean),
        ),
      ),
      shopId: "shop-001",
    };

    try {
      if (editingProduct) {
        const result: any = await updateProduct(editingProduct.id, productData);
        if (result?.status === 202) {
          toast({
            title: "Sent for manager approval",
            description: "Your changes will apply after approval.",
          });
        } else {
          toast({ title: t("product_updated") });
        }
      } else {
        // prevent manager from creating new products from this page; redirect to owner flow if needed
        toast({
          title: "Only owners can add products",
          variant: "destructive",
        });
      }
      // refresh categories list if a new one was typed
      if (form.category && !categories.find((c) => c.name === form.category)) {
        await useProductStore.getState().fetchCategories?.();
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
        const API_BASE = (import.meta as any).env.VITE_API_URL || "";
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
        const b = await generateUniqueBarcode(findProductByBarcode);
        setForm((prev) => ({ 
          ...prev, 
          barcodes: [...(Array.isArray(prev.barcodes) ? prev.barcodes : []), b],
          barcodeInput: "" 
        }));
      } catch (e) {
        console.error("generate barcode failed", e);
        toast({ title: "Failed to generate barcode", variant: "destructive" });
      }
    })();
  };

  const activeBarcode =
    (form.barcodeInput || "").trim() ||
    (Array.isArray(form.barcodes) && form.barcodes.length > 0
      ? String(form.barcodes[0] || "").trim()
      : "");

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

  const refreshProducts = async () => {
    setIsRefreshing(true);
    try {
      await (useProductStore
        .getState()
        .fetchProducts?.(currentPage, ITEMS_PER_PAGE) as Promise<void>);
    } catch (e) {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    // Manager and owner can access this page
    <RoleLayout allowedRoles={["manager", "owner"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t("products")}</h1>
            <p className="text-muted-foreground">
              {t("view_product_inventory")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => void refreshProducts()}
              disabled={isRefreshing}
              aria-label="Refresh products"
              title="Refresh products"
            >
              <RotateCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
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
                    <AutoComplete<{ id: string; label: string }>
                      id="manager-product-category"
                      label={t("category")}
                      placeholder={t("select_or_create_category", {
                        defaultValue: "Enter or select category",
                      })}
                      items={categoryOptions.map((c) => ({
                        id: String(c.value),
                        label: c.label,
                      }))}
                      getItemLabel={(it) => it.label}
                      getItemValue={(it) => it.id}
                      onSelect={(it) =>
                        setForm({ ...form, category: it.label })
                      }
                      allowCreate
                      onCreateOption={async (query) => {
                        const q = String(query || "").trim();
                        if (!q) return { id: `cat-${Date.now()}`, label: q };
                        try {
                          const API_BASE = import.meta.env.VITE_API_URL || "";
                          const token = useAuthStore.getState().user?.token;
                          const res = await fetch(
                            `${API_BASE}/api/categories`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                ...(token
                                  ? { Authorization: `Bearer ${token}` }
                                  : {}),
                              },
                              body: JSON.stringify({
                                name: q,
                                martId: useAuthStore.getState().user?.martId,
                              }),
                            },
                          );
                          if (res.ok) {
                            await useProductStore
                              .getState()
                              .fetchCategories?.();
                            const created = await res
                              .json()
                              .catch(() => ({
                                name: q,
                                _id: `cat-${Date.now()}`,
                              }));
                            return {
                              id: String(created._id || created.id || q),
                              label: q,
                            };
                          }
                        } catch (err) {
                          console.error("create category failed", err);
                        }
                        return { id: `cat-${Date.now()}`, label: q };
                      }}
                      createOptionLabel={(q) => `Add "${q}"`}
                    />
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
                    {canSetPurchase && (
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
                    )}
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
                        placeholder={t("enter_barcode_to_add")}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsScannerOpen(true)}
                        title={t("scan")}
                      >
                        <Scan className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          void (async () => {
                            const val = (form.barcodeInput || "").trim();
                            if (!val) return;
                            try {
                              const API_BASE = (import.meta as any).env.VITE_API_URL || "";
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

                              const found = await findProductByBarcode(val);
                              if (found) {
                                const foundId = String(found._id || found.id);
                                const currentEditingId = String(
                                  (editingProduct as any)?.id ||
                                    (editingProduct as any)?._id ||
                                    "",
                                );
                                // allow adding the barcode if it belongs to the same product being edited
                                if (
                                  editingProduct &&
                                  currentEditingId &&
                                  foundId === currentEditingId
                                ) {
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
                                  storeQuantity: Number(
                                    found.storeQuantity || 0,
                                  ),
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
                        {t("add")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateBarcode}
                      >
                        <Barcode className="mr-2 h-4 w-4" />
                        {t("generate")}
                      </Button>
                    </div>

                    <BarcodePreview
                      barcode={activeBarcode}
                      productName={form.name}
                      price={form.sellingPrice}
                    />

                    <div className="flex flex-wrap gap-2 mt-2">
                      {(Array.isArray(form.barcodes) ? form.barcodes : []).map(
                        (b, idx) => (
                          <div
                            key={b + "-" + idx}
                            className="inline-flex items-center gap-2 px-2 py-1 rounded border"
                          >
                            <span className="font-mono text-sm">{b}</span>
                          <div className="flex items-center">
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setPrintTargetBarcode(b);
                                setIsPrintDialogOpen(true);
                              }}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive"
                              onClick={() => {
                                const arr = (form.barcodes || []).slice();
                                arr.splice(idx, 1);
                                setForm({ ...form, barcodes: arr });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
                          {t("saving")}
                        </>
                      ) : (
                        t("save")
                      )}
                    </Button>
                  </div>
                </form>

                <BarcodePrintDialog
                  open={isPrintDialogOpen}
                  onOpenChange={setIsPrintDialogOpen}
                  barcode={printTargetBarcode}
                  productName={form.name}
                  price={form.sellingPrice}
                />

                {isScannerOpen && (
                  <BarcodeScanner 
                    onScan={(code) => setForm({ ...form, barcodeInput: code })}
                    onClose={() => setIsScannerOpen(false)}
                  />
                )}

                <Dialog open={barcodeConflictOpen} onOpenChange={setBarcodeConflictOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("barcode_conflict")}</DialogTitle>
                      <DialogDescription>
                        {t("barcode_already_assigned", {
                          barcode: barcodeConflict?.code,
                          productName: barcodeConflict?.productName,
                          quantity: barcodeConflict?.storeQuantity,
                        })}
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button onClick={() => setBarcodeConflictOpen(false)}>
                        {t("ok")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
            </DialogContent>
          </Dialog>
        </div>

        <AdvancedFilters
          title="Search and filter products"
          description="Find products by name, barcode, category, stock state, or sort order."
          fields={[
            {
              key: "query",
              label: t("search"),
              type: "search",
              placeholder: "Search products...",
            },
            {
              key: "category",
              label: t("category"),
              type: "select",
              placeholder: "All categories",
              options: categoryOptions,
            },
            {
              key: "stockStatus",
              label: "Stock status",
              type: "select",
              placeholder: "All stock levels",
              options: [
                { label: "In Stock", value: "in_stock" },
                { label: "Low Stock", value: "low_stock" },
                { label: "Out of Stock", value: "out_of_stock" },
              ],
            },
            {
              key: "sortBy",
              label: "Sort by",
              type: "select",
              placeholder: "Name A -> Z",
              options: [
                { label: "Name A -> Z", value: "name_asc" },
                { label: "Name Z -> A", value: "name_desc" },
                { label: "Category A -> Z", value: "category_asc" },
                { label: "Price Low -> High", value: "price_asc" },
                { label: "Price High -> Low", value: "price_desc" },
                { label: "Stock Low -> High", value: "stock_asc" },
                { label: "Stock High -> Low", value: "stock_desc" },
              ],
            },
          ]}
          values={filterValues}
          onValuesChange={setFilterValues}
          onReset={() => setFilterValues(defaultFilterValues)}
          showActiveBadges={false}
        />

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
                    <TableHead className="w-12">{t("image")}</TableHead>
                    <TableHead>{t("product_name")}</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    {isOwner ? (
                      <TableHead className="text-right">
                        {t("purchase_price")}
                      </TableHead>
                    ) : null}
                    <TableHead className="text-right">
                      {t("selling_price")}
                    </TableHead>
                    <TableHead className="text-right">{t("stock")}</TableHead>
                    <TableHead className="text-right">
                      {t("mart_qty")}
                    </TableHead>
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
                        {isOwner ? (
                          <TableCell className="text-right">
                            {product.purchasePrice} ETB
                          </TableCell>
                        ) : null}
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
                        {Object.values(filterValues).some((value) =>
                          Boolean(value),
                        )
                          ? "No products found"
                          : "No products yet."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-3 border-t border-border">
              <div className="text-xs text-muted-foreground mb-2 sm:mb-0">
                Showing <span className="font-medium">{startIndex + 1}</span>–
                <span className="font-medium">
                  {startIndex + filteredProducts.length}
                </span>{" "}
                of{" "}
                <span className="font-medium">
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
