
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ProductLike {
  id?: string;
  createdAt?: Date | string | null;
}

/** Days since the product was last sold (or created, if never sold). */
export function productAgeDays(
  product: ProductLike,
  lastSaleDates: Map<string, string>,
): number | null {
  const now = Date.now();
  const lastSale = lastSaleDates.get(String(product.id));
  const base = lastSale
    ? new Date(lastSale).getTime()
    : product.createdAt
      ? new Date(product.createdAt).getTime()
      : Number.NaN;
  if (!Number.isFinite(base)) return null;
  return Math.max(0, Math.floor((now - base) / MS_PER_DAY));
}

/**
 * Build a `productId -> latest sale date` map from a raw `/api/sales`
 * response (each sale has `date`/`createdAt` and `items[].productId`).
 */
export function buildLastSaleDates(sales: unknown): Map<string, string> {
  const map = new Map<string, string>();
  if (!Array.isArray(sales)) return map;
  for (const sale of sales) {
    const saleDate = sale?.date || sale?.createdAt;
    if (!saleDate) continue;
    const saleTime = new Date(saleDate).getTime();
    if (!Number.isFinite(saleTime)) continue;
    for (const item of sale?.items ?? []) {
      const productId = String(item?.productId || "");
      if (!productId) continue;
      const prev = map.get(productId);
      if (!prev || saleTime > new Date(prev).getTime()) {
        map.set(productId, saleDate);
      }
    }
  }
  return map;
}
