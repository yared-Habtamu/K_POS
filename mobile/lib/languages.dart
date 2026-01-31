import 'package:get/get.dart';

class Languages extends Translations {
  @override
  Map<String, Map<String, String>> get keys => {

    /// ===================== ENGLISH =====================
    'en_US': {
      /// Dashboard
      "dashboard": "Dashboard",
      "welcome_text": "Welcome back! Here's what's happening with your store today.",
      "invite": "Invite",
      "new_mart": "New Mart",
      "today_sales": "Today's Sales",
      "transactions": "Transactions",
      "net_profit": "Net Profit",
      "active_alerts": "Active Alerts",
      "sales_analytics": "Analytics",
      "daily": "Daily",
      "weekly": "Weekly",
      "monthly": "Monthly",
      "top_performers": "Top Performers",

      /// Point of Sale
      "point_of_sale": "Point of Sale",
      "scan_barcode_or_search_products": "Scan barcode or search product",
      "low_stock": "{lowStock} Low Stock",
      "expiring_soon": "{expiringProducts} Expiring Soon",
      "cart": "Cart",
      "cart_is_empty": "Cart is Empty",
      "scan_or_search_products_to_add": "Scan or search products to add",
      "payment_method": "Payment Method",
      "card": "Card",
      "cash": "Cash",
      "telebirr": "Tele Birr",
      "wallet": "Wallet",
      "other": "Other",
      "saved_accounts": "Saved Accounts",
      "discount": "Discount",
      "extra_charge": "Extra Charge",
      "complete_sale": "Complete Sale - {amount} ETB",
      "clear_cart": "Clear Cart",

      /// Products
      "manage_your_product_inventory": "Manage your product inventory",
      "add_product": "Add Product",
      "search_product": "Search Product",
      "products": "Products",
      "showing": "Showing",
      "next": "Next",
      "previous": "Previous",

      /// Employees
      "employees": "Employees",
      "attendance": "Attendance",
      "manage_your_team_members": "Manage your team members",
      "add_employee": "Add Employee",
      "search_employee": "Search Employees",
      "manage_permissions": "Manage Permissions",
      "control_which_actions_each_employee_is_allowed_to_perform_in_the_pos_system":
      "Control which actions each employee is allowed to perform in the POS system.",
      "store_keeper_permissions": "Store Keeper Permissions",
      "cashier_permissions": "Cashier Permissions",
    },

    /// ===================== AFAN OROMO =====================
    'om_ET': {
      /// Dashboard
      "dashboard": "Daashboordii",
      "welcome_text":
      "Baga nagaan deebitan! Har’a daldala keessan irratti wanti ta’aa jiru kanaa ilaalaa.",
      "invite": "Waami",
      "new_mart": "Suuqii Haaraa",
      "today_sales": "Gurgurtaa Har’aa",
      "transactions": "Hojiiwwan",
      "net_profit": "Bu’aa Qulqulluu",
      "active_alerts": "Beeksisoota Hojii Irra Jiran",
      "sales_analytics": "Xiinxala",
      "daily": "Guyyaan",
      "weekly": "Torbaniin",
      "monthly": "Ji’aan",
      "top_performers": "Hojjettoota Olaanoo",

      /// Point of Sale
      "point_of_sale": "Sirna Gurgurtaa",
      "scan_barcode_or_search_products":
      "Baarkoodii sakatta’i ykn oomisha barbaadi",
      "low_stock": "Kuusaa Xiqqaa",
      "expiring_soon": "Yeroo Dhumaa Dhiyaataa",
      "cart": "Gaarii",
      "cart_is_empty": "Gaariin duwwaadha",
      "scan_or_search_products_to_add":
      "Oomisha dabaluuf sakatta’i ykn barbaadi",
      "payment_method": "Mala Kaffaltii",
      "card": "Kaardii",
      "cash": "Lallaafa",
      "telebirr": "Tele Birr",
      "wallet": "Boorsaa",
      "other": "Kan Biraa",
      "saved_accounts": "Herrega Eegame",
      "discount": "Hir’ina Gatii",
      "extra_charge": "Kaffaltii Dabalataa",
      "complete_sale": "Gurgurtaa Xumuri",
      "clear_cart": "Gaarii Qulqulleessi",

      /// Products
      "manage_your_product_inventory":
      "Kuusaa oomisha keessan bulchi",
      "add_product": "Oomisha Dabali",
      "search_product": "Oomisha Barbaadi",
      "products": "Oomishoota",
      "showing": "Agarsiisaa",
      "next": "Itti Aanu",
      "previous": "Kan Duraa",

      /// Employees
      "employees": "Hojjettoota",
      "attendance": "Argama",
      "manage_your_team_members":
      "Miseensota garee keessan bulchi",
      "add_employee": "Hojjetaa Dabali",
      "search_employee": "Hojjetaa Barbaadi",
      "manage_permissions": "Eeyyama Bulchi",
      "control_which_actions_each_employee_is_allowed_to_perform_in_the_pos_system":
      "Hojii hojjattoonni sirna gurgurtaa keessatti hojjachuu danda’an to’achiisi.",
      "store_keeper_permissions": "Eeyyama Eegaa Suuqii",
      "cashier_permissions": "Eeyyama Kassaa",
    },

    /// ===================== AMHARIC =====================
    'am_ET': {
      /// Dashboard
      "dashboard": "ዳሽቦርድ",
      "welcome_text":
      "እንኳን ደህና መጡ! ዛሬ በመደብርዎ የሚከናወነውን ይመልከቱ።",
      "invite": "ግብዣ",
      "new_mart": "አዲስ ሱቅ",
      "today_sales": "የዛሬ ሽያጭ",
      "transactions": "ግብይቶች",
      "net_profit": "የተጣራ ትርፍ",
      "active_alerts": "ንቁ ማስጠንቀቂያዎች",
      "sales_analytics": "ትንታኔ",
      "daily": "በየቀኑ",
      "weekly": "በየሳምንቱ",
      "monthly": "በየወሩ",
      "top_performers": "ምርጥ ሰራተኞች",

      /// Point of Sale
      "point_of_sale": "የሽያጭ መድረክ",
      "scan_barcode_or_search_products":
      "ባርኮድ ያንብቡ ወይም እቃ ይፈልጉ",
      "low_stock": "ዝቅተኛ ክምችት",
      "expiring_soon": "በቅርቡ የሚያበቃ",
      "cart": "ጋሪ",
      "cart_is_empty": "ጋሪው ባዶ ነው",
      "scan_or_search_products_to_add":
      "ለመጨመር እቃ ያንብቡ ወይም ይፈልጉ",
      "payment_method": "የክፍያ ዘዴ",
      "card": "ካርድ",
      "cash": "ጥሬ ገንዘብ",
      "telebirr": "ቴሌ ብር",
      "wallet": "ዋሌት",
      "other": "ሌላ",
      "saved_accounts": "የተቀመጡ መለያዎች",
      "discount": "ቅናሽ",
      "extra_charge": "ተጨማሪ ክፍያ",
      "complete_sale": "ሽያጩን ጨርስ",
      "clear_cart": "ጋሪውን አጽዳ",

      /// Products
      "manage_your_product_inventory":
      "የእቃ ክምችትዎን ያስተዳድሩ",
      "add_product": "እቃ ጨምር",
      "search_product": "እቃ ፈልግ",
      "products": "እቃዎች",
      "showing": "በማሳየት ላይ",
      "next": "ቀጣይ",
      "previous": "የቀድሞ",

      /// Employees
      "employees": "ሰራተኞች",
      "attendance": "መገኘት",
      "manage_your_team_members":
      "የቡድን አባላትዎን ያስተዳድሩ",
      "add_employee": "ሰራተኛ ጨምር",
      "search_employee": "ሰራተኛ ፈልግ",
      "manage_permissions": "ፍቃዶችን አስተዳድር",
      "control_which_actions_each_employee_is_allowed_to_perform_in_the_pos_system":
      "በPOS ስርዓት ውስጥ ሰራተኞች ሊፈጽሙት የሚችሉትን ተግባር ይቆጣጠሩ።",
      "store_keeper_permissions": "የመደብር ጠባቂ ፍቃዶች",
      "cashier_permissions": "የካሸር ፍቃዶች",
    },
  };
}
