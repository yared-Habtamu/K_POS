// User Roles
export type UserRole =
  | "system_admin"
  | "owner"
  | "manager"
  | "cashier"
  | "store_keeper";

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  salary?: number;
  shopId?: string;
  martId?: string;
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Product Types
export type ProductUnit = "kg" | "g" | "ml" | "l" | "pcs" | "box";

export interface Product {
  id: string;
  name: string;
  nameAm?: string; // Amharic name
  category: string;
  unit: ProductUnit;
  pictureUrl?: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  storeQuantity: number; // warehouse
  supermarketQuantity: number; // front store
  barcodes?: string[];
  // legacy single barcode (kept for backward compatibility)
  barcode?: string;
  expiryDate?: Date;
  lowStockThreshold: number;
  shopId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  nameAm?: string;
  description?: string;
}

// Sales Types
export type PaymentMethod =
  | "cash"
  | "card"
  | "telebirr"
  | "cbe_bank"
  | "wallet"
  | "other";
export type DiscountType = "percentage" | "fixed";

export interface CartItem {
  product: Product;
  quantity: number;
  discount?: {
    type: DiscountType;
    value: number;
  };
  subtotal: number;
}

export interface ExtraCharge {
  id: string;
  name: string;
  nameAm?: string;
  amount: number;
}

export interface Sale {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount?: {
    type: DiscountType;
    value: number;
  };
  extraCharges: ExtraCharge[];
  tax: number;
  taxRate?: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  receiptId: string;
  qrCodeData: string;
  shopId: string;
  isOffline: boolean;
  syncedAt?: Date;
  createdAt: Date;
}

// Customer Types
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  shopId: string;
  createdAt: Date;
}

// Inventory Types
export type InventoryAction =
  | "add"
  | "remove"
  | "sale"
  | "adjustment"
  | "transfer";

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  oldQuantity: number;
  newQuantity: number;
  action: InventoryAction;
  userId: string;
  userName: string;
  notes?: string;
  timestamp: Date;
}

// Expense Types
export type ExpenseCategory =
  | "salary"
  | "rent"
  | "electricity"
  | "water"
  | "cleaning"
  | "miscellaneous"
  | "other";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: Date;
  shopId: string;
  createdBy: string;
  createdAt: Date;
}

// Employee Attendance
export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  clockIn: Date;
  clockOut?: Date;
  date: Date;
}

// Asset Types
export interface Asset {
  id: string;
  name: string;
  quantity: number;
  shopId: string;
  createdBy: string;
  createdAt: Date;
}

// Shop/Supermarket Types
export interface Shop {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  receiptHeader?: string;
  receiptSlogan?: string;
  ownerId: string;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Daily Report Types
export interface DailyReport {
  id: string;
  date: Date;
  cashierId: string;
  cashierName: string;
  totalSales: number;
  cashReceived: number;
  bankTransferReceived: number;
  discountsGiven: number;
  itemsSold: {
    productId: string;
    productName: string;
    quantity: number;
    total: number;
  }[];
  shopId: string;
  submittedAt: Date;
}

// Receipt Types
export interface Receipt {
  id: string;
  saleId: string;
  qrCodeData: string;
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  shopLogo?: string;
  items: CartItem[];
  subtotal: number;
  discount?: { type: DiscountType; value: number; amount: number };
  extraCharges: ExtraCharge[];
  tax: number;
  taxRate?: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashierName: string;
  date: Date;
  receiptHeader?: string;
  receiptSlogan?: string;
}

// Dashboard Analytics
export interface SalesAnalytics {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  topProducts: { product: Product; totalSold: number; revenue: number }[];
  salesByPaymentMethod: {
    method: PaymentMethod;
    count: number;
    total: number;
  }[];
  salesByCashier: {
    cashierId: string;
    cashierName: string;
    sales: number;
    revenue: number;
  }[];
}

export interface InventoryAnalytics {
  totalProducts: number;
  totalValue: number;
  lowStockItems: Product[];
  expiringItems: Product[];
  expiredItems: Product[];
}
