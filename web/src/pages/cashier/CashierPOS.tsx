import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { ProductSearch } from "@/components/pos/ProductSearch";
import { Cart } from "@/components/pos/Cart";
import { PaymentPanel } from "@/components/pos/PaymentPanel";
import {
  AdvancedFilters,
  type AdvancedFilterValues,
} from "@/components/ui/AdvancedFilters";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useCartStore } from "@/stores/cartStore";
import { useProductStore } from "@/stores/productStore";
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  Clock,
  Plus,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import type { Product } from "@/types";

const defaultFilterValues: AdvancedFilterValues = {
  query: "",
  category: "",
  stockStatus: "",
  sortBy: "name_asc",
};

function getPrimaryBarcode(product: Product) {
  return product.barcode || product.barcodes?.[0] || "";
}

function getAvailableQuantity(product: Product) {
  return Number(
    product.quantity ??
      product.supermarketQuantity ??
      product.storeQuantity ??
      0,
  );
}

function getWarehouseQuantity(product: Product) {
  return Number(product.storeQuantity ?? 0);
}

function getMartQuantity(product: Product) {
  return Number(product.quantity ?? product.supermarketQuantity ?? 0);
}

function getStockStatus(product: Product) {
  const quantity = getAvailableQuantity(product);
  const threshold = Number(product.lowStockThreshold || 0);

  if (quantity <= 0) {
    return "out_of_stock";
  }

  if (quantity <= threshold) {
    return "low_stock";
  }

  return "in_stock";
}

export default function CashierPOS() {
  const { t } = useTranslation();
  const { items, addItem } = useCartStore();
  const {
    products,
    isLoading,
    fetchError,
    fetchProducts,
    getLowStockProducts,
    getExpiringProducts,
  } = useProductStore();
  const { user } = useAuthStore();
  const isOwner = user?.role === "owner";
  const [filterValues, setFilterValues] =
    useState<AdvancedFilterValues>(defaultFilterValues);

  useEffect(() => {
    const refreshProducts = async () => {
      try {
        if (!navigator.onLine) return;
        await fetchProducts();
      } catch (err) {
        console.warn("Product fetch failed to start:", err);
      }
    };

    refreshProducts();
    const intervalId = window.setInterval(refreshProducts, 60_000);
    window.addEventListener("online", refreshProducts);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("online", refreshProducts);
    };
  }, [fetchProducts]);

  const lowStock = getLowStockProducts();
  const expiring = getExpiringProducts(7);
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
      const altName = String(product.nameAm || "").toLowerCase();
      const productCategory = String(product.category || "")
        .trim()
        .toLowerCase();
      const barcode = getPrimaryBarcode(product).toLowerCase();
      const currentStatus = getStockStatus(product);
      const martQty = getMartQuantity(product);

      const matchesQuery =
        !query ||
        name.includes(query) ||
        altName.includes(query) ||
        barcode.includes(query) ||
        productCategory.includes(query);
      const matchesCategory = !category || productCategory === category;
      const matchesStockStatus = !stockStatus || currentStatus === stockStatus;

      return (
        matchesQuery && matchesCategory && matchesStockStatus && martQty > 0
      );
    });

    return filtered.sort((left, right) => {
      switch (sortBy) {
        case "name_desc":
          return String(right.name || "").localeCompare(
            String(left.name || ""),
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
          return getAvailableQuantity(left) - getAvailableQuantity(right);
        case "stock_desc":
          return getAvailableQuantity(right) - getAvailableQuantity(left);
        case "category_asc":
          return String(left.category || "").localeCompare(
            String(right.category || ""),
          );
        case "name_asc":
        default:
          return String(left.name || "").localeCompare(
            String(right.name || ""),
          );
      }
    });
  }, [filterValues, products]);

  const handleAddToCart = (product: Product) => {
    const martQty = getMartQuantity(product);
    if (martQty <= 0) {
      toast({
        title: t("out_of_stock") || "Out of stock",
        description: `${product.name} cannot be sold because mart quantity is 0.`,
        variant: "destructive",
      });
      return;
    }

    const inCart =
      items.find((item) => item.product.id === product.id)?.quantity || 0;
    if (inCart >= martQty) {
      toast({
        title: t("stock_limit_reached") || "Stock limit reached",
        description: `${product.name} reached available mart quantity (${martQty}).`,
        variant: "destructive",
      });
      return;
    }

    addItem(product, 1);
    toast({
      title: t("product_added"),
      description: `${product.name} added to cart`,
    });
  };

  const productColumns: DataTableColumn<Product>[] = [
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
      cell: (product) => (
        <Badge variant="outline">{product.category || "-"}</Badge>
      ),
      searchable: true,
    },
    ...(isOwner
      ? [
          {
            key: "purchasePrice",
            header: t("purchase_price"),
            accessor: (product: Product) => Number(product.purchasePrice || 0),
            cell: (product: Product) =>
              `${Number(product.purchasePrice || 0).toLocaleString()} ETB`,
          } satisfies DataTableColumn<Product>,
        ]
      : []),
    {
      key: "sellingPrice",
      header: t("selling_price"),
      accessor: (product) => Number(product.sellingPrice || 0),
      cell: (product) =>
        `${Number(product.sellingPrice || 0).toLocaleString()} ETB`,
    },
    {
      key: "stock",
      header: t("stock"),
      accessor: (product) => getWarehouseQuantity(product),
      cell: (product) => {
        return (
          <Badge
            variant={
              getWarehouseQuantity(product) > 0 ? "secondary" : "destructive"
            }
          >
            {getWarehouseQuantity(product)} {t("pcs")}
          </Badge>
        );
      },
    },
    {
      key: "martQty",
      header: t("mart_qty"),
      accessor: (product) => getMartQuantity(product),
      cell: (product) => {
        const martQty = getMartQuantity(product);

        return (
          <Badge variant={martQty > 0 ? "secondary" : "destructive"}>
            {martQty} {t("pcs")}
          </Badge>
        );
      },
    },
  ];

  return (
    <RoleLayout allowedRoles={["cashier", "owner", "manager"]}>
      <div className="flex h-full min-h-0 flex-col gap-3 sm:gap-4">
        {/* Top row: Search, Cart, and Payment - stacks vertically on mobile, side-by-side on desktop */}
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          <div className="space-y-3 sm:space-y-4 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ProductSearch
                value={String(filterValues.query || "")}
                onValueChange={(value) =>
                  setFilterValues((current) => ({
                    ...current,
                    query: value,
                  }))
                }
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="min-h-[280px] sm:min-h-[320px]"
            >
              <Card className="flex h-full flex-col">
                <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                      {t("cart")}
                    </div>
                    {items.length > 0 && (
                      <Badge className="text-xs">
                        {items.length} {t("items")}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col min-h-0 pb-3 sm:pb-4 px-4 sm:px-6">
                  <Cart />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="min-w-0"
          >
            <Card className="h-full">
              <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t("payment_method")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <PaymentPanel />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Products section - scrollable on mobile */}
        <div className="space-y-3 sm:space-y-4 overflow-y-auto pr-1">
          {/* Quick Alerts */}
          {(lowStock.length > 0 || expiring.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap gap-2"
            >
              {lowStock.length > 0 && (
                <Badge
                  variant="secondary"
                  className="gap-1.5 bg-warning/10 text-warning border-warning/20 text-xs"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {lowStock.length} {t("low_stock")}
                </Badge>
              )}
              {expiring.length > 0 && (
                <Badge
                  variant="secondary"
                  className="gap-1.5 bg-destructive/10 text-destructive border-destructive/20 text-xs"
                >
                  <Clock className="h-3 w-3" />
                  {expiring.length} {t("expiring_soon")}
                </Badge>
              )}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <AdvancedFilters
              title={t("product_filters")}
              description={t("pos_product_filters_description")}
              fields={[
                {
                  key: "query",
                  label: "Search products",
                  type: "search",
                  placeholder: "Search by name, category, or barcode",
                },
                {
                  key: "category",
                  label: t("category"),
                  type: "select",
                  placeholder: "All categories",
                  options: [
                    { label: "All categories", value: "all" },
                    ...categoryOptions,
                  ],
                },
                {
                  key: "stockStatus",
                  label: "Stock status",
                  type: "select",
                  placeholder: "All stock states",
                  options: [
                    { label: "All stock states", value: "all" },
                    { label: "In stock", value: "in_stock" },
                    { label: "Low stock", value: "low_stock" },
                    { label: "Out of stock", value: "out_of_stock" },
                  ],
                },
                {
                  key: "sortBy",
                  label: "Sort by",
                  type: "select",
                  placeholder: "Select sort",
                  options: [
                    { label: "Name A-Z", value: "name_asc" },
                    { label: "Name Z-A", value: "name_desc" },
                    { label: "Category", value: "category_asc" },
                    { label: "Price low-high", value: "price_asc" },
                    { label: "Price high-low", value: "price_desc" },
                    { label: "Stock low-high", value: "stock_asc" },
                    { label: "Stock high-low", value: "stock_desc" },
                  ],
                },
              ]}
              values={filterValues}
              onValuesChange={(nextValues) =>
                setFilterValues({
                  ...nextValues,
                  category:
                    nextValues.category === "all" ? "" : nextValues.category,
                  stockStatus:
                    nextValues.stockStatus === "all"
                      ? ""
                      : nextValues.stockStatus,
                })
              }
              onReset={() => setFilterValues(defaultFilterValues)}
              applyLabel="Apply"
              resetLabel="Clear"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <DataTable
              columns={productColumns}
              data={filteredProducts}
              rowKey="id"
              title={t("detailed_product_list")}
              description={t("detailed_product_list_description")}
              isLoading={isLoading}
              loadingMessage={t("loading_products") || "Loading products..."}
              emptyMessage={
                fetchError
                  ? fetchError
                  : t("no_products_found") || "No products match the selected filters."
              }
              pagination
              initialPageSize={8}
              pageSizeOptions={[8, 12, 20]}
              customRowActions={[
                {
                  label: t("add"),
                  icon: Plus,
                  onClick: handleAddToCart,
                },
              ]}
              toolbarContent={
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {filteredProducts.length} {t("products")}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {items.length} {t("items_in_cart")}
                  </Badge>
                </div>
              }
            />
          </motion.div>
        </div>
      </div>
    </RoleLayout>
  );
}
