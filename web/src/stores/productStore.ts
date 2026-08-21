import { create } from "zustand";
import type { Product, Category } from "@/types";
import { useAuthStore } from "./authStore";
import { productAgeDays } from "@/utils/agingStock";

interface ProductState {
  products: Product[];
  categories: Category[];
  fetchCategories: () => Promise<void>;
  isLoading: boolean;
  fetchError?: string | null;
  totalProducts: number;

  // Actions
  fetchProducts: (page?: number, limit?: number) => Promise<void>;
  addProduct: (
    product: Omit<Product, "id" | "createdAt" | "updatedAt"> & {
      stockDestination?: "warehouse" | "mart";
    },
  ) => Promise<{ status: number; data: any }>;
  updateProduct: (
    id: string,
    updates: Partial<Product> | FormData,
  ) => Promise<{ status: number; data: any }>;
  deleteProduct: (id: string) => Promise<void>;
  searchProducts: (query: string) => Product[];
  getProductByBarcode: (barcode: string) => Product | undefined;
  getLowStockProducts: () => Product[];
  getExpiringProducts: (days?: number) => Product[];
  getAgingProducts: (
    days?: number,
    lastSaleDates?: Map<string, string>,
  ) => Product[];
  getAlertProducts: (expiringWithinDays?: number) => any[];
  applyLocalSale: (
    soldItems: Array<{ productId: string; quantity: number }>,
  ) => Promise<void>;
}

const normalizeProducts = (items: any[]) => {
  return items.map((p: any) => ({
    ...p,
    id: p.id || p._id,
    pictureUrl: p.pictureUrl || p.imageUrl || p.secure_url || p.url || "",
    quantity: Number(
      p.quantity ?? p.supermarketQuantity ?? p.storeQuantity ?? 0,
    ),
    supermarketQuantity: Number(
      p.supermarketQuantity ?? p.quantity ?? p.storeQuantity ?? 0,
    ),
    storeQuantity: Number(
      p.storeQuantity ?? p.quantity ?? p.supermarketQuantity ?? 0,
    ),
    barcodes: Array.isArray(p.barcodes)
      ? p.barcodes.map(String)
      : p.barcode
        ? [String(p.barcode)]
        : [],
    barcode: Array.isArray(p.barcodes) ? p.barcodes[0] || "" : p.barcode || "",
    _sold: Number(p._sold || 0),
  }));
};

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: [],
  isLoading: false,
  fetchError: null,
  totalProducts: 0,
  fetchCategories: async () => {
    const auth = useAuthStore.getState().user;
    const API_BASE = import.meta.env.VITE_API_URL || "";
    const martId = auth?.martId;
    if (!martId) return;
    try {
      const token = auth?.token;
      const res = await fetch(`${API_BASE}/api/categories?martId=${martId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) return;
      const list = await res.json();
      if (Array.isArray(list)) {
        const normalized: Category[] = list.map((c: any) => ({
          id: String(c._id || c.id || ""),
          name: c.name,
          nameAm: c.nameAm || "",
        }));
        set({ categories: normalized });
      }
    } catch (err) {
      console.error("fetchCategories error", err);
    }
  },

  fetchProducts: async (page = 1, limit = 1000) => {
    set({ isLoading: true });
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const token = useAuthStore.getState().user?.token;
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
    const martId = useAuthStore.getState().user?.martId;
    try {
      // Fetch the product page and the aggregated sold-counts map in parallel.
      // The old approach fetched EVERY sale of the mart and summed quantities
      // client-side, which slowed down as sales history grew.
      const [productsRes, soldCounts] = await Promise.all([
        fetch(
          `${API_BASE}/api/products?page=${page}&limit=${limit}${martId ? `&martId=${martId}` : ""}`,
          { headers: authHeader },
        ),
        fetch(
          `${API_BASE}/api/sales/sold-counts${martId ? `?martId=${martId}` : ""}`,
          { headers: authHeader },
        ).catch(() => null),
      ]);

      if (productsRes.status === 401) {
        useAuthStore.getState().logout();
        throw new Error("Unauthorized - Session expired");
      }
      if (!productsRes.ok) throw new Error("Failed to fetch products");
      const data = await productsRes.json();
      // support paginated response { data, total } or legacy array response
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
          ? data.data
          : [];
      const total = typeof data.total === "number" ? data.total : items.length;

      const normalized = normalizeProducts(items);

      set({ totalProducts: total });

      // Build the sold map from the aggregated endpoint when available;
      // otherwise fall back to computing it from the full sales list.
      let soldMap: Record<string, number> = {};
      if (soldCounts && soldCounts.ok) {
        try {
          soldMap = (await soldCounts.json()) as Record<string, number>;
        } catch {
          soldMap = {};
        }
      } else {
        try {
          if (martId) {
            const salesRes = await fetch(
              `${API_BASE}/api/sales?martId=${martId}`,
              {
                headers: authHeader,
              },
            );
            if (salesRes.ok) {
              const sales = await salesRes.json();
              for (const s of sales || []) {
                for (const it of s.items || []) {
                  const pid = (
                    it.productId ||
                    it.product?._id ||
                    it.product?.id ||
                    it.id ||
                    ""
                  ).toString();
                  soldMap[pid] = (soldMap[pid] || 0) + Number(it.quantity || 0);
                }
              }
            }
          }
        } catch {
          // ignore sales fetch errors
        }
      }

      // attach _sold to normalized products
      const withSold = normalized.map((p: any) => ({
        ...p,
        _sold: soldMap[p.id] || soldMap[p._id] || 0,
      }));

      try {
        await window.posApi?.setCachedProducts?.(withSold as any[]);
      } catch (cacheErr) {
        console.warn("failed to persist local product cache", cacheErr);
      }

      set({ products: withSold, isLoading: false, fetchError: null });
    } catch (err) {
      const msg = String(err?.message || err || "Failed to fetch products");
      try {
        const cached = await window.posApi?.getCachedProducts?.();
        if (Array.isArray(cached) && cached.length > 0) {
          set({
            products: normalizeProducts(cached),
            isLoading: false,
            fetchError: `${msg} (showing cached products)`,
          });
          return;
        }
      } catch (cacheErr) {
        console.warn("failed to load cached products", cacheErr);
      }

      set({
        products: [],
        totalProducts: 0,
        isLoading: false,
        fetchError: msg,
      });
      console.error("fetchProducts failed:", err);
    }
  },

  addProduct: async (productData) => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const token = useAuthStore.getState().user?.token;
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const endpoint =
        productData.stockDestination === "mart"
          ? `${API_BASE}/api/products/direct-to-mart`
          : `${API_BASE}/api/products`;
      const requestBody = { ...productData } as Record<string, any>;
      delete requestBody.stockDestination;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify(requestBody),
      });
      const created = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(created?.message || "Failed to create product");
      }

      if (res.status === 202) {
        return { status: res.status, data: created };
      }

      const newProduct: Product = {
        ...created,
        id: created.id || created._id,
        createdAt: created.createdAt ? new Date(created.createdAt) : new Date(),
        updatedAt: created.updatedAt ? new Date(created.updatedAt) : new Date(),
      };
      set((state) => ({ products: [...state.products, newProduct] }));
      return { status: res.status, data: newProduct };
    } catch (err) {
      console.error("addProduct failed:", err);
      throw err;
    }
  },

  updateProduct: async (id, updates) => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const token = useAuthStore.getState().user?.token;
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      // support FormData (for image upload) or plain object
      const isForm = updates instanceof FormData;
      const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: "PUT",
        headers: isForm
          ? ({ ...authHeader } as any)
          : {
              "Content-Type": "application/json",
              ...authHeader,
            },
        body: isForm ? updates : JSON.stringify(updates),
      });
      const data = await res.json();

      // If the backend accepts but defers (202), do not mutate local cache
      if (res.status === 202) {
        return { status: res.status, data };
      }

      if (!res.ok) throw new Error(data?.message || "Failed to update product");

      const norm = {
        ...data,
        id: data.id || data._id,
        pictureUrl:
          data.pictureUrl || data.imageUrl || data.secure_url || data.url || "",
      };
      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, ...norm, updatedAt: new Date() } : p,
        ),
      }));
      return { status: res.status, data: norm };
    } catch (err) {
      // fallback to local update
      set((state) => ({
        products: state.products.map((p) =>
          p.id === id
            ? { ...p, ...(updates as any), updatedAt: new Date() }
            : p,
        ),
      }));
      console.warn("updateProduct fallback:", err);
      return { status: 200, data: updates };
    }
  },

  deleteProduct: async (id) => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const token = useAuthStore.getState().user?.token;
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!res.ok) throw new Error("Failed to delete");
      set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
    } catch (err) {
      // fallback local delete
      set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
      console.warn("deleteProduct fallback:", err);
    }
  },

  searchProducts: (query) => {
    const { products } = get();
    const q = query.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.nameAm?.toLowerCase().includes(q) ||
        p.barcode?.includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  },

  getProductByBarcode: (barcode) => {
    return get().products.find(
      (p) => (p.barcodes || []).includes(barcode) || p.barcode === barcode,
    );
  },

  getLowStockProducts: () => {
    return get().products.filter((p) => {
      // product.quantity is authoritative (backend decrements on sale)
      const remaining = Number(
        p.quantity ?? p.supermarketQuantity ?? p.storeQuantity ?? 0,
      );
      return remaining <= Number(p.lowStockThreshold || 0);
    });
  },

  // Products that require attention: low stock or expiring soon
  getAlertProducts: (expiringWithinDays = 7) => {
    const low = get().getLowStockProducts();
    const exp = get().getExpiringProducts(expiringWithinDays);
    const byId = new Map<string, any>();
    for (const p of low) byId.set(p.id, { ...p, reason: "low_stock" });
    for (const p of exp) {
      const key = p.id;
      if (byId.has(key)) {
        byId.set(key, { ...byId.get(key), reason: "low_stock_and_expiring" });
      } else {
        byId.set(key, { ...p, reason: "expiring" });
      }
    }
    return Array.from(byId.values());
  },

  getExpiringProducts: (days = 7) => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    return get().products.filter(
      (p) => p.expiryDate && new Date(p.expiryDate) <= threshold,
    );
  },

  // Slow-moving stock: products still in stock that haven't been sold for
  // `days` days. Age is measured from the latest sale date when provided,
  // otherwise from the product's creation date.
  getAgingProducts: (days = 5, lastSaleDates = new Map<string, string>()) => {
    return get().products.filter((p) => {
      const remaining = Number(
        p.quantity ?? p.supermarketQuantity ?? p.storeQuantity ?? 0,
      );
      if (remaining <= 0) return false;
      const age = productAgeDays(p, lastSaleDates);
      return age !== null && age >= days;
    });
  },

  applyLocalSale: async (soldItems) => {
    if (!Array.isArray(soldItems) || soldItems.length === 0) return;

    const soldMap = soldItems.reduce<Record<string, number>>((acc, item) => {
      const productId = String(item.productId || "");
      const quantity = Number(item.quantity || 0);
      if (!productId || quantity <= 0) return acc;
      acc[productId] = (acc[productId] || 0) + quantity;
      return acc;
    }, {});

    let nextProducts: Product[] = [];
    set((state) => {
      nextProducts = state.products.map((product) => {
        const soldQty = Number(soldMap[product.id] || 0);
        if (soldQty <= 0) return product;

        const nextQuantity = Math.max(
          0,
          Number(product.quantity || 0) - soldQty,
        );
        const nextSupermarketQty = Math.max(
          0,
          Number(product.supermarketQuantity || 0) - soldQty,
        );

        return {
          ...product,
          quantity: nextQuantity,
          supermarketQuantity: nextSupermarketQty,
          _sold: Number(product._sold || 0) + soldQty,
          updatedAt: new Date(),
        } as Product;
      });

      return { products: nextProducts };
    });

    try {
      await window.posApi?.setCachedProducts?.(nextProducts as any[]);
    } catch (cacheErr) {
      console.warn(
        "failed to persist product cache after local sale",
        cacheErr,
      );
    }
  },
}));
