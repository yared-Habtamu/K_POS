import { create } from "zustand";
import type { Product, Category } from "@/types";
import { useAuthStore } from "./authStore";

// Mock categories
const mockCategories: Category[] = [
  { id: "cat-1", name: "Beverages", nameAm: "መጠጦች" },
  { id: "cat-2", name: "Snacks", nameAm: "መክሰስ" },
  { id: "cat-3", name: "Dairy", nameAm: "የወተት ምርቶች" },
  { id: "cat-4", name: "Bread & Bakery", nameAm: "ዳቦ እና ቤከሪ" },
  { id: "cat-5", name: "Canned Goods", nameAm: "የታሸጉ ምግቦች" },
  { id: "cat-6", name: "Household", nameAm: "የቤት ውስጥ ዕቃዎች" },
  { id: "cat-7", name: "Personal Care", nameAm: "የግል እንክብካቤ" },
  { id: "cat-8", name: "Fruits & Vegetables", nameAm: "ፍራፍሬ እና አትክልት" },
];

// Mock products
const mockProducts: Product[] = [
  {
    id: "prod-1",
    name: "Coca Cola 500ml",
    nameAm: "ኮካ ኮላ 500ሚሊ",
    category: "Beverages",
    unit: "pcs",
    pictureUrl:
      "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200",
    purchasePrice: 18,
    sellingPrice: 25,
    quantity: 150,
    storeQuantity: 200,
    supermarketQuantity: 150,
    barcode: "541234567890",
    lowStockThreshold: 20,
    shopId: "shop-001",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "prod-2",
    name: "Pepsi 330ml",
    nameAm: "ፔፕሲ 330ሚሊ",
    category: "Beverages",
    unit: "pcs",
    pictureUrl:
      "https://images.unsplash.com/photo-1553456558-aff63285bdd1?w=200",
    purchasePrice: 14,
    sellingPrice: 20,
    quantity: 80,
    storeQuantity: 120,
    supermarketQuantity: 80,
    barcode: "541234567891",
    lowStockThreshold: 15,
    shopId: "shop-001",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "prod-3",
    name: "Lays Chips Classic",
    nameAm: "ሌይስ ቺፕስ",
    category: "Snacks",
    unit: "pcs",
    pictureUrl:
      "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200",
    purchasePrice: 35,
    sellingPrice: 50,
    quantity: 45,
    storeQuantity: 60,
    supermarketQuantity: 45,
    barcode: "541234567892",
    lowStockThreshold: 10,
    shopId: "shop-001",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "prod-4",
    name: "Fresh Milk 1L",
    nameAm: "ትኩስ ወተት 1ሊትር",
    category: "Dairy",
    unit: "l",
    pictureUrl:
      "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200",
    purchasePrice: 45,
    sellingPrice: 60,
    quantity: 25,
    storeQuantity: 30,
    supermarketQuantity: 25,
    barcode: "541234567893",
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    lowStockThreshold: 10,
    shopId: "shop-001",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "prod-5",
    name: "White Bread",
    nameAm: "ነጭ ዳቦ",
    category: "Bread & Bakery",
    unit: "pcs",
    pictureUrl:
      "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=200",
    purchasePrice: 12,
    sellingPrice: 18,
    quantity: 60,
    storeQuantity: 40,
    supermarketQuantity: 60,
    barcode: "541234567894",
    expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    lowStockThreshold: 15,
    shopId: "shop-001",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "prod-6",
    name: "Tomato Paste 400g",
    nameAm: "የቲማቲም ፔስት",
    category: "Canned Goods",
    unit: "pcs",
    pictureUrl:
      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200",
    purchasePrice: 55,
    sellingPrice: 75,
    quantity: 8,
    storeQuantity: 20,
    supermarketQuantity: 8,
    barcode: "541234567895",
    lowStockThreshold: 10,
    shopId: "shop-001",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "prod-7",
    name: "Dish Soap 500ml",
    nameAm: "የእቃ ማጠቢያ ሳሙና",
    category: "Household",
    unit: "pcs",
    pictureUrl:
      "https://images.unsplash.com/photo-1585441695325-21557c836c45?w=200",
    purchasePrice: 40,
    sellingPrice: 55,
    quantity: 35,
    storeQuantity: 50,
    supermarketQuantity: 35,
    barcode: "541234567896",
    lowStockThreshold: 8,
    shopId: "shop-001",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "prod-8",
    name: "Sugar 1kg",
    nameAm: "ስኳር 1 ኪሎ",
    category: "Household",
    unit: "kg",
    pictureUrl:
      "https://images.unsplash.com/photo-1550411294-875a03bd3fcc?w=200",
    purchasePrice: 65,
    sellingPrice: 85,
    quantity: 5,
    storeQuantity: 15,
    supermarketQuantity: 5,
    barcode: "541234567897",
    lowStockThreshold: 10,
    shopId: "shop-001",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

interface ProductState {
  products: Product[];
  categories: Category[];
  isLoading: boolean;

  // Actions
  fetchProducts: () => Promise<void>;
  addProduct: (
    product: Omit<Product, "id" | "createdAt" | "updatedAt">
  ) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  searchProducts: (query: string) => Product[];
  getProductByBarcode: (barcode: string) => Product | undefined;
  getLowStockProducts: () => Product[];
  getExpiringProducts: (days?: number) => Product[];
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: mockProducts,
  categories: mockCategories,
  isLoading: false,

  fetchProducts: async () => {
    set({ isLoading: true });
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const token = useAuthStore.getState().user?.token;
    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      const normalized = Array.isArray(data)
        ? data.map((p: any) => ({
            ...p,
            id: p.id || p._id,
            pictureUrl:
              p.pictureUrl || p.imageUrl || p.secure_url || p.url || "",
          }))
        : mockProducts;
      set({ products: normalized, isLoading: false });
    } catch (err) {
      // Don't silently fallback to mock data here; surface the error so the UI
      // and developer can notice the failure during debugging.
      set({ products: [], isLoading: false });
      console.error("fetchProducts failed:", err);
    }
  },

  addProduct: async (productData) => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const token = useAuthStore.getState().user?.token;
    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(productData),
      });
      if (!res.ok) throw new Error("Failed to create product");
      const created = await res.json();
      const newProduct: Product = {
        ...created,
        id: created.id || created._id,
        createdAt: created.createdAt ? new Date(created.createdAt) : new Date(),
        updatedAt: created.updatedAt ? new Date(created.updatedAt) : new Date(),
      };
      set((state) => ({ products: [...state.products, newProduct] }));
      return newProduct;
    } catch (err) {
      console.warn("addProduct failed, falling back to mock add", err);
      const newProduct: Product = {
        ...productData,
        id: `prod-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Product;
      set((state) => ({ products: [...state.products, newProduct] }));
      return newProduct;
    }
  },

  updateProduct: async (id, updates) => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const token = useAuthStore.getState().user?.token;
    try {
      // support FormData (for image upload) or plain object
      const isForm = updates instanceof FormData;
      const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: "PUT",
        headers: isForm
          ? ({ Authorization: token ? `Bearer ${token}` : "" } as any)
          : {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
        body: isForm ? updates : JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update product");
      const updated = await res.json();
      const norm = {
        ...updated,
        id: updated.id || updated._id,
        pictureUrl:
          updated.pictureUrl ||
          updated.imageUrl ||
          updated.secure_url ||
          updated.url ||
          "",
      };
      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, ...norm, updatedAt: new Date() } : p
        ),
      }));
    } catch (err) {
      // fallback to local update
      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, ...(updates as any), updatedAt: new Date() } : p
        ),
      }));
      console.warn("updateProduct fallback:", err);
    }
  },

  deleteProduct: async (id) => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const token = useAuthStore.getState().user?.token;
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
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
        p.category.toLowerCase().includes(q)
    );
  },

  getProductByBarcode: (barcode) => {
    return get().products.find((p) => p.barcode === barcode);
  },

  getLowStockProducts: () => {
    return get().products.filter(
      (p) => p.supermarketQuantity <= p.lowStockThreshold
    );
  },

  getExpiringProducts: (days = 7) => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    return get().products.filter(
      (p) => p.expiryDate && new Date(p.expiryDate) <= threshold
    );
  },
}));
