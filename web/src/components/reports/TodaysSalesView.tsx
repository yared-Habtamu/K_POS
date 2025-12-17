import React from 'react';

type Item = {
  id: string | number;
  name: string;
  qty: number;
  purchasePrice: number;
  img?: string;
  total: number;
};

const currency = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  items: Item[];
  loading?: boolean;
  totals: { totalItemsSold: number; totalPurchasingCost: number };
}

export default function TodaysSalesView({ items, loading, totals }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Today's Sales</h1>
          <p className="text-sm text-muted-foreground mt-1">Items sold today</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-card p-3 rounded-xl border text-center">
            <p className="text-sm text-muted-foreground">Total Items Sold</p>
            <p className="text-lg font-bold">{totals.totalItemsSold}</p>
          </div>
          <div className="bg-card p-3 rounded-xl border text-center">
            <p className="text-sm text-muted-foreground">Total Purchasing Cost</p>
            <p className="text-lg font-bold">{currency(totals.totalPurchasingCost)} </p>
          </div>
        </div>
      </div>

      <div className="bg-card p-4 rounded-xl border">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Sold Items</h2>
        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-muted-foreground">No items sold today</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full w-full table-auto">
              <thead>
                <tr className="text-left text-sm text-muted-foreground border-b">
                  <th className="py-2">Item</th>
                  <th className="py-2">Name</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Purchase Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b last:border-0 hover:bg-accent/20">
                    <td className="py-3 w-20">
                      <div className="w-14 h-14 bg-muted rounded overflow-hidden flex items-center justify-center">
                        {it.img ? (
                          <img src={it.img} alt={it.name} className="object-cover w-full h-full" />
                        ) : (
                          <div className="text-sm text-muted-foreground">No image</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3">{it.name}</td>
                    <td className="py-3 text-right font-medium">{it.qty}</td>
                    <td className="py-3 text-right">{currency(it.purchasePrice)}</td>
                    <td className="py-3 text-right font-semibold">{currency(it.total)}</td>
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
