import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import {
  AdvancedFilters,
  type AdvancedFilterValues,
} from "@/components/ui/AdvancedFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProductStore } from "@/stores/productStore";
import {
  Package,
  Image as ImageIcon,
  RotateCw,
} from "lucide-react";

const ITEMS_PER_PAGE = 7;
const defaultFilterValues: AdvancedFilterValues = {
  query: "",
  category: "",
  stockStatus: "",
  sortBy: "name_asc",
};

export default function StoreKeeperProductManagement() {
  const { t } = useTranslation();
  const { products, categories, totalProducts } = useProductStore();
  const [filterValues, setFilterValues] = useState<AdvancedFilterValues>(
    defaultFilterValues,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshProducts = async (page = currentPage) => {
    setIsRefreshing(true);
    try {
      await useProductStore.getState().fetchCategories?.();
      await (useProductStore.getState().fetchProducts?.(page, ITEMS_PER_PAGE) as Promise<void>);
    } catch {
      // ignore refresh failures; existing store data remains visible
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void refreshProducts(1);
  }, []);

  useEffect(() => {
    void refreshProducts(currentPage);
  }, [currentPage]);

  useEffect(() => {
    const handleStockTransferUpdated = () => {
      void refreshProducts(currentPage);
    };

    window.addEventListener("stock-transfer-updated", handleStockTransferUpdated);
    window.addEventListener("focus", handleStockTransferUpdated);

    return () => {
      window.removeEventListener("stock-transfer-updated", handleStockTransferUpdated);
      window.removeEventListener("focus", handleStockTransferUpdated);
    };
  }, [currentPage]);

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.name,
        value: category.name,
      })),
    [categories],
  );

  const filteredProducts = useMemo(() => {
    const query = String(filterValues.query || "").trim().toLowerCase();
    const category = String(filterValues.category || "").trim().toLowerCase();
    const stockStatus = String(filterValues.stockStatus || "").trim();
    const sortBy = String(filterValues.sortBy || "name_asc");

    const filtered = products.filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const barcode = String(product.barcode || product.barcodes?.[0] || "").toLowerCase();
      const productCategory = String(product.category || "").trim().toLowerCase();
      const martQty = Number(product.quantity ?? product.supermarketQuantity ?? 0);

      const matchesQuery = !query || name.includes(query) || barcode.includes(query) || productCategory.includes(query);
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
          return String(right.name || "").localeCompare(String(left.name || ""));
        case "category_asc":
          return String(left.category || "").localeCompare(String(right.category || ""));
        case "price_asc":
          return Number(left.sellingPrice || 0) - Number(right.sellingPrice || 0);
        case "price_desc":
          return Number(right.sellingPrice || 0) - Number(left.sellingPrice || 0);
        case "stock_asc":
          return Number(left.quantity ?? left.supermarketQuantity ?? 0) - Number(right.quantity ?? right.supermarketQuantity ?? 0);
        case "stock_desc":
          return Number(right.quantity ?? right.supermarketQuantity ?? 0) - Number(left.quantity ?? left.supermarketQuantity ?? 0);
        case "name_asc":
        default:
          return String(left.name || "").localeCompare(String(right.name || ""));
      }
    });
  }, [categories, filterValues, products]);

  const totalPages = Math.max(1, Math.ceil((totalProducts || filteredProducts.length) / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <RoleLayout allowedRoles={["store_keeper"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("products")}</h1>
            <p className="text-muted-foreground">View product inventory without edit actions.</p>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => void refreshProducts()}
            disabled={isRefreshing}
            aria-label="Refresh products"
            title="Refresh products"
          >
            <RotateCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
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
                    <TableHead className="text-right">{t("selling_price")}</TableHead>
                    <TableHead className="text-right">{t("stock")}</TableHead>
                    <TableHead className="text-right">{t("mart_qty")}</TableHead>
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
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{product.sellingPrice} ETB</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">
                            {Number(product.storeQuantity ?? 0)} {product.unit}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const martQty = Number(product.quantity ?? product.supermarketQuantity ?? 0);
                            const lowThreshold = Number(product.lowStockThreshold || 0);
                            return (
                              <Badge variant={martQty <= lowThreshold ? "destructive" : "secondary"}>
                                {martQty} {product.unit}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-4 text-center text-muted-foreground">
                        {Object.values(filterValues).some((value) => Boolean(value)) ? "No products found" : "No products yet."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-2 py-3 sm:flex-row">
              <div className="text-xs text-muted-foreground">
                Showing <span className="font-medium">{filteredProducts.length ? startIndex + 1 : 0}</span>–
                <span className="font-medium">{startIndex + filteredProducts.length}</span> of <span className="font-medium">{totalProducts || filteredProducts.length}</span> products
              </div>

              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  Prev
                </Button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
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
