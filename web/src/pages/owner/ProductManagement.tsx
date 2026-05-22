// src/pages/owner/ProductManagement.tsx
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
import { generateUniqueBarcode, printBarcodeLabel } from "@/utils/barcodes";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Barcode,
  Image as ImageIcon,
  Loader2,
  Printer,
  RotateCw,
  ScanBarcode,
} from "lucide-react";
import { BarcodeScanner } from "@/components/barcode/BarcodeScanner";
import { BarcodePreview } from "@/components/barcode/BarcodePreview";
import { BarcodePrintDialog } from "@/components/barcode/BarcodePrintDialog";
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
import Modal from "@/components/ui/Modal";

const units: ProductUnit[] = ["pcs", "kg", "g", "l", "ml", "box"];
const ITEMS_PER_PAGE = 7; // ✅ Set to 7 items per page
const defaultFilterValues: AdvancedFilterValues = {
  query: "",
  category: "",
  stockStatus: "",
  sortBy: "name_asc",
};

export default function ProductManagement() {
  const { t } = useTranslation();
  const { products, categories, addProduct, updateProduct, deleteProduct } =
    useProductStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Must be declared before any useEffect that references it in a dependency array
  const [currentPage, setCurrentPage] = useState(1); // Pagination state

  useEffect(() => {
    // fetch from backend on mount
    (async () => {
      try {
        const store = useProductStore.getState();
        // initial page load (server-side pagination)
        await (store.fetchProducts?.(1, ITEMS_PER_PAGE) as Promise<void>);
        // load category list too
        await store.fetchCategories?.();
      } catch (e) {
        // ignore
      }
    })();
  }, []);

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

  const [filterValues, setFilterValues] =
    useState<AdvancedFilterValues>(defaultFilterValues);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [soldMap, setSoldMap] = useState<Record<string, number>>({});
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printTargetBarcode, setPrintTargetBarcode] = useState("");
  const [isTableScannerOpen, setIsTableScannerOpen] = useState(false);
  const [isRowScannerOpen, setIsRowScannerOpen] = useState(false);
  const [activeScannerProduct, setActiveScannerProduct] =
    useState<Product | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

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
    storeQuantity: "",
    martQuantity: "",
    stockDestination: "warehouse" as "warehouse" | "mart",
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
      const code =
        i === 0
          ? candidate()
          : `${candidate()}${Math.floor(Math.random() * 9)}`.slice(0, 12);
      const existing = await findProductByBarcode(code);
      if (!existing) return code;
    }
    return String(Math.floor(Math.random() * 1e12)).padStart(12, "0");
  };

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
      storeQuantity: "",
      martQuantity: "",
      stockDestination: "warehouse",
      lowStockThreshold: "10",
      expiryDate: "",
      barcodes: [],
      barcodeInput: "",
    });
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    const storeQty = Number(product.storeQuantity ?? 0);
    const martQty = Number(
      product.quantity ?? product.supermarketQuantity ?? 0,
    );

    setForm({
      name: product.name,
      category: product.category,
      unit: product.unit,
      purchasePrice: product.purchasePrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      quantity: String(martQty),
      storeQuantity: String(storeQty),
      martQuantity: String(martQty),
      stockDestination: "warehouse",
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

  useEffect(() => {
    const editId = (location.state as any)?.editProductId;
    if (!editId) return;
    const product = products.find((p: any) => (p.id || p._id) === editId);
    if (!product) return;
    handleEdit(product);
    navigate("/owner/products", { replace: true, state: {} });
  }, [location.state, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // if user typed a category that doesn't exist yet, create it on server first
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
        // ignore response, it may already exist
      } catch (err) {
        console.error("failed to create category", err);
      }
    }

    const pendingBarcode = (form.barcodeInput || "").trim();
    const mergedBarcodes = Array.from(
      new Set(
        [
          ...(Array.isArray(form.barcodes) ? form.barcodes : []),
          pendingBarcode,
        ].filter(Boolean),
      ),
    );
    if (mergedBarcodes.length > 1) {
      toast({ title: t("only_one_barcode_allowed"), variant: "destructive" });
      setIsLoading(false);
      return;
    }
    const quantityValue = parseInt(form.quantity);
    const baseProductData = {
      name: form.name,
      category: form.category,
      unit: form.unit,
      purchasePrice: parseFloat(form.purchasePrice),
      sellingPrice: parseFloat(form.sellingPrice),
      stockDestination: form.stockDestination,
      lowStockThreshold: parseInt(form.lowStockThreshold),
      expiryDate: form.expiryDate ? new Date(form.expiryDate) : undefined,
      barcodes: mergedBarcodes,
      shopId: "shop-001",
    };

    const productData = editingProduct
      ? (() => {
          const editPayload: Record<string, unknown> = {
            ...baseProductData,
          };
          delete editPayload.stockDestination;

          const storeQtyValue = Number(form.storeQuantity || 0);
          const martQtyValue = Number(form.martQuantity || 0);
          const originalStoreQty = Number(editingProduct.storeQuantity ?? 0);
          const originalMartQty = Number(
            editingProduct.quantity ?? editingProduct.supermarketQuantity ?? 0,
          );

          if (storeQtyValue !== originalStoreQty) {
            editPayload.storeQuantity = storeQtyValue;
          }

          if (martQtyValue !== originalMartQty) {
            editPayload.quantity = martQtyValue;
            editPayload.supermarketQuantity = martQtyValue;
          }

          return editPayload;
        })()
      : {
          ...baseProductData,
          quantity: quantityValue,
          storeQuantity:
            form.stockDestination === "warehouse" ? quantityValue : 0,
          supermarketQuantity:
            form.stockDestination === "mart" ? quantityValue : 0,
        };

    try {
      if (editingProduct) {
        const result: any = await updateProduct(editingProduct.id, productData);
        if (result?.status === 202) {
          toast({
            title: "Sent for approval",
            description:
              "Your changes will be reviewed by manager and/or store keeper.",
          });
        } else {
          toast({ title: t("product_updated") });
        }
      } else {
        const result: any = await addProduct(productData as any);
        if (result?.status === 202) {
          toast({
            title: "Sent for manager approval",
            description: "Your new product will be created after approval.",
          });
        } else {
          toast({ title: t("product_added") });
        }
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
        if ((Array.isArray(form.barcodes) ? form.barcodes : []).length > 0) {
          toast({
            title: t("only_one_barcode_allowed"),
            variant: "destructive",
          });
          return;
        }
        const b = await generateUniqueBarcode();
        setForm((prev) => ({
          ...prev,
          barcodes: [b],
          barcodeInput: "",
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
    <RoleLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t("products")}</h1>
            <p className="text-muted-foreground">
              {t("manage_product_inventory")}
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
                    <Input
                      id="category"
                      list="category-list"
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      placeholder="Enter or select category"
                      required
                    />
                    <datalist id="category-list">
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name} />
                      ))}
                    </datalist>
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
                    {editingProduct ? (
                      <>
                        <Label htmlFor="storeQuantity">Store Quantity *</Label>
                        <Input
                          id="storeQuantity"
                          type="number"
                          value={form.storeQuantity}
                          onChange={(e) =>
                            setForm({ ...form, storeQuantity: e.target.value })
                          }
                          required
                        />
                        <div className="text-xs text-muted-foreground">
                          Store quantity edits go to Store Keeper approval.
                        </div>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                  {editingProduct && (
                    <div className="space-y-2">
                      <Label htmlFor="martQuantity">Mart Quantity *</Label>
                      <Input
                        id="martQuantity"
                        type="number"
                        value={form.martQuantity}
                        onChange={(e) =>
                          setForm({ ...form, martQuantity: e.target.value })
                        }
                        required
                      />
                      <div className="text-xs text-muted-foreground">
                        Mart quantity edits go to Manager approval.
                      </div>
                    </div>
                  )}
                  {!editingProduct && (
                    <div className="space-y-2">
                      <Label htmlFor="stockDestination">
                        Initial stock location
                      </Label>
                      <Select
                        value={form.stockDestination}
                        onValueChange={(v) =>
                          setForm({
                            ...form,
                            stockDestination: v as "warehouse" | "mart",
                          })
                        }
                      >
                        <SelectTrigger id="stockDestination">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warehouse">
                            Warehouse / store stock
                          </SelectItem>
                          <SelectItem value="mart">Direct to mart</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground">
                        {form.stockDestination === "mart"
                          ? "New product stock will go straight to mart and be immediately sellable."
                          : "New product stock will start in warehouse and can be transferred later."}
                      </div>
                    </div>
                  )}
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
                        placeholder={t("enter_barcode_to_add")}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsScannerOpen(true)}
                        title={t("scan")}
                      >
                        <ScanBarcode className="h-4 w-4" />
                      </Button>
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
                                if (
                                  editingProduct &&
                                  currentEditingId &&
                                  foundId === currentEditingId
                                ) {
                                  const existing = Array.isArray(form.barcodes)
                                    ? form.barcodes.slice()
                                    : [];
                                  if (
                                    existing.length > 0 &&
                                    !existing.includes(val)
                                  ) {
                                    toast({
                                      title: t("only_one_barcode_allowed"),
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  setForm({
                                    ...form,
                                    barcodes:
                                      existing.length > 0 ? existing : [val],
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
                              if (
                                existing.length > 0 &&
                                !existing.includes(val)
                              ) {
                                toast({
                                  title: t("only_one_barcode_allowed"),
                                  variant: "destructive",
                                });
                                return;
                              }
                              setForm({
                                ...form,
                                barcodes:
                                  existing.length > 0 ? existing : [val],
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
                                role="button"
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
                        Delete the current barcode first to set a new one.
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
                                  if (!res.ok)
                                    throw new Error(await res.text());
                                  const p = await res.json();
                                  const normalized: any = {
                                    ...p,
                                    id: p.id || p._id,
                                  };

                                  setEditingProduct(normalized);
                                  const loadedStoreQty = Number(
                                    normalized.storeQuantity ?? 0,
                                  );
                                  const loadedMartQty = Number(
                                    normalized.quantity ??
                                      normalized.supermarketQuantity ??
                                      0,
                                  );
                                  setForm({
                                    name: String(normalized.name || ""),
                                    category: String(normalized.category || ""),
                                    unit: (normalized.unit as any) || "pcs",
                                    purchasePrice: String(
                                      normalized.purchasePrice ?? 0,
                                    ),
                                    sellingPrice: String(
                                      normalized.sellingPrice ?? 0,
                                    ),
                                    quantity: String(loadedMartQty),
                                    storeQuantity: String(loadedStoreQty),
                                    martQuantity: String(loadedMartQty),
                                    stockDestination: "warehouse",
                                    lowStockThreshold: String(
                                      normalized.lowStockThreshold ?? 10,
                                    ),
                                    expiryDate: normalized.expiryDate
                                      ? new Date(normalized.expiryDate)
                                          .toISOString()
                                          .split("T")[0]
                                      : "",
                                    barcodes: Array.isArray(normalized.barcodes)
                                      ? normalized.barcodes.map(String)
                                      : normalized.barcode
                                        ? [String(normalized.barcode)]
                                        : [],
                                    barcodeInput: "",
                                  });

                                  toast({
                                    title: "Product loaded",
                                    description:
                                      "Update quantity and press Save.",
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
                        {t("saving")}
                      </>
                    ) : (
                      t("save")
                    )}
                  </Button>
                </div>
              </form>

              {isScannerOpen && (
                <BarcodeScanner
                  onScan={(code) => {
                    setForm((prev) => {
                      const existing = Array.isArray(prev.barcodes)
                        ? prev.barcodes
                        : [];
                      if (existing.length > 0 && !existing.includes(code)) {
                        toast({
                          title: t("only_one_barcode_allowed"),
                          variant: "destructive",
                        });
                        return { ...prev, barcodeInput: code };
                      }
                      if (existing.includes(code))
                        return { ...prev, barcodeInput: code };
                      return {
                        ...prev,
                        barcodes: [code],
                        barcodeInput: code,
                      };
                    });
                    setIsScannerOpen(false);
                  }}
                  onClose={() => setIsScannerOpen(false)}
                />
              )}

              <BarcodePrintDialog
                open={isPrintDialogOpen}
                onOpenChange={setIsPrintDialogOpen}
                barcode={printTargetBarcode}
                productName={form.name}
                price={form.sellingPrice}
              />
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
              type: "custom",
              render: ({ value, setValue }) => (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={typeof value === "string" ? value : ""}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder="Search products..."
                    className="pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setIsTableScannerOpen(true)}
                    title={t("scan")}
                  >
                    <ScanBarcode className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                  </Button>
                </div>
              ),
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
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead className="w-12">{t("image")}</TableHead>
                    <TableHead>{t("product_name")}</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead className="text-right">
                      {t("purchase_price")}
                    </TableHead>
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
                    filteredProducts.map((product, index) => (
                      <TableRow key={product.id}>
                        <TableCell className="text-center text-muted-foreground">
                          {startIndex + index + 1}
                        </TableCell>
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
                              onClick={() => {
                                setActiveScannerProduct(product);
                                setIsRowScannerOpen(true);
                              }}
                              title={t("scan_barcode_action")}
                              aria-label={t("scan_barcode_action")}
                            >
                              <ScanBarcode className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(product)}
                              title={t("edit")}
                              aria-label={t("edit")}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeleteTarget(product);
                                setIsDeleteOpen(true);
                              }}
                              className="text-destructive hover:text-destructive"
                              title={t("delete")}
                              aria-label={t("delete")}
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
                        colSpan={9}
                        className="text-center py-4 text-muted-foreground"
                      >
                        {Object.values(filterValues).some((value) =>
                          Boolean(value),
                        )
                          ? t("no_products_match_current_filters")
                          : t("no_products_available")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Delete confirmation modal */}
            <Modal
              isOpen={isDeleteOpen}
              onClose={() => {
                setIsDeleteOpen(false);
                setDeleteTarget(null);
              }}
              title={
                deleteTarget?.name
                  ? `Delete ${deleteTarget.name}`
                  : "Delete product"
              }
              type="error"
              size="md"
            >
              <div className="mb-4 text-sm text-muted-foreground">
                {deleteTarget?.name
                  ? `This will permanently delete ${deleteTarget.name}. This action cannot be undone.`
                  : "This will permanently delete the product. This action cannot be undone."}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteOpen(false);
                    setDeleteTarget(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const targetId = String(
                      deleteTarget?.id ?? (deleteTarget as any)?._id ?? "",
                    );
                    if (!targetId) return;
                    void handleDelete(targetId);
                    setIsDeleteOpen(false);
                    setDeleteTarget(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </Modal>

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
        {isTableScannerOpen && (
          <BarcodeScanner
            onScan={(code) => {
              setFilterValues((prev) => ({ ...prev, query: code }));
              setIsTableScannerOpen(false);
            }}
            onClose={() => setIsTableScannerOpen(false)}
          />
        )}

        {isRowScannerOpen && (
          <BarcodeScanner
            onScan={async (code) => {
              if (!activeScannerProduct) return;
              const existingBarcodes = Array.isArray(
                activeScannerProduct.barcodes,
              )
                ? activeScannerProduct.barcodes.slice()
                : activeScannerProduct.barcode
                  ? [activeScannerProduct.barcode]
                  : [];

              if (existingBarcodes.includes(code)) {
                toast({ title: "Barcode already exists for this product" });
                setIsRowScannerOpen(false);
                return;
              }

              try {
                await updateProduct(activeScannerProduct.id, {
                  barcodes: [...existingBarcodes, code],
                });
                toast({ title: "Barcode added successfully" });
              } catch (err) {
                toast({
                  title: "Failed to add barcode",
                  variant: "destructive",
                });
              } finally {
                setIsRowScannerOpen(false);
                setActiveScannerProduct(null);
              }
            }}
            onClose={() => {
              setIsRowScannerOpen(false);
              setActiveScannerProduct(null);
            }}
          />
        )}
      </div>
    </RoleLayout>
  );
}
