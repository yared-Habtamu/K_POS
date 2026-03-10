import React from "react";
import { useTranslation } from "react-i18next";

type Item = {
  id: string | number;
  name: string;
  qty: number;
  purchasePrice: number;
  img?: string;
  total: number;
};

const currency = (v: number) =>
  v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const dateLabel = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

interface Props {
  items: Item[];
  loading?: boolean;
  totals: { totalItemsSold: number; totalPurchasingCost: number };
  // hide header when an external dashboard header is shown
  hideHeader?: boolean;
}

export default function TodaysSalesView({
  items,
  loading,
  totals,
  hideHeader,
}: Props) {
  const { t } = useTranslation();
  const totalItems = totals?.totalItemsSold ?? 0;
  const totalCost = totals?.totalPurchasingCost ?? 0;
  const avgPerItem = totalItems > 0 ? totalCost / totalItems : 0;
  const topItems = [...(items || [])]
    .sort((a, b) => (b.total || 0) - (a.total || 0))
    .slice(0, 5);
  const maxTop = Math.max(1, ...topItems.map((it) => it.total || 0));

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white p-6">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-300">
                {t("today")} • {dateLabel()}
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold">
                {t("todays_sales")}
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                {t("live_snapshot_sold_costs")}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/10 backdrop-blur px-4 py-3 rounded-xl border border-white/10 text-center">
                <p className="text-xs text-slate-300">{t("items_sold")}</p>
                <p className="text-xl font-semibold">{totalItems}</p>
              </div>
              <div className="bg-white/10 backdrop-blur px-4 py-3 rounded-xl border border-white/10 text-center">
                <p className="text-xs text-slate-300">{t("total_cost")}</p>
                <p className="text-xl font-semibold">{currency(totalCost)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("overview")}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-xl border bg-background p-3 text-center">
              <p className="text-xs text-muted-foreground">{t("items_sold")}</p>
              <p className="text-lg font-semibold">{totalItems}</p>
            </div>
            <div className="rounded-xl border bg-background p-3 text-center">
              <p className="text-xs text-muted-foreground">
                {t("avg_per_item")}
              </p>
              <p className="text-lg font-semibold">{currency(avgPerItem)}</p>
            </div>
            <div className="rounded-xl border bg-background p-3 text-center">
              <p className="text-xs text-muted-foreground">{t("total_cost")}</p>
              <p className="text-lg font-semibold">{currency(totalCost)}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-card rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {t("top_performers")}
            </h2>
            <span className="text-xs text-muted-foreground">
              {t("by_total_value")}
            </span>
          </div>
          {loading ? (
            <div className="mt-4 text-muted-foreground">{t("loading")}</div>
          ) : topItems.length === 0 ? (
            <div className="mt-4 text-muted-foreground">
              {t("no_top_items_yet")}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {topItems.map((it) => (
                <div key={it.id} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    {it.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {it.name}
                      </span>
                      <span className="text-muted-foreground">
                        {currency(it.total)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500"
                        style={{
                          width: `${Math.round(((it.total || 0) / maxTop) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card p-4 rounded-2xl border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t("sold_items")}
          </h2>
          <span className="text-xs text-muted-foreground">
            {t("detailed_view")}
          </span>
        </div>
        {loading ? (
          <div className="text-muted-foreground">{t("loading")}</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
            {t("no_items_sold_today")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full w-full table-auto">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
                  <th className="py-2">{t("item")}</th>
                  <th className="py-2">{t("name")}</th>
                  <th className="py-2 text-right">{t("quantity_short")}</th>
                  <th className="py-2 text-right">{t("purchase_price")}</th>
                  <th className="py-2 text-right">{t("total")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
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
                    <td className="py-3 text-right font-medium">{it.qty}</td>
                    <td className="py-3 text-right">
                      {currency(it.purchasePrice)}
                    </td>
                    <td className="py-3 text-right font-semibold">
                      {currency(it.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
