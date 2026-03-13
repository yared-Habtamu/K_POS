import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/Modal";
import { ThreeDotActionMenu } from "@/components/ui/ThreeDotActionMenu";
import {
  AdvancedFilters,
  type AdvancedFilterValues,
} from "@/components/ui/AdvancedFilters";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/DataTable";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { useProductStore } from "@/stores/productStore";
import type { Product } from "@/types";
import {
  Package,
  Plus,
  Barcode,
  Warehouse,
  Store,
  ArrowRight,
  Image as ImageIcon,
  Pencil,
  Upload,
} from "lucide-react";

const defaultFilterValues: AdvancedFilterValues = {
  query: "",
  category: "",
  stockStatus: "",
  sortBy: "name_asc",
};

function getPrimaryBarcode(product: Product) {
  return product.barcode || product.barcodes?.[0] || "";
}

function getRemainingQuantity(product: Product) {
  return Number(
    product.quantity ?? product.supermarketQuantity ?? product.storeQuantity ?? 0,
  );
}

function getWarehouseQuantity(product: Product) {
  return Number(product.storeQuantity ?? 0);
}

function getMartQuantity(product: Product) {
  // Keep mart quantity display consistent with products page.
  return Number(product.quantity ?? product.supermarketQuantity ?? 0);
}

function getSoldQuantity(product: Product) {
  return Math.max(0, Number(product._sold || 0));
}

export default function StockManagement() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isOwner = user?.role === "owner";
  const location = useLocation();
  const isAddStockPage = location.pathname.includes("/add-stock");
  const isOwnerInventoryPage = location.pathname === "/owner/inventory";
  const token = user?.token;
  const { products, isLoading, fetchProducts, fetchError, updateProduct } =
    useProductStore();

  const canTransfer =
    !user ||
    user.role !== "store_keeper" ||
    (Array.isArray(user.permissions) &&
      user.permissions.includes("transferStock"));
  const error = fetchError || null;

  useEffect(() => {
    // ensure product store is populated (it also fetches sales to compute _sold)
    (async () => {
      try {
        await fetchProducts?.();
      } catch (e) {
        // ignore
      }
    })();
  }, [fetchProducts]);
  const [filterValues, setFilterValues] = useState<AdvancedFilterValues>(defaultFilterValues);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addQuantity, setAddQuantity] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [barcodeEditOpen, setBarcodeEditOpen] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [imageUploadFor, setImageUploadFor] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const categoryOptions = useMemo(() => {
    const categories = Array.from(
      new Set(
        products
          .map((product) => String(product.category || "").trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right));

    return categories.map((category) => ({ label: category, value: category }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = String(filterValues.query || "").trim().toLowerCase();
    const category = String(filterValues.category || "").trim().toLowerCase();
    const stockStatus = String(filterValues.stockStatus || "").trim();
    const sortBy = String(filterValues.sortBy || "name_asc");

    const filtered = products.filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const barcode = getPrimaryBarcode(product).toLowerCase();
      const productCategory = String(product.category || "").trim().toLowerCase();
      const warehouseQuantity = getWarehouseQuantity(product);
      const martQuantity = getMartQuantity(product);

      const matchesQuery =
        !query ||
        name.includes(query) ||
        barcode.includes(query) ||
        productCategory.includes(query);
      const matchesCategory = !category || productCategory === category;
      const matchesStockStatus =
        !stockStatus ||
        (stockStatus === "in_stock" && martQuantity > 10) ||
        (stockStatus === "low_stock" && martQuantity > 0 && martQuantity <= 10) ||
        (stockStatus === "out_of_stock" && martQuantity <= 0) ||
        (stockStatus === "warehouse_empty" && warehouseQuantity <= 0);

      return matchesQuery && matchesCategory && matchesStockStatus;
    });

    return filtered.sort((left, right) => {
      switch (sortBy) {
        case "name_desc":
          return String(right.name || "").localeCompare(String(left.name || ""));
        case "stock_asc":
          return getRemainingQuantity(left) - getRemainingQuantity(right);
        case "stock_desc":
          return getRemainingQuantity(right) - getRemainingQuantity(left);
        case "mart_qty_asc":
          return getMartQuantity(left) - getMartQuantity(right);
        case "mart_qty_desc":
          return getMartQuantity(right) - getMartQuantity(left);
        case "name_asc":
        default:
          return String(left.name || "").localeCompare(String(right.name || ""));
      }
    });
  }, [filterValues, products]);

  // use product store's update to keep state in sync and ensure `_sold` remains accurate
  // `updateProduct` is pulled from the store above via useProductStore()

  const handleAddStock = async () => {
    if (!selectedProduct || !addQuantity) return;

    const qty = parseInt(addQuantity);
    if (qty <= 0) return;
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
    try {
      const res = await fetch(`${API_BASE}/api/stock-transfer-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ productId: selectedProduct.id, quantity: qty }),
      });
      const body = await res.json().catch(() => null);
      console.debug("stock transfer response", res.status, body);

      if (!res.ok) {
        throw new Error(body?.message || `Request failed ${res.status}`);
      }

      // If backend applied transfer immediately it returns 201; otherwise 202 pending
      if (res.status === 201) {
        toast({
          title: t("transfer_completed"),
          description: `${qty} ${t("units_of")} ${selectedProduct.name}.`,
        });
      } else {
        toast({
          title: t("transfer_submitted"),
          description: `${t("request_sent_for")} ${qty} ${t("units_of")} ${selectedProduct.name}. ${t("awaiting_manager_approval")}`,
        });
      }
      try {
        await fetchProducts?.();
        window.dispatchEvent(new CustomEvent("stock-transfer-updated", {
          detail: {
            productId: selectedProduct.id,
            quantity: qty,
            status: res.status,
          },
        }));
      } catch {
        // ignore refresh errors after successful transfer submission
      }
      setIsDialogOpen(false);
      setSelectedProduct(null);
      setAddQuantity("");
    } catch (err: unknown) {
      let msg = t("please_try_again");
      if (err instanceof Error && err.message) msg = err.message;
      else if (typeof err === "string") msg = err;
      toast({
        title: t("could_not_submit_transfer"),
        description: msg,
        variant: "destructive",
      });
    }
  };

  const openAddStockDialog = (product: Product) => {
    setSelectedProduct(product);
    setAddQuantity("");
    setIsDialogOpen(true);
  };

  const openBarcodeEditor = (product: Product) => {
    setSelectedProduct(product);
    setBarcodeValue(
      Array.isArray(product.barcodes)
        ? product.barcodes.join(",")
        : product.barcode || "",
    );
    setBarcodeEditOpen(true);
  };

  const handleSaveBarcodes = async () => {
    if (!selectedProduct) return;

    const barcodes = String(barcodeValue)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    try {
      await updateProduct(selectedProduct.id, { barcodes });
      toast({ title: t("barcodes_updated") });
      setBarcodeEditOpen(false);
      setSelectedProduct(null);
      setBarcodeValue("");
    } catch {
      toast({
        title: t("failed_update_barcodes"),
        variant: "destructive",
      });
    }
  };

  const openImagePicker = (product: Product) => {
    setImageUploadFor(product.id);
    imageInputRef.current?.click();
  };

  const stockColumns: DataTableColumn<Product>[] = [
    {
      key: "image",
      header: t("image"),
      cell: (product) =>
        product.pictureUrl ? (
          <img
            src={product.pictureUrl}
            alt={product.name}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
        ),
    },
    {
      key: "name",
      header: t("product_name"),
      accessor: (product) => product.name,
      searchable: true,
    },
    {
      key: "category",
      header: t("category"),
      accessor: (product) => product.category,
      cell: (product) => <Badge variant="outline">{product.category || "-"}</Badge>,
      searchable: true,
    },
    ...(isOwner
      ? [
          {
            key: "purchasePrice",
            header: t("purchase_price"),
            accessor: (product: Product) => Number(product.purchasePrice || 0),
            cell: (product: Product) => `${Number(product.purchasePrice || 0).toLocaleString()} ETB`,
          } satisfies DataTableColumn<Product>,
        ]
      : []),
    {
      key: "sellingPrice",
      header: t("selling_price"),
      accessor: (product) => Number(product.sellingPrice || 0),
      cell: (product) => `${Number(product.sellingPrice || 0).toLocaleString()} ETB`,
    },
    {
      key: "stock",
      header: t("stock"),
      accessor: (product) => getWarehouseQuantity(product),
      cell: (product) => (
        <Badge variant={getWarehouseQuantity(product) > 0 ? "secondary" : "destructive"}>
          {getWarehouseQuantity(product)} pcs
        </Badge>
      ),
    },
    {
      key: "martQty",
      header: "Mart Qty",
      accessor: (product) => getMartQuantity(product),
      cell: (product) => (
        <Badge variant={getMartQuantity(product) > 0 ? "secondary" : "destructive"}>
          {getMartQuantity(product)} pcs
        </Badge>
      ),
    },
  ];

  const ownerInventoryColumns: DataTableColumn<Product>[] = [
    {
      key: "image",
      header: "Img",
      cell: (product) =>
        product.pictureUrl ? (
          <img
            src={product.pictureUrl}
            alt={product.name}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
        ),
    },
    {
      key: "name",
      header: "Name",
      accessor: (product) => product.name,
      searchable: true,
    },
    {
      key: "category",
      header: "Category",
      accessor: (product) => product.category,
      searchable: true,
    },
    {
      key: "sold",
      header: "Sold",
      accessor: (product) => getSoldQuantity(product),
    },
    {
      key: "remain",
      header: "Remain",
      accessor: (product) => getRemainingQuantity(product),
    },
  ];

  const columns = isOwnerInventoryPage ? ownerInventoryColumns : stockColumns;

  return (
    <RoleLayout allowedRoles={["store_keeper", "owner"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {isAddStockPage ? t("add_stock") : t("inventory")}
            </h1>
            <p className="text-muted-foreground">
              {isAddStockPage
                ? t("add_stock_subtitle")
                : t("inventory_subtitle")}
            </p>
          </div>

          <div>
            {/* Add product is owner-only. Store-keeper should not see Add Product here. */}
          </div>
        </div>

        {/* Dashboard stats removed from inventory page to avoid duplication; inventory page focuses on stock management */}

        <AdvancedFilters
          title={isAddStockPage ? "Search and filter stock transfers" : "Search and filter inventory"}
          description="Search products by name, barcode, category, stock level, and sort order."
          fields={[
            {
              key: "query",
              label: "Search",
              type: "search",
              placeholder: t("search_by_name_or_barcode"),
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
                { label: "Warehouse Empty", value: "warehouse_empty" },
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
                ...(isOwnerInventoryPage
                  ? [
                      { label: "Remain Low -> High", value: "stock_asc" },
                      { label: "Remain High -> Low", value: "stock_desc" },
                    ]
                  : [
                      { label: "Stock Low -> High", value: "stock_asc" },
                      { label: "Stock High -> Low", value: "stock_desc" },
                      { label: "Mart Qty Low -> High", value: "mart_qty_asc" },
                      { label: "Mart Qty High -> Low", value: "mart_qty_desc" },
                    ]),
              ],
            },
          ]}
          values={filterValues}
          onValuesChange={setFilterValues}
          onReset={() => setFilterValues(defaultFilterValues)}
          showActiveBadges={false}
        />

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !imageUploadFor) return;
            const formData = new FormData();
            formData.append("image", file, file.name);
            try {
              await updateProduct(imageUploadFor, formData);
              toast({ title: t("image_uploaded") });
            } catch {
              toast({
                title: t("failed_upload_image"),
                variant: "destructive",
              });
            } finally {
              setImageUploadFor(null);
              if (imageInputRef.current) imageInputRef.current.value = "";
            }
          }}
        />

        <DataTable
          columns={columns}
          data={filteredProducts}
          rowKey={(product) => product.id}
          title={
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <span>{isAddStockPage ? t("add_stock") : t("inventory")}</span>
              <Badge variant="secondary">{filteredProducts.length}</Badge>
            </div>
          }
          description={isAddStockPage ? t("add_stock_subtitle") : t("inventory_subtitle")}
          isLoading={isLoading}
          loadingMessage={t("loading_products")}
          emptyMessage={t("no_products_found")}
          pagination
          initialPageSize={7}
          renderRowActions={
            isOwnerInventoryPage
              ? undefined
              : (product) => (
                  <ThreeDotActionMenu
                    menuLabel={product.name}
                    items={[
                      {
                        label: t("add_stock"),
                        onSelect: () => openAddStockDialog(product),
                        icon: Plus,
                        disabled: !canTransfer,
                      },
                      {
                        label: t("edit_barcodes"),
                        onSelect: () => openBarcodeEditor(product),
                        icon: Pencil,
                      },
                      {
                        label: t("add_image"),
                        onSelect: () => openImagePicker(product),
                        icon: Upload,
                      },
                    ]}
                  />
                )
          }
        />

        <Modal
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedProduct(null);
            setAddQuantity("");
          }}
          title={t("add_stock")}
          size="lg"
          type="info"
        >
          {selectedProduct && (
            <div className="space-y-4">
                {/* Product Info */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-accent/50">
                  {selectedProduct.pictureUrl ? (
                    <img
                      src={selectedProduct.pictureUrl}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{selectedProduct.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedProduct.category}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        <Barcode className="w-3 h-3 mr-1" />
                        {getPrimaryBarcode(selectedProduct) || "No Barcode"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Current Stock */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Warehouse className="w-4 h-4" />
                      {t("warehouse_stock")}
                    </p>
                    <p className="text-2xl font-bold text-warning">
                      {selectedProduct.storeQuantity}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Store className="w-4 h-4" />
                      {t("supermarket_stock")}
                    </p>
                    <p className="text-2xl font-bold text-success">
                      {getMartQuantity(selectedProduct)}
                    </p>
                  </div>
                </div>

                {/* Add Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="addQty">{t("quantity_to_transfer")}</Label>
                  <Input
                    id="addQty"
                    type="number"
                    placeholder={t("enter_quantity")}
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(e.target.value)}
                    max={selectedProduct.storeQuantity}
                    min={1}
                  />
                  {selectedProduct.storeQuantity > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("max_available")}: {selectedProduct.storeQuantity}{" "}
                      {t("units")}
                    </p>
                  )}
                </div>

                {/* Preview */}
                {addQuantity && parseInt(addQuantity) > 0 && (
                  <div className="p-4 rounded-xl bg-accent border border-border">
                    <p className="text-sm font-medium mb-2">
                      {t("after_transfer")}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {t("warehouse")}:{" "}
                        {Math.max(
                          0,
                          selectedProduct.storeQuantity - parseInt(addQuantity),
                        )}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                      <span>
                        {t("supermarket")}:{" "}
                        {getMartQuantity(selectedProduct) +
                          parseInt(addQuantity)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setSelectedProduct(null);
                      setAddQuantity("");
                    }}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    onClick={handleAddStock}
                    disabled={
                      !addQuantity ||
                      parseInt(addQuantity) <= 0 ||
                      parseInt(addQuantity) > selectedProduct.storeQuantity ||
                      (user &&
                        user.role === "store_keeper" &&
                        !(
                          Array.isArray(user.permissions) &&
                          user.permissions.includes("transferStock")
                        ))
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t("transfer_stock")}
                  </Button>
                </div>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={barcodeEditOpen}
          onClose={() => {
            setBarcodeEditOpen(false);
            setBarcodeValue("");
            setSelectedProduct(null);
          }}
          title={t("edit_barcodes")}
          size="md"
          type="info"
        >
          {selectedProduct ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-muted-foreground">{selectedProduct.category}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcodes">{t("edit_barcodes")}</Label>
                <Input
                  id="barcodes"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  placeholder="Enter barcodes separated by commas"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBarcodeEditOpen(false);
                    setBarcodeValue("");
                    setSelectedProduct(null);
                  }}
                >
                  {t("cancel")}
                </Button>
                <Button onClick={handleSaveBarcodes}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t("save")}
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>
      </div>
    </RoleLayout>
  );
}
