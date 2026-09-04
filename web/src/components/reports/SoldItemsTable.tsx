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
  soldByRole?: string;
  date?: string;
  paymentMethod?: string;
  priceTiers?: Array<{ price: number; qty: number; subtotal: number }>;
  details?: Array<{
    soldById?: string | null;
    soldByName?: string;
    soldBy?: string;
    soldByRole?: string;
    date?: string;
    paymentMethod?: string;
    price: number;
    qty: number;
    subtotal: number;
    vat: number;
    total: number;
  }>;
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

const formatRoleLabel = (role?: string) => {
  if (!role) return "Cashier";
  const r = role.toLowerCase();
  if (r === "systemadmin" || r === "system_admin") return "Admin";
  if (r === "storekeeper" || r === "store_keeper") return "Store Keeper";
  return r.charAt(0).toUpperCase() + r.slice(1);
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

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
  const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({});

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
      if (Array.isArray(it.details)) {
        it.details.forEach((d) => {
          const m = String(d.paymentMethod || "").trim();
          if (m && m.toLowerCase() !== "mixed" && m.toLowerCase() !== "unknown") {
            unique.add(m.toLowerCase());
          }
        });
      }
      const pm = String(it.paymentMethod || "").trim();
      if (pm && pm.toLowerCase() !== "mixed" && pm.toLowerCase() !== "unknown") {
        unique.add(pm.toLowerCase());
      }
    });

    return [
      { label: t("all", { defaultValue: "All" }), value: "all" },
      ...Array.from(unique)
        .sort((a, b) => a.localeCompare(b))
        .map((method) => {
          const translated = t(method);
          const label =
            translated && translated !== method
              ? translated
              : method
                  .split("_")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ");
          return { label, value: method };
        }),
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
    const paymentFilter = String(appliedFilters.paymentMethod || "all").toLowerCase();
    const sortKey = String(appliedFilters.sort || "name_asc");

    const baseItems = (items || [])
      .map((it) => {
        // If a specific payment method filter is active, slice to only the sales with that method
        if (paymentFilter !== "all") {
          const allDetails = Array.isArray(it.details) ? it.details : [];
          const matchingDetails = allDetails.filter(
            (d) => String(d.paymentMethod || "").trim().toLowerCase() === paymentFilter,
          );

          if (matchingDetails.length === 0) {
            // Check top-level paymentMethod fallback
            if (String(it.paymentMethod || "").trim().toLowerCase() !== paymentFilter) {
              return null;
            }
            return it;
          }

          const filteredQty = matchingDetails.reduce((s, d) => s + Number(d.qty || 0), 0);
          const filteredSubtotal = matchingDetails.reduce((s, d) => s + Number(d.subtotal || 0), 0);
          const filteredVat = matchingDetails.reduce((s, d) => s + Number(d.vat || 0), 0);
          const filteredTotal = matchingDetails.reduce((s, d) => s + Number(d.total || 0), 0);
          const weightedSellingPrice = filteredQty > 0 ? filteredSubtotal / filteredQty : it.sellingPrice;

          return {
            ...it,
            qty: filteredQty,
            sellingPrice: weightedSellingPrice,
            subtotal: filteredSubtotal,
            vatAmount: filteredVat,
            total: filteredTotal,
            paymentMethod: paymentFilter,
            details: matchingDetails,
          };
        }
        return it;
      })
      .filter((it): it is Item => it !== null)
      .filter((it) => {
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
        return matchesSearch && matchesSoldBy;
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

  const subtotal = React.useMemo(
    () => filteredItems.reduce((s, it) => s + (it.subtotal || 0), 0),
    [filteredItems],
  );
  const totalVat = React.useMemo(
    () => filteredItems.reduce((s, it) => s + (it.vatAmount || 0), 0),
    [filteredItems],
  );
  const grandTotal = React.useMemo(
    () => filteredItems.reduce((s, it) => s + (it.total || 0), 0),
    [filteredItems],
  );

  const toggleRow = (itemId: string | number) => {
    const key = String(itemId);
    setExpandedRows((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  return (
    <div className="bg-card p-3 rounded-2xl border">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground">
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
        className="mb-4"
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
                <th className="py-2 w-10" />
                <th className="py-2">{t("item")}</th>
                <th className="py-2">{t("name")}</th>
                <th className="py-2">{t("sold_by")}</th>
                <th className="py-2">{t("role", "Role")}</th>
                <th className="py-2">{t("date_time", "Date / Time")}</th>
                <th className="py-2">{t("payment_method")}</th>
                <th className="py-2 text-right">{t("quantity_short")}</th>
                <th className="py-2 text-right">{t("selling_price")}</th>
                <th className="py-2 text-right">VAT</th>
                <th className="py-2 text-right">{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((it) => {
                const rowKey = String(it.id);
                const isExpandable =
                  (it.priceTiers && it.priceTiers.length > 1) ||
                  (Array.isArray(it.details) && it.details.length > 1);
                const isExpanded = Boolean(expandedRows[rowKey]);
                const detailRows =
                  Array.isArray(it.details) && it.details.length > 0
                    ? it.details
                    : [
                        {
                          soldByName: it.soldByName || it.soldBy || "unknown",
                          soldByRole: it.soldByRole || "cashier",
                          date: it.date || "",
                          paymentMethod: it.paymentMethod || "unknown",
                          price: it.sellingPrice,
                          qty: it.qty,
                          vat: it.vatAmount,
                          total: it.total || it.subtotal || 0,
                        },
                      ];
                const detailTotals = detailRows.reduce(
                  (acc, line) => ({
                    qty: acc.qty + Number(line.qty || 0),
                    vat: acc.vat + Number(line.vat || 0),
                    total: acc.total + Number(line.total || 0),
                  }),
                  { qty: 0, vat: 0, total: 0 },
                );

                return (
                  <React.Fragment key={rowKey}>
                    <tr className="border-b last:border-0 hover:bg-accent/20">
                      <td className="py-2 w-10 align-top">
                        {isExpandable ? (
                          <button
                            type="button"
                            onClick={() => toggleRow(it.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:text-foreground hover:bg-muted/60"
                            aria-label={isExpanded ? "Collapse details" : "Expand details"}
                          >
                            {isExpanded ? "▾" : "▸"}
                          </button>
                        ) : (
                          <span className="inline-block h-7 w-7" aria-hidden="true" />
                        )}
                      </td>
                      <td className="py-2 w-16">
                        <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
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
                      <td className="py-2">
                        <div className="text-sm font-medium text-foreground">{it.name}</div>
                      </td>
                      <td className="py-2">
                        <div className="text-sm font-medium text-foreground">
                          {it.soldByName || it.soldBy || "unknown"}
                        </div>
                      </td>
                      <td className="py-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border capitalize">
                          {formatRoleLabel(it.soldByRole)}
                        </span>
                      </td>
                      <td className="py-2">
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(it.date)}
                        </div>
                      </td>
                      <td className="py-2">
                        {(() => {
                          const detailsList = Array.isArray(it.details) ? it.details : [];
                          const methodCounts: Record<string, number> = {};
                          detailsList.forEach((d) => {
                            const m = String(d.paymentMethod || "").trim().toLowerCase();
                            if (m && m !== "mixed" && m !== "unknown") {
                              methodCounts[m] = (methodCounts[m] || 0) + Number(d.qty || 0);
                            }
                          });

                          const distinctMethods = Object.keys(methodCounts);
                          if (distinctMethods.length > 1) {
                            return (
                              <div className="flex flex-wrap gap-1 items-center">
                                {distinctMethods.map((m) => {
                                  const translated = t(m);
                                  const label =
                                    translated && translated !== m
                                      ? translated
                                      : m
                                          .split("_")
                                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                          .join(" ");
                                  return (
                                    <span
                                      key={m}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border"
                                    >
                                      {label} ({methodCounts[m]})
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          }

                          const singleMethod =
                            distinctMethods[0] ||
                            String(it.paymentMethod || "unknown").toLowerCase();
                          const translated = t(singleMethod);
                          const label =
                            translated && translated !== singleMethod
                              ? translated
                              : singleMethod
                                  .split("_")
                                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                  .join(" ");

                          return (
                            <div className="text-sm text-muted-foreground capitalize">
                              {label}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-2 text-right font-medium">{it.qty}</td>
                      <td className="py-2 text-right">{currency(it.sellingPrice)}</td>
                      <td className="py-2 text-right">{currency(it.vatAmount)}</td>
                      <td className="py-2 text-right font-semibold">
                        {currency(it.total)}
                      </td>
                    </tr>
                    {isExpandable && isExpanded && (
                      <tr>
                        <td colSpan={11} className="bg-muted/20 px-4 py-3">
                          <div className="overflow-x-auto rounded-lg border border-border/70 bg-background/40">
                            <table className="min-w-full w-full table-auto">
                              <thead>
                                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
                                  <th className="py-2 pl-4">
                                    {t("sold_by")}
                                  </th>
                                  <th className="py-2">
                                    {t("role", "Role")}
                                  </th>
                                  <th className="py-2">
                                    {t("date_time", "Date / Time")}
                                  </th>
                                  <th className="py-2">
                                    {t("payment_method")}
                                  </th>
                                  <th className="py-2 text-right">
                                    {t("quantity_short")}
                                  </th>
                                  <th className="py-2 text-right">
                                    {t("selling_price")}
                                  </th>
                                  <th className="py-2 text-right">VAT</th>
                                  <th className="py-2 pr-4 text-right">
                                    {t("total")}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {detailRows.map((line, index) => {
                                  const m = String(line.paymentMethod || "unknown").toLowerCase();
                                  const translated = t(m);
                                  const methodLabel =
                                    translated && translated !== m
                                      ? translated
                                      : m
                                          .split("_")
                                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                          .join(" ");

                                  return (
                                    <tr
                                      key={`${rowKey}-detail-${index}`}
                                      className="border-b last:border-0"
                                    >
                                      <td className="py-1.5 pl-4 text-sm font-medium text-foreground">
                                        {line.soldByName ||
                                          line.soldBy ||
                                          "unknown"}
                                      </td>
                                      <td className="py-1.5 text-xs text-muted-foreground capitalize">
                                        {formatRoleLabel(line.soldByRole || it.soldByRole)}
                                      </td>
                                      <td className="py-1.5 text-xs text-muted-foreground whitespace-nowrap">
                                        {formatDateTime(line.date || it.date)}
                                      </td>
                                      <td className="py-1.5 text-sm text-muted-foreground capitalize">
                                        {methodLabel}
                                      </td>
                                      <td className="py-1.5 text-right">
                                        {Number(line.qty || 0).toLocaleString()}
                                      </td>
                                      <td className="py-1.5 text-right">
                                        {currency(Number(line.price || 0))}
                                      </td>
                                      <td className="py-1.5 text-right">
                                        {currency(Number(line.vat || 0))}
                                      </td>
                                      <td className="py-1.5 pr-4 text-right font-medium">
                                        {currency(Number(line.total || 0))}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="bg-muted/30 font-semibold">
                                  <td
                                    colSpan={4}
                                    className="py-1.5 pl-4 text-foreground"
                                  >
                                    {t("total")}
                                  </td>
                                  <td className="py-1.5 text-right text-foreground">
                                    {detailTotals.qty.toLocaleString()}
                                  </td>
                                  <td className="py-1.5 text-right text-muted-foreground">
                                    —
                                  </td>
                                  <td className="py-1.5 text-right text-foreground">
                                    {currency(detailTotals.vat)}
                                  </td>
                                  <td className="py-1.5 pr-4 text-right font-bold text-foreground">
                                    {currency(detailTotals.total)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          <div className="mt-3 ml-auto max-w-sm space-y-1 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{t("subtotal") || "Subtotal"}</span>
              <span>{currency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{t("vat") || "VAT"}</span>
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
