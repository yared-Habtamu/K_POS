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
  openCashBalance?: number;
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
  // backend-provided computed sold count (optional)
  _sold?: number;
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
  | "credit"
  | "wallet"
  | "other"
  | (string & {});
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

export interface ProductAddRequest {
  id?: string;
  _id?: string;
  martId: string;
  requesterId: string;
  requesterName?: string;
  payload: Partial<Product> & { name?: string };
  approvalRole?: "manager" | "store_keeper";
  status: "pending" | "approved" | "rejected";
  approverId?: string;
  approverName?: string;
  reason?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  decidedAt?: Date | string;
}

export interface StockTransferRequest {
  id?: string;
  _id?: string;
  martId: string;
  productId: string | { _id?: string; name?: string };
  quantity: number;
  fromLocation?: "store" | "mart";
  toLocation?: "store" | "mart";
  approvalRole?: "manager" | "store_keeper";
  requesterId: string;
  requesterName?: string;
  status: "pending" | "approved" | "rejected";
  approverId?: string;
  approverName?: string;
  reason?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  decidedAt?: Date | string;
}

export interface ProductEditRequest {
  id?: string;
  _id?: string;
  martId: string;
  productId: string | { _id?: string; name?: string };
  changes: Partial<Product>;
  approvalRole?: "manager" | "store_keeper";
  requesterId: string;
  requesterName?: string;
  status: "pending" | "approved" | "rejected";
  approverId?: string;
  approverName?: string;
  reason?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  decidedAt?: Date | string;
}

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
  createdByRole?: "owner" | "manager" | "other";
  createdByName?: string;
  createdAt: Date;
}

// Employee Attendance
export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  clockIn: Date;
  clockOut?: Date;
  lunchOut?: Date;
  lunchBack?: Date;
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

export interface AssetActionRequest {
  id?: string;
  _id?: string;
  martId: string;
  requesterId: string;
  requesterName?: string;
  requesterRole?: "owner" | "manager" | "systemadmin";
  assetId?: string;
  action: "create" | "update" | "delete";
  approvalRole?: "owner" | "manager";
  payload?: {
    name?: string;
    assetId?: string;
    quantity?: number;
    [key: string]: any;
  };
  status: "pending" | "approved" | "rejected";
  approverId?: string;
  approverName?: string;
  reason?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  decidedAt?: Date | string;
}

export interface ExpenseActionRequest {
  id?: string;
  _id?: string;
  martId: string;
  requesterId?: string;
  requesterName?: string;
  requesterRole?: "owner" | "manager" | "systemadmin" | "other";
  action: "create";
  approvalRole?: "owner";
  payload?: {
    category?: string;
    description?: string;
    amount?: number;
    date?: string | Date;
    name?: string;
    reason?: string;
    paymentType?: string;
    [key: string]: any;
  };
  status: "pending" | "approved" | "rejected";
  approverId?: string;
  approverName?: string;
  reason?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  decidedAt?: Date | string;
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

// ─── Shared DTOs (Member 3 owned) ───────────────────────────────────────────

/** Open Cash Request - for owner/manager open cash allocation/return workflow */
export type OpenCashDirection = "allocation" | "return";

export interface OpenCashRequestDTO {
  id: string;
  martId: string;
  managerId: string;
  requesterId: string;
  direction: OpenCashDirection;
  amount: number;
  receiptUrl: string;
  status: "pending" | "approved" | "rejected";
  approverId?: string;
  reason?: string;
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields (optional, from includes)
  managerName?: string;
  requesterName?: string;
  approverName?: string;
}

/** Sale Cancellation Request - for cancelling completed receipts */
export interface SaleCancellationRequestDTO {
  id: string;
  martId: string;
  saleId: string;
  requesterId: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approverId?: string;
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields (optional)
  requesterName?: string;
  approverName?: string;
  saleReceiptId?: string;
  saleTotal?: number;
  saleDate?: string;
}

/** Bank Account - unified format for all banks */
export interface BankAccountDTO {
  id?: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
}

/** Chat Conversation */
export interface ChatConversationDTO {
  id: string;
  martId: string;
  managerId: string;
  cashierId: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  managerName?: string;
  cashierName?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

/** Chat Message */
export interface ChatMessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  message: string;
  readAt?: string;
  createdAt: string;
  // Joined fields
  senderName?: string;
  senderRole?: UserRole;
}
