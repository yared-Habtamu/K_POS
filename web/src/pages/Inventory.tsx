// src/pages/Inventory.tsx
import { useState, useEffect, useMemo } from "react";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  AdvancedFilters,
  type AdvancedFilterValues,
} from "@/components/ui/AdvancedFilters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useProductStore } from "@/stores/productStore";

const ITEMS_PER_PAGE = 7; // ✅ 7 items per page
const defaultFilterValues: AdvancedFilterValues = {
  query: "",
  category: "",
  stockStatus: "",
  sortBy: "",
};

export default function Inventory() {
  const [filterValues, setFilterValues] = useState<AdvancedFilterValues>(defaultFilterValues);
  const [currentPage, setCurrentPage] = useState(1); // ✅ Pagination state
  const { products, isLoading, fetchProducts, fetchError } = useProductStore();

  // ensure store is refreshed when this page mounts
  useEffect(() => {
    (async () => {
      try {
        await fetchProducts?.();
      } catch (e) {
        // ignore
      }
    })();
  }, [fetchProducts]);

  // map store fields into local-friendly naming (products already normalized in store)
  const loading = isLoading;
  const error = fetchError || null;

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
      const barcode = String(product.barcodes?.[0] || product.barcode || "").toLowerCase();
      const productCategory = String(product.category || "").trim().toLowerCase();
      const remaining = Number(product.quantity ?? product.supermarketQuantity ?? product.storeQuantity ?? 0);

      const matchesQuery =
        !query ||
        name.includes(query) ||
        barcode.includes(query) ||
        productCategory.includes(query);
      const matchesCategory = !category || productCategory === category;
      const matchesStockStatus =
        !stockStatus ||
        (stockStatus === "in_stock" && remaining > 10) ||
        (stockStatus === "low_stock" && remaining > 0 && remaining <= 10) ||
        (stockStatus === "out_of_stock" && remaining <= 0);

      return matchesQuery && matchesCategory && matchesStockStatus;
    });

    return filtered.sort((left, right) => {
      const leftRemaining = Number(left.quantity ?? left.supermarketQuantity ?? left.storeQuantity ?? 0);
      const rightRemaining = Number(right.quantity ?? right.supermarketQuantity ?? right.storeQuantity ?? 0);
      const leftSold = Math.max(0, Number(left._sold || 0));
      const rightSold = Math.max(0, Number(right._sold || 0));

      switch (sortBy) {
        case "name_desc":
          return String(right.name || "").localeCompare(String(left.name || ""));
        case "remaining_asc":
          return leftRemaining - rightRemaining;
        case "remaining_desc":
          return rightRemaining - leftRemaining;
        case "sold_desc":
          return rightSold - leftSold;
        case "category_asc":
          return String(left.category || "").localeCompare(String(right.category || ""));
        case "name_asc":
        default:
          return String(left.name || "").localeCompare(String(right.name || ""));
      }
    });
  }, [filterValues, products]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterValues]);

  // ✅ Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // ✅ Pagination handlers
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
    <RoleLayout allowedRoles={["owner", "manager", "store_keeper"]}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("inventory")}</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="mb-4">
              <AdvancedFilters
                title={t("search_and_filter_inventory")}
                description={t("find_products_by_name_barcode_category_stock_level_or_sort_order")}
                fields={[
                  {
                    key: "query",
                    label: t("search"),
                    type: "search",
                    placeholder: t("search_by_name_barcode_or_category"),
                  },
                  {
                    key: "category",
                    label: t("category"),
                    type: "select",
                    placeholder: t("all_categories"),
                    options: categoryOptions,
                  },
                  {
                    key: "stockStatus",
                    label: t("stock_status"),
                    type: "select",
                    placeholder: t("all_stock_levels"),
                    options: [
                      { label: t("in_stock"), value: "in_stock" },
                      { label: t("low_stock"), value: "low_stock" },
                      { label: t("out_of_stock"), value: "out_of_stock" },
                    ],
                  },
                  {
                    key: "sortBy",
                    label: t("sort_by"),
                    type: "select",
                    placeholder: t("name_a_to_z"),
                    options: [
                      { label: t("name_a_to_z"), value: "name_asc" },
                      { label: t("name_z_to_a"), value: "name_desc" },
                      { label: t("category_a_to_z"), value: "category_asc" },
                      { label: t("remaining_low_to_high"), value: "remaining_asc" },
                      { label: t("remaining_high_to_low"), value: "remaining_desc" },
                      { label: t("most_sold_first"), value: "sold_desc" },
                    ],
                  },
                ]}
                values={filterValues}
                onValuesChange={setFilterValues}
                onReset={() => setFilterValues(defaultFilterValues)}
                showActiveBadges={false}
              />
            </div>

            {/* Inventory Table */}
            {loading && (
              <div className="py-6 text-center">{t("loading_products")}</div>
            )}
            {error && (
              <div className="py-6 text-center text-destructive">{error}</div>
            )}
            <div className="overflow-x-auto">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[10%]">{t("image")}</TableHead>
                    <TableHead className="text-xs w-[30%]">{t("product_name")}</TableHead>
                    <TableHead className="text-xs w-[25%]">{t("category")}</TableHead>
                    <TableHead className="text-xs w-[15%]">{t("sold")}</TableHead>
                    <TableHead className="text-xs w-[20%]">{t("remaining")}</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedProducts.length > 0 ? (
                    paginatedProducts.map((product) => {
                      // prefer computed sold (_sold) if present (from sales aggregation)
                      const sold = Math.max(0, Number(product._sold || 0));

                      // product.quantity is authoritative remaining (backend decrements it on sale)
                      const remaining = Number(product.quantity ?? product.supermarketQuantity ?? product.storeQuantity ?? 0);

                      return (
                        <TableRow
                          key={product.id}
                          className="h-20 align-middle"
                        >
                          <TableCell className="py-4">
                            {product.pictureUrl ? (
                              <img
                                src={product.pictureUrl}
                                alt={product.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted" />
                            )}
                          </TableCell>

                          <TableCell className="text-xs py-4">
                            {product.name}
                          </TableCell>

                          <TableCell className="text-xs py-4">
                            {product.category}
                          </TableCell>

                          <TableCell className="text-xs py-4">{sold}</TableCell>

                          <TableCell className="text-xs py-4">
                            {remaining}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-4 text-muted-foreground"
                      >
                        {Object.values(filterValues).some(Boolean) ? t("no_products_match_current_filters") : t("no_products_available")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ✅ PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-3 border-t border-border mt-4">
                <div className="text-xs text-muted-foreground mb-2 sm:mb-0">
                  {t("showing")} <span className="font-medium">{startIndex + 1}</span>–
                  <span className="font-medium">
                    {Math.min(
                      startIndex + ITEMS_PER_PAGE,
                      filteredProducts.length
                    )}
                  </span>{" "}
                  {t("of")}
                  <span className="font-medium">
                    {" "}
                    {filteredProducts.length}
                  </span>{" "}
                  {t("products")}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPage}
                    disabled={currentPage === 1}
                  >
                    {t("prev")}
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
                    )
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                  >
                    {t("next")}
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
