import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      // Common
      app_name: "Smart POS",
      login: "Login",
      logout: "Logout",
      dashboard: "Dashboard",
      settings: "Settings",
      search: "Search",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      add: "Add",
      submit: "Submit",
      export: "Export",
      filter: "Filter",
      actions: "Actions",
      view: "View",
      print: "Print",
      download: "Download",

      // Roles
      system_admin: "System Admin",
      owner: "Owner",
      manager: "Manager",
      cashier: "Cashier",
      store_keeper: "Store Keeper",

      // Login
      username: "Username",
      password: "Password",
      select_role: "Select Role",
      login_error: 'Invalid credentials. Try "demo" as password.',

      // POS
      pos: "Point of Sale",
      scan_barcode: "Scan barcode or search product",
      cart: "Cart",
      items: "Items",
      quantity: "Quantity",
      unit_price: "Unit Price",
      subtotal: "Subtotal",
      discount: "Discount",
      extra_charges: "Extra Charges",
      tax: "Tax (VAT 15%)",
      total: "Total",
      payment_method: "Payment Method",
      cash: "Cash",
      card: "Card",
      telebirr: "Tele Birr",
      cbe_bank: "CBE Bank",
      wallet: "Wallet",
      credit: "Credit",
      complete_sale: "Complete Sale",
      clear_cart: "Clear Cart",
      receipt_preview: "Receipt Preview",

      // Products
      products: "Products",
      product_name: "Product Name",
      category: "Category",
      unit: "Unit",
      purchase_price: "Purchase Price",
      selling_price: "Selling Price",
      stock: "Stock",
      barcode: "Barcode",
      expiry_date: "Expiry Date",
      add_product: "Add Product",
      edit_product: "Edit Product",

      // Inventory
      inventory: "Inventory",
      store_quantity: "Store Qty",
      supermarket_quantity: "Supermarket Qty",
      low_stock: "Low Stock",
      expiring_soon: "Expiring Soon",
      add_stock: "Add Stock",

      // Employees
      employees: "Employees",
      employee_name: "Employee Name",
      phone: "Phone",
      role: "Role",
      salary: "Salary",
      add_employee: "Add Employee",
      attendance: "Attendance",
      clock_in: "Clock In",
      clock_out: "Clock Out",

      // Expenses
      expenses: "Expenses",
      expense_category: "Category",
      amount: "Amount",
      add_expense: "Add Expense",
      edit_expense: "Edit Expense",
      salary_expense: "Salary",
      rent: "Rent",
      electricity: "Electricity",
      water: "Water",
      cleaning: "Cleaning",
      miscellaneous: "Miscellaneous",

      // Reports
      reports: "Reports",
      daily_report: "Daily Report",
      sales_report: "Sales Report",
      total_sales: "Total Sales",
      cash_received: "Cash Received",
      bank_transfers: "Bank Transfers",
      profit: "Profit",
      inventory_value: "Inventory Value",

      // Dashboard
      today_sales: "Today's Sales",
      this_week: "This Week",
      this_month: "This Month",
      top_selling: "Top Selling Products",
      recent_sales: "Recent Sales",
      alerts: "Alerts",

      // Assets
      assets: "Assets",
      asset_name: "Asset Name",
      add_asset: "Add Asset",

      // Shop/Store
      shop: "Shop",
      shop_name: "Shop Name",
      shop_address: "Address",
      customers: "Customers",

      // Messages
      sale_complete: "Sale completed successfully!",
      product_added: "Product added successfully!",
      product_updated: "Product updated successfully!",
      product_deleted: "Product deleted successfully!",
      employee_added: "Employee added successfully!",
      expense_added: "Expense recorded successfully!",
      expense_updated: "Expense updated successfully!",
      report_submitted: "Report submitted successfully!",

      // Notifications
      notifications: "Notifications",
      unread: "Unread",
      no_notifications: "No notifications",
      mark_as_read: "Mark as read",
      view_all_notifications: "View all notifications",

      // Currency
      etb: "ETB",
    },
  },
  am: {
    translation: {
      // Common
      app_name: "ስማርት POS",
      login: "ግባ",
      logout: "ውጣ",
      dashboard: "ዳሽቦርድ",
      settings: "ቅንብሮች",
      search: "ፈልግ",
      save: "አስቀምጥ",
      cancel: "ሰርዝ",
      delete: "ሰርዝ",
      edit: "አርትዕ",
      add: "ጨምር",
      submit: "አስገባ",
      export: "ላክ",
      filter: "አጣራ",
      actions: "ድርጊቶች",
      view: "ተመልከት",
      print: "አትም",
      download: "አውርድ",

      // Roles
      system_admin: "ሲስተም አድሚን",
      owner: "ባለቤት",
      manager: "ሥራ አስኪያጅ",
      cashier: "ገንዘብ ያዥ",
      store_keeper: "መጋዘን ጠባቂ",

      // Login
      username: "የተጠቃሚ ስም",
      password: "የይለፍ ቃል",
      select_role: "ሚና ይምረጡ",
      login_error: 'ልክ ያልሆነ ማረጋገጫ። "demo" ይሞክሩ።',

      // POS
      pos: "የሽያጭ ቦታ",
      scan_barcode: "ባርኮድ ያስነብቡ ወይም ምርት ይፈልጉ",
      cart: "ጋሪ",
      items: "እቃዎች",
      quantity: "ብዛት",
      unit_price: "የአንድ ዋጋ",
      subtotal: "ንዑስ ድምር",
      discount: "ቅናሽ",
      extra_charges: "ተጨማሪ ክፍያዎች",
      tax: "ቀረጥ (ተ.ጨ.ታ 15%)",
      total: "ጠቅላላ",
      payment_method: "የክፍያ ዘዴ",
      cash: "ጥሬ ገንዘብ",
      card: "ካርድ",
      telebirr: "ቴሌ ብር",
      cbe_bank: "CBE ባንክ",
      wallet: "ዋሌት",
      credit: "ክሬዲት",
      complete_sale: "ሽያጭ አጠናቅ",
      clear_cart: "ጋሪ አጽዳ",
      receipt_preview: "ደረሰኝ ቅድመ እይታ",

      // Products
      products: "ምርቶች",
      product_name: "የምርት ስም",
      category: "ምድብ",
      unit: "አሃድ",
      purchase_price: "የግዢ ዋጋ",
      selling_price: "የሽያጭ ዋጋ",
      stock: "ክምችት",
      barcode: "ባርኮድ",
      expiry_date: "የማለቂያ ቀን",
      add_product: "ምርት ጨምር",
      edit_product: "ምርት አርትዕ",

      // Inventory
      inventory: "ክምችት",
      store_quantity: "የመጋዘን ብዛት",
      supermarket_quantity: "የሱፐርማርኬት ብዛት",
      low_stock: "ዝቅተኛ ክምችት",
      expiring_soon: "በቅርቡ ያልቃል",
      add_stock: "ክምችት ጨምር",

      // Employees
      employees: "ሰራተኞች",
      employee_name: "የሰራተኛ ስም",
      phone: "ስልክ",
      role: "ሚና",
      salary: "ደሞዝ",
      add_employee: "ሰራተኛ ጨምር",
      attendance: "የስራ ሰዓት",
      clock_in: "መግቢያ",
      clock_out: "መውጫ",

      // Expenses
      expenses: "ወጪዎች",
      expense_category: "ምድብ",
      amount: "መጠን",
      add_expense: "ወጪ ጨምር",
      edit_expense: "ወጪ አስተካክል",
      salary_expense: "ደሞዝ",
      rent: "ኪራይ",
      electricity: "መብራት",
      water: "ውሃ",
      cleaning: "ጽዳት",
      miscellaneous: "ልዩ ልዩ",

      // Reports
      reports: "ሪፖርቶች",
      daily_report: "የቀን ሪፖርት",
      sales_report: "የሽያጭ ሪፖርት",
      total_sales: "ጠቅላላ ሽያጭ",
      cash_received: "የተቀበለ ጥሬ ገንዘብ",
      bank_transfers: "የባንክ ዝውውሮች",
      profit: "ትርፍ",
      inventory_value: "የክምችት ዋጋ",

      // Dashboard
      today_sales: "የዛሬ ሽያጭ",
      this_week: "በዚህ ሳምንት",
      this_month: "በዚህ ወር",
      top_selling: "ከፍተኛ ሽያጭ ያላቸው",
      recent_sales: "የቅርብ ሽያጮች",
      alerts: "ማስጠንቀቂያዎች",

      // Assets
      assets: "ንብረቶች",
      asset_name: "የንብረት ስም",
      add_asset: "ንብረት ጨምር",

      // Shop/Store
      shop: "ሱቅ",
      shop_name: "የሱቅ ስም",
      shop_address: "አድራሻ",
      customers: "ደንበኞች",

      // Messages
      sale_complete: "ሽያጭ በተሳካ ሁኔታ ተጠናቋል!",
      product_added: "ምርት በተሳካ ሁኔታ ተጨምሯል!",
      product_updated: "ምርት በተሳካ ሁኔታ ተዘምኗል!",
      product_deleted: "ምርት በተሳካ ሁኔታ ተሰርዟል!",
      employee_added: "ሰራተኛ በተሳካ ሁኔታ ተጨምሯል!",
      expense_added: "ወጪ በተሳካ ሁኔታ ተመዝግቧል!",      expense_updated: "ወጪው በተሳካ ሁኔታ አዘምኗል!",      report_submitted: "ሪፖርት በተሳካ ሁኔታ ቀርቧል!",

      // Notifications
      notifications: "ማሳወቂያዎች",
      unread: "ያልተነበቡ",
      no_notifications: "ማሳወቂያ የለም",
      mark_as_read: "እንደተነበበ ምልክት አድርግ",
      view_all_notifications: "ሁሉንም ማሳወቂያዎች ተመልከት",

      // Currency
      etb: "ብር",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
