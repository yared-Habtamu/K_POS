import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

type Item = {
  id: string | number;
  name: string;
  qty: number;
  total: number;
};

const COLORS = ['#4f46e5', '#06b6d4', '#f97316', '#10b981', '#ef4444', '#a78bfa'];

export default function CashierDashboard({ items, totals }: { items: Item[]; totals: { totalItemsSold: number; totalPurchasingCost: number } }) {
  const topItems = [...(items || [])]
    .sort((a, b) => (b.total || 0) - (a.total || 0))
    .slice(0, 6)
    .map((it) => ({ name: it.name, total: Number(it.total) || 0 }));

  const pieData = topItems.map((d) => ({ name: d.name, value: d.total }));

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Quick overview</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-card p-3 rounded-xl border text-center">
            <p className="text-sm text-muted-foreground">Items Sold Today</p>
            <p className="text-lg font-bold">{totals?.totalItemsSold ?? 0}</p>
          </div>
          <div className="bg-card p-3 rounded-xl border text-center">
            <p className="text-sm text-muted-foreground">Total Sales</p>
            <p className="text-lg font-bold">{(totals?.totalPurchasingCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-card p-4 rounded-xl border h-56">
          <h3 className="text-sm font-medium mb-2">Top items (by sales)</h3>
          {topItems.length === 0 ? (
            <div className="text-muted-foreground">No sales yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card p-4 rounded-xl border h-56">
          <h3 className="text-sm font-medium mb-2">Sales share</h3>
          {pieData.length === 0 ? (
            <div className="text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={28} outerRadius={56} paddingAngle={4}>
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
