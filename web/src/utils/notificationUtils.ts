export function getNotificationUrl(notification: any, userRole?: string): string {
  if (!notification) return "/";

  // 1. Direct explicit URL in data payload
  if (notification.data?.url) {
    return notification.data.url;
  }

  const type = String(notification.type || "").toLowerCase();
  const title = String(notification.title || "").toLowerCase();
  const message = String(notification.message || "").toLowerCase();
  const text = `${type} ${title} ${message}`;

  const role = String(userRole || "").toLowerCase();
  const isOwner = role === "owner";
  const isManager = role === "manager";
  const isStoreKeeper = role === "store_keeper" || role === "storekeeper";
  const isCashier = role === "cashier";
  const isAdmin = role === "admin" || role === "system_admin";

  const chatRouteForRole = (suffix = "") => {
    const query = suffix ? `?${suffix}` : "";
    if (isManager) return `/manager/chat${query}`;
    if (isCashier) return `/cashier/chat${query}`;
    if (isOwner) return `/owner/chat${query}`;
    if (isStoreKeeper) return `/store-keeper/chat${query}`;
    return `/manager/chat${query}`;
  };

  // Admin routing
  if (isAdmin) {
    if (text.includes("mart") || text.includes("shop") || text.includes("register")) {
      return "/admin/shops";
    }
    if (text.includes("subscription")) {
      return "/admin/subscriptions";
    }
    return "/admin";
  }

  // Chat messages deep-link directly to the conversation
  if (type.includes("chat") || type.includes("message") || notification.data?.conversationId) {
    if (notification.data?.conversationId) {
      return chatRouteForRole(`conv=${encodeURIComponent(notification.data.conversationId)}`);
    }
    return chatRouteForRole();
  }

  // 2. Expense & Expense Action Requests
  if (text.includes("expense")) {
    if (text.includes("approval") || text.includes("request")) {
      // Direct user to expense page where approvals tab/actions reside
      if (isOwner) return "/owner/expenses";
      if (isManager) return "/manager/expenses";
    }
    if (isOwner) return "/owner/expenses";
    if (isManager) return "/manager/expenses";
    return "/owner/expenses";
  }

  // 3. Open Cash Requests
  if (text.includes("open cash") || text.includes("open_cash")) {
    if (isOwner) return "/owner/open-cash";
    if (isManager) return "/manager/open-cash";
    return "/owner/open-cash";
  }

  // 4. Sale Cancellations
  if (text.includes("cancel") || text.includes("cancellation")) {
    if (isOwner) return "/owner/sale-cancellations";
    if (isManager) return "/manager/sale-cancellations";
    if (isCashier) return "/cashier/sale-cancellations";
    return "/owner/sale-cancellations";
  }

  // 5. Assets & Asset Action Requests
  if (text.includes("asset")) {
    if (isOwner) return "/owner/assets";
    if (isManager) return "/manager/assets";
    return "/owner/assets";
  }

  // 6. Stock Transfers
  if (text.includes("transfer") || text.includes("stock_transfer")) {
    if (isOwner) return "/owner/approvals";
    if (isManager) return "/manager/approvals";
    if (isStoreKeeper) return "/store-keeper/approvals";
    return "/owner/approvals";
  }

  // 7. General Approvals / Requests (Product Add / Edit Requests)
  if (text.includes("approval") || text.includes("request")) {
    if (isOwner) return "/owner/approvals";
    if (isManager) return "/manager/approvals";
    if (isStoreKeeper) return "/store-keeper/approvals";
    return "/owner/approvals";
  }

  // 8. Aging Stock / Old Stock
  if (text.includes("aging") || text.includes("old_stock")) {
    if (isOwner) return "/owner/aging-stock";
    if (isManager) return "/manager/aging-stock";
    return "/owner/aging-stock";
  }

  // 9. Stock / Inventory
  if (text.includes("stock") || text.includes("inventory") || text.includes("barcode")) {
    if (isOwner) return "/owner/inventory";
    if (isManager) return "/manager/inventory";
    if (isStoreKeeper) return "/store-keeper/inventory";
    return "/inventory";
  }

  // 11. Products (legacy fallback)
  if (text.includes("product")) {
    if (isOwner) return "/owner/products";
    if (isManager) return "/manager/products";
    if (isStoreKeeper) return "/store-keeper/products";
    return "/owner/products";
  }

  // 12. Customers / Credit
  if (text.includes("customer") || text.includes("credit")) {
    if (isOwner) return "/owner/customers";
    if (isManager) return "/manager/customers";
    if (isCashier) return "/cashier/customers";
    return "/owner/customers";
  }

  // 13. Sales / Orders
  if (text.includes("sale") || text.includes("order")) {
    if (isOwner) return "/owner/today-sales";
    if (isManager) return "/manager/today-sales";
    if (isCashier) return "/cashier/today-sales";
    return "/owner/today-sales";
  }

  // Fallback route per role
  if (isOwner) return "/owner";
  if (isManager) return "/manager";
  if (isStoreKeeper) return "/store-keeper";
  if (isCashier) return "/cashier";

  return "/";
}
