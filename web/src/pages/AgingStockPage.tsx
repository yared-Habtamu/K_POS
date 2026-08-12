import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdvancedFilters,
  type AdvancedFilterValues,
} from "@/components/ui/AdvancedFilters";
import { useProductStore } from "@/stores/productStore";
import { useLastSaleDates } from "@/hooks/useLastSaleDates";
import { productAgeDays } from "@/utils/agingStock";
import { Clock, Package } from "lucide-react";
import { useTranslation } from "react-i18next";

// Aging stock thresholds: "X or more days since last sale / created".
const AGING_THRESHOLDS = [5, 10, 15, 20, 25, 30];

const defaultFilterValues: AdvancedFilterValues = {
  query: "",
  category: "",
  alertType: "",
  sortBy: "oldest_first",
};

export default function AgingStockPage() {
  const { t } = useTranslation();
  const { getAgingProducts, fetchProducts } = useProductStore();
  const [searchParams] = useSearchParams();

  const initialThreshold = Number(searchParams.get("threshold")) || 5;
  const [ageThreshold, setAgeThreshold] = useState(initialThreshold);
  const [filterValues, setFilterValues] =
    useState<AdvancedFilterValues>(defaultFilterValues);

  useEffect(() => {
    fetchProducts(1, 10000);
  }, [fetchProducts]);

  const lastSaleDates = useLastSaleDates();
  const aging = getAgingProducts(ageThreshold, lastSaleDates);

  const getRemaining = (product: any) => {
    return Number(
      product?.quantity ??
        product?.supermarketQuantity ??
        product?.storeQuantity ??
        0,
    );
  };

  const categoryOptions = useMemo(() => {
    const categories = Array.from(
      new Set(
        aging
          .map((product) => String(product?.category || "").trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right));
    return categories.map((category) => ({ label: category, value: category }));
  }, [aging]);

  const filtered = useMemo(() => {
    const query = String(filterValues.query || "").trim().toLowerCase();
    const category = String(filterValues.category || "").trim().toLowerCase();
    const sortBy = String(filterValues.sortBy || "");

    const list = aging.filter((product) => {
      const name = String(product?.name || "").toLowerCase();
      const productCategory = String(product?.category || "")
        .trim()
        .toLowerCase();
      const barcode = String(
        product?.barcode || product?.barcodes?.[0] || "",
      ).toLowerCase();

      const matchesQuery =
        !query ||
        name.includes(query) ||
        productCategory.includes(query) ||
        barcode.includes(query);
      const matchesCategory = !category || productCategory === category;
      return matchesQuery && matchesCategory;
    });

    return list.sort((left, right) => {
      switch (sortBy) {
        case "name_asc":
          return String(left?.name || "").localeCompare(
            String(right?.name || ""),
          );
        case "name_desc":
          return String(right?.name || "").localeCompare(
            String(left?.name || ""),
          );
        case "remaining_asc":
          return getRemaining(left) - getRemaining(right);
        default: {
          // oldest_first
          const leftAge = productAgeDays(left, lastSaleDates) ?? 0;
          const rightAge = productAgeDays(right, lastSaleDates) ?? 0;
          return rightAge - leftAge;
        }
      }
    });
  }, [aging, filterValues, lastSaleDates]);

  return (
    <RoleLayout allowedRoles={["owner", "manager"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6 text-warning" />
              {t("aging_stock")}
            </h1>
            <p className="text-muted-foreground">
              {t("aging_summary")} ({aging.length})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("threshold")}
            </span>
            <select
              value={ageThreshold}
              onChange={(e) => setAgeThreshold(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {AGING_THRESHOLDS.map((days) => (
                <option key={days} value={days}>
                  {days === 30 ? "30+" : days}{" "}
                  {days === 1 ? "day" : "days"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <AdvancedFilters
          title="Search and filter aging stock"
          description="Filter by product, category, or urgency."
          fields={[
            {
              key: "query",
              label: "Search",
              type: "search",
              placeholder: "Search by name, category, or barcode",
            },
            {
              key: "category",
              label: "Category",
              type: "select",
              placeholder: "All categories",
              options: categoryOptions,
            },
            {
              key: "sortBy",
              label: "Sort by",
              type: "select",
              placeholder: "Oldest first",
              options: [
                { label: t("oldest_first"), value: "oldest_first" },
                { label: "Name A -> Z", value: "name_asc" },
                { label: "Name Z -> A", value: "name_desc" },
                { label: "Remaining Low -> High", value: "remaining_asc" },
              ],
            },
          ]}
          values={filterValues}
          onValuesChange={setFilterValues}
          onReset={() => setFilterValues(defaultFilterValues)}
          showActiveBadges={false}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {t("products")}
              <Badge variant="secondary">{filtered.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("no_aging_alerts")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("product")}</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>{t("remaining")}</TableHead>
                    <TableHead>{t("age")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((product) => {
                    const age = productAgeDays(product, lastSaleDates);
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.pictureUrl ? (
                              <img
                                src={product.pictureUrl}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm">
                                {product.name}
                              </p>
                              {product.barcode && (
                                <p className="text-xs text-muted-foreground">
                                  {product.barcode}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {product.category}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getRemaining(product)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {age !== null ? `${age} ${t("days_old")}` : "—"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}
