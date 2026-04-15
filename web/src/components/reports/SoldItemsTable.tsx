import React from "react";
import { useTranslation } from "react-i18next";

import {
  AdvancedFilters,
  type AdvancedFilterField,
  type AdvancedFilterValues,
} from "@/components/ui/AdvancedFilters";

type Item = {
  id: string | number;
  name: string;
  qty: number;
  sellingPrice: number;
  subtotal: number;
  vatAmount: number;
  img?: string;
  total: number;
  soldByName?: string;
  soldBy?: string;
  paymentMethod?: string;
};

interface Totals {
  totalItemsSold: number;
  totalBeforeVat: number;
  totalVat: number;
  grandTotal: number;
}

interface Props {
  items: Item[];
  totals: Totals;
  loading?: boolean;
}

const currency = (v: number) =>
  v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function SoldItemsTable({ items, totals, loading }: Props) {
  const { t } = useTranslation();
  const defaultFilterValues = React.useMemo<AdvancedFilterValues>(
    () => ({
      search: "",
      soldBy: "all",
      paymentMethod: "all",
      sort: "name_asc",
    }),
    [],
  );
  const [filterValues, setFilterValues] = React.useState<AdvancedFilterValues>(
    defaultFilterValues,
  );
  const [appliedFilters, setAppliedFilters] = React.useState<AdvancedFilterValues>(
    defaultFilterValues,
  );

  const soldByOptions = React.useMemo(() => {
    const unique = new Set<string>();
    (items || []).forEach((it) => {
      const label = it.soldByName || it.soldBy;
      if (label) {
        unique.add(label);
      }
    });
    return [
      { label: t("all"), value: "all" },
      ...Array.from(unique).map((label) => ({ label, value: label })),
    ];
  }, [items, t]);

  const paymentOptions = React.useMemo(() => {
    const unique = new Set<string>();
    (items || []).forEach((it) => {
      if (it.paymentMethod) {
        unique.add(it.paymentMethod);
      }
    });
    return [
      { label: t("all"), value: "all" },
      ...Array.from(unique).map((label) => ({ label, value: label })),
    ];
  }, [items, t]);

  const filterFields = React.useMemo<AdvancedFilterField[]>(
    () => [
      {
        key: "search",
        type: "search",
        label: t("search"),
        placeholder: t("search_by_name_or_barcode"),
      },
      {
        key: "soldBy",
        type: "select",
        label: t("sold_by"),
        placeholder: t("select_option"),
        options: soldByOptions,
      },
      {
        key: "paymentMethod",
        type: "select",
        label: t("payment_method"),
        placeholder: t("select_option"),
        options: paymentOptions,
      },
      {
        key: "sort",
        type: "select",
        label: t("sort_by"),
        placeholder: t("select_option"),
        options: [
          { label: t("name_a_to_z"), value: "name_asc" },
          { label: t("name_z_to_a"), value: "name_desc" },
          { label: t("total"), value: "total_desc" },
          { label: t("most_sold_first"), value: "qty_desc" },
        ],
      },
    ],
    [paymentOptions, soldByOptions, t],
  );

  const filteredItems = React.useMemo(() => {
    const normalizedSearch = String(appliedFilters.search || "")
      .trim()
      .toLowerCase();
    const soldByFilter = String(appliedFilters.soldBy || "all");
    const paymentFilter = String(appliedFilters.paymentMethod || "all");
    const sortKey = String(appliedFilters.sort || "name_asc");

    const baseItems = (items || []).filter((it) => {
      const soldByLabel = it.soldByName || it.soldBy || "";
      const paymentLabel = it.paymentMethod || "";
      const matchesSearch = normalizedSearch
        ? [it.name, soldByLabel, paymentLabel]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(normalizedSearch),
            )
        : true;
      const matchesSoldBy =
        soldByFilter === "all" ? true : soldByLabel === soldByFilter;
      const matchesPayment =
        paymentFilter === "all" ? true : paymentLabel === paymentFilter;
      return matchesSearch && matchesSoldBy && matchesPayment;
    });

    const sortedItems = [...baseItems];
    if (sortKey === "name_desc") {
      sortedItems.sort((a, b) => a.name.localeCompare(b.name)).reverse();
    } else if (sortKey === "total_desc") {
      sortedItems.sort((a, b) => (b.total || 0) - (a.total || 0));
    } else if (sortKey === "qty_desc") {
      sortedItems.sort((a, b) => (b.qty || 0) - (a.qty || 0));
    } else {
      sortedItems.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sortedItems;
  }, [appliedFilters, items]);

  const subtotal = totals?.totalBeforeVat ?? 0;
  const totalVat = totals?.totalVat ?? 0;
  const grandTotal = totals?.grandTotal ?? 0;

  return (
    <div className="bg-card p-4 rounded-2xl border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t("sold_items")}
        </h2>
        <span className="text-xs text-muted-foreground">
          {t("detailed_view")}
        </span>
      </div>
      <AdvancedFilters
        fields={filterFields}
        values={filterValues}
        onValuesChange={setFilterValues}
        onApply={setAppliedFilters}
        onReset={() => setAppliedFilters(defaultFilterValues)}
        className="mb-6"
      />
      {loading ? (
        <div className="text-muted-foreground">{t("loading")}</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          {t("no_items_sold_today")}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          {t("no_items_match_filters", "No items match the current filters.")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full w-full table-auto">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
                <th className="py-2">{t("item")}</th>
                <th className="py-2">{t("name")}</th>
                <th className="py-2">{t("sold_by")}</th>
                <th className="py-2">{t("payment_method")}</th>
                <th className="py-2 text-right">{t("quantity_short")}</th>
                <th className="py-2 text-right">{t("selling_price")}</th>
                <th className="py-2 text-right">VAT</th>
                <th className="py-2 text-right">{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((it) => (
                <tr
                  key={it.id}
                  className="border-b last:border-0 hover:bg-accent/20"
                >
                  <td className="py-3 w-20">
                    <div className="w-14 h-14 bg-muted rounded-xl overflow-hidden flex items-center justify-center">
                      {it.img ? (
                        <img
                          src={it.img}
                          alt={it.name}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {t("no_image")}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="font-medium text-foreground">
                      {it.name}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="text-sm text-muted-foreground">
                      {it.soldByName || it.soldBy || "unknown"}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="text-sm text-muted-foreground capitalize">
                      {it.paymentMethod || "unknown"}
                    </div>
                  </td>
                  <td className="py-3 text-right font-medium">{it.qty}</td>
                  <td className="py-3 text-right">
                    {currency(it.sellingPrice)}
                  </td>
                  <td className="py-3 text-right">
                    {currency(it.vatAmount)}
                  </td>
                  <td className="py-3 text-right font-semibold">
                    {currency(it.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 ml-auto max-w-sm space-y-1 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{currency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>VAT</span>
              <span>{currency(totalVat)}</span>
            </div>
            <div className="flex items-center justify-between font-semibold text-foreground border-t pt-2 mt-2">
              <span>{t("total")}</span>
              <span>{currency(grandTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
