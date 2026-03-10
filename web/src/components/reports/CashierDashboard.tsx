import React from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type Item = {
  id: string | number;
  name: string;
  qty: number;
  total: number;
};

const COLORS = [
  "#4f46e5",
  "#06b6d4",
  "#f97316",
  "#10b981",
  "#ef4444",
  "#a78bfa",
];

export default function CashierDashboard({
  items,
  totals,
}: {
  items: Item[];
  totals: { totalItemsSold: number; totalPurchasingCost: number };
}) {
  const { t } = useTranslation();
  const topItems = [...(items || [])]
    .sort((a, b) => (b.total || 0) - (a.total || 0))
    .slice(0, 6)
    .map((it) => ({ name: it.name, total: Number(it.total) || 0 }));

  const pieData = topItems.map((d) => ({ name: d.name, value: d.total }));
  const totalItems = totals?.totalItemsSold ?? 0;
  const totalCost = totals?.totalPurchasingCost ?? 0;
  const avgPerItem = totalItems > 0 ? totalCost / totalItems : 0;

  return (
    <div className="space-y-4 mb-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-800 text-white p-5">
        <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{t("cashier_dashboard")}</h1>
            <p className="text-sm text-slate-300">
              {t("quick_overview_today")}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/10 backdrop-blur px-4 py-3 rounded-xl border border-white/10 text-center">
              <p className="text-xs text-slate-300">{t("items_sold")}</p>
              <p className="text-xl font-semibold">{totalItems}</p>
            </div>
            <div className="bg-white/10 backdrop-blur px-4 py-3 rounded-xl border border-white/10 text-center">
              <p className="text-xs text-slate-300">{t("total_cost")}</p>
              <p className="text-xl font-semibold">
                {totalCost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur px-4 py-3 rounded-xl border border-white/10 text-center">
              <p className="text-xs text-slate-300">{t("avg_per_item")}</p>
              <p className="text-xl font-semibold">
                {avgPerItem.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-card p-4 rounded-2xl border h-56">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">{t("top_items_by_sales")}</h3>
            <span className="text-xs text-muted-foreground">{t("top_6")}</span>
          </div>
          {topItems.length === 0 ? (
            <div className="text-muted-foreground">{t("no_sales_yet")}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topItems}
                margin={{ top: 8, right: 8, left: -16, bottom: 8 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card p-4 rounded-2xl border h-56">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">{t("sales_share")}</h3>
            <span className="text-xs text-muted-foreground">
              {t("distribution")}
            </span>
          </div>
          {pieData.length === 0 ? (
            <div className="text-muted-foreground">{t("no_data")}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={28}
                  outerRadius={56}
                  paddingAngle={4}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={24} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
