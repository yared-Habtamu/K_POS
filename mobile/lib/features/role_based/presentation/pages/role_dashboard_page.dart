import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:pos_app/features/common_dashboard_pages/common_drawer_and_header.dart';
import 'package:pos_app/features/admin/presentation/pages/admin_dashboard_page.dart';
import 'package:pos_app/features/admin/presentation/pages/admin_mart_management_page.dart';
import 'package:pos_app/features/store_keeper/presentation/pages/store_keeper_inventory_page.dart';
import 'package:pos_app/features/store_keeper/presentation/pages/store_keeper_barcode_scanner_page.dart';
import 'package:pos_app/features/store_keeper/presentation/pages/store_keeper_alerts_page.dart';
import 'package:pos_app/features/manager/presentation/pages/manager_alerts_page.dart';
import 'package:pos_app/features/manager/presentation/pages/manager_products_page.dart';
import 'package:pos_app/features/manager/presentation/pages/manager_dashboard_page.dart';
import 'package:pos_app/features/manager/presentation/pages/manager_todays_sales_page.dart';
import 'package:pos_app/features/manager/presentation/pages/manager_inventory_page.dart';
import 'package:pos_app/features/manager/presentation/pages/manager_point_of_sale_page.dart';
import 'package:pos_app/features/manager/presentation/pages/manager_approvals_page.dart';
import 'package:pos_app/features/manager/presentation/pages/manager_assets_page.dart';
import 'package:pos_app/features/manager/presentation/pages/manager_employees_page.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_dashboard_page.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_pos_page.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_products_page.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_inventory_page.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_employees_page.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_settings_page.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_expenses_page.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_reports_page.dart';
import 'package:pos_app/services/global.dart';
import 'package:pos_app/utils/common_widgets.dart';

class RoleDashboardPage extends StatefulWidget {
  const RoleDashboardPage({super.key});

  @override
  State<RoleDashboardPage> createState() => _RoleDashboardPageState();
}

class _RoleDashboardPageState extends State<RoleDashboardPage> {
  final GlobalKey<ScaffoldState> _drawerKey = GlobalKey<ScaffoldState>();

  String _role = 'cashier';
  _RolePage _selected = _RolePage.dashboard;

  @override
  void initState() {
    super.initState();
    _loadRole();
  }

  void _loadRole() {
    final stored = Global.storageServices.getUserRole();
    setState(() {
      _role = _normalizeRole(stored);
      // Default selection: store keeper -> inventory, cashier variants -> dashboard, else dashboard
      if (_role.startsWith('cashier')) {
        _selected = _RolePage.dashboard;
      } else {
        _selected =
            _role == 'store_keeper' ? _RolePage.inventory : _RolePage.dashboard;
      }
    });
  }

  String _normalizeRole(String role) {
    final r = role.trim().toLowerCase();
    if (r == 'superagent') return 'system_admin';
    if (r == 'storekeeper') return 'store_keeper';
    if (r.isEmpty) return 'cashier';
    return r;
  }

  List<_MenuItem> _menuForRole(String role) {
    switch (role) {
      case 'system_admin':
        return const [
          _MenuItem(_RolePage.dashboard, Icons.dashboard, 'Dashboard'),
          _MenuItem(_RolePage.adminShops, Icons.store_mall_directory,
              'Marts / Shops'),
        ];
      case 'owner':
        return const [
          _MenuItem(_RolePage.dashboard, Icons.dashboard, 'Dashboard'),
          _MenuItem(_RolePage.pos, Icons.point_of_sale, 'Point Of Sale'),
          _MenuItem(_RolePage.products, Icons.inventory_2, 'Products'),
          _MenuItem(_RolePage.inventory, Icons.warehouse, 'Inventory'),
          _MenuItem(_RolePage.employees, Icons.groups, 'Employees'),
          _MenuItem(_RolePage.expenses, Icons.payments, 'Expenses'),
          _MenuItem(_RolePage.alerts, Icons.notifications, 'Alerts'),
          _MenuItem(_RolePage.reports, Icons.bar_chart, 'Reports'),
          _MenuItem(_RolePage.todaySales, Icons.today, "Today's Sales"),
          _MenuItem(_RolePage.assets, Icons.shopping_bag, 'Assets'),
          _MenuItem(_RolePage.settings, Icons.settings, 'Settings'),
        ];
      case 'manager':
        return const [
          _MenuItem(_RolePage.dashboard, Icons.dashboard, 'Dashboard'),
          _MenuItem(_RolePage.pos, Icons.point_of_sale, 'Point Of Sale'),
          _MenuItem(_RolePage.products, Icons.inventory_2, 'Products'),
          _MenuItem(_RolePage.employees, Icons.groups, 'Employees'),
          _MenuItem(_RolePage.approvals, Icons.verified, 'Approvals'),
          _MenuItem(_RolePage.inventory, Icons.warehouse, 'Inventory'),
          _MenuItem(_RolePage.assets, Icons.shopping_bag, 'Assets'),
          _MenuItem(_RolePage.reports, Icons.bar_chart, 'Reports'),
          _MenuItem(_RolePage.todaySales, Icons.today, "Today's Sales"),
          _MenuItem(_RolePage.alerts, Icons.notifications, 'Alerts'),
        ];
      case 'store_keeper':
        return const [
          _MenuItem(_RolePage.inventory, Icons.warehouse, 'Stock / Inventory'),
          _MenuItem(_RolePage.barcodes, Icons.qr_code, 'Barcode'),
          _MenuItem(_RolePage.alerts, Icons.notifications, 'Alerts'),
        ];
      case 'cashier':
      default:
        return const [
          _MenuItem(_RolePage.dashboard, Icons.dashboard, 'Dashboard'),
          _MenuItem(_RolePage.pos, Icons.point_of_sale, 'Point Of Sale'),
          _MenuItem(_RolePage.dailyReport, Icons.library_books, 'Daily Report'),
          _MenuItem(_RolePage.customers, Icons.groups, 'Customers'),
        ];
    }
  }

  @override
  Widget build(BuildContext context) {
    final menu = _menuForRole(_role);

    return Scaffold(
      key: _drawerKey,
      drawer: CommonDrawer(
        context: context,
        roleLabel: _role,
        drawerItems: menu
            .map(
              (item) => commonDrawerWidget(
                icon: item.icon,
                text: item.label,
                isClicked: _selected == item.page,
                onTap: () {
                  setState(() => _selected = item.page);
                  Navigator.pop(context);
                },
              ),
            )
            .toList(),
      ),
      appBar: AppBar(
        backgroundColor: Colors.white,
        leading: IconButton(
          onPressed: () {
            if (_selected != _RolePage.dashboard) {
              setState(() => _selected = _RolePage.dashboard);
            } else {
              _drawerKey.currentState?.openDrawer();
            }
          },
          icon: _selected != _RolePage.dashboard
              ? const Icon(Icons.arrow_back_ios)
              : Image.asset(
                  'assets/icons/hamburger.png',
                  height: 25,
                  width: 25,
                ),
        ),
        title: Text(
          _titleForPage(_selected),
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
        ),
        actions: [
          IconButton(
            tooltip: 'Logout',
            onPressed: () {
              Global.storageServices.setDeviceOpenedFirst(false);
              LogoutShowDialogue(context);
            },
            icon: const Icon(Icons.logout_outlined),
          ),
          SizedBox(width: 8.0.w),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_role == 'system_admin') {
      switch (_selected) {
        case _RolePage.dashboard:
          return const AdminDashboardPage();
        case _RolePage.adminShops:
          return const AdminMartManagementPage();
        default:
          return _RolePlaceholderPage(
            title: _titleForPage(_selected),
            subtitle: _subtitleForPage(_selected, _role),
          );
      }
    }

    if (_role == 'owner') {
      switch (_selected) {
        case _RolePage.dashboard:
          return const OwnerDashboardPage();
        case _RolePage.pos:
          return const OwnerPosPage();
        case _RolePage.products:
          return const OwnerProductsPage();
        case _RolePage.inventory:
          return const OwnerInventoryPage();
        case _RolePage.employees:
          return const OwnerEmployeesPage();
        case _RolePage.expenses:
          return const OwnerExpensesPage();
        case _RolePage.alerts:
          // Show manager alerts page UI inside owner
          return const ManagerAlertsPage();
        case _RolePage.todaySales:
          // Show manager today's sales page UI inside owner
          return const ManagerTodaysSalesPage();
        case _RolePage.assets:
          // Show manager assets page UI inside owner
          return const ManagerAssetsPage();
        case _RolePage.reports:
          return const OwnerReportsPage();
        case _RolePage.expenses:
          return const OwnerExpensesPage();
        case _RolePage.settings:
          return const OwnerSettingsPage();
        case _RolePage.todaySales:
          return const ManagerTodaysSalesPage();
        case _RolePage.alerts:
          return const ManagerAlertsPage();
        case _RolePage.assets:
          return const ManagerAssetsPage();
        default:
          return _RolePlaceholderPage(
            title: _titleForPage(_selected),
            subtitle: _subtitleForPage(_selected, _role),
          );
      }
    }

    if (_role == 'manager') {
      switch (_selected) {
        case _RolePage.dashboard:
          return const ManagerDashboardPage();
        case _RolePage.products:
          return const ManagerProductsPage();
        case _RolePage.pos:
          return const PointOfSalePage();
        case _RolePage.inventory:
          return const ManagerInventoryPage();
        case _RolePage.employees:
          return const ManagerEmployeesPage();
        case _RolePage.todaySales:
          return const ManagerTodaysSalesPage();
        case _RolePage.alerts:
          return const ManagerAlertsPage();
        case _RolePage.approvals:
          return const ManagerApprovalsPage();
        case _RolePage.assets:
          return const ManagerAssetsPage();
        default:
          return _RolePlaceholderPage(
            title: _titleForPage(_selected),
            subtitle: _subtitleForPage(_selected, _role),
          );
      }
    }

    if (_role == 'store_keeper') {
      switch (_selected) {
        case _RolePage.inventory:
          return const StoreKeeperInventoryPage();
        case _RolePage.barcodes:
          return const StoreKeeperBarcodeScannerPage();
        case _RolePage.alerts:
          return const StoreKeeperAlertsPage();
        default:
          return _RolePlaceholderPage(
            title: _titleForPage(_selected),
            subtitle: _subtitleForPage(_selected, _role),
          );
      }
    }

    // Cashier: custom dashboard view (accept variants like 'cashier2')
    if (_role.startsWith('cashier')) {
      switch (_selected) {
        case _RolePage.dashboard:
          return const CashierDashboardPage();
        case _RolePage.pos:
          // Cashiers use the same POS as owners
          return const OwnerPosPage();
        case _RolePage.dailyReport:
          return const CashierDailyReportPage();
        case _RolePage.customers:
          return const CashierCustomersPage();
        default:
          return _RolePlaceholderPage(
            title: _titleForPage(_selected),
            subtitle: _subtitleForPage(_selected, _role),
          );
      }
    }

    return _RolePlaceholderPage(
      title: _titleForPage(_selected),
      subtitle: _subtitleForPage(_selected, _role),
    );
  }

  String _titleForPage(_RolePage page) {
    switch (page) {
      case _RolePage.dashboard:
        return 'Dashboard';
      case _RolePage.pos:
        return 'Point Of Sale';
      case _RolePage.dailyReport:
        return 'Daily Report';
      case _RolePage.customers:
        return 'Customers';
      case _RolePage.todaySales:
        return "Today's Sales";
      case _RolePage.products:
        return 'Products';
      case _RolePage.addProduct:
        return 'Add Product';
      case _RolePage.inventory:
        return 'Inventory';
      case _RolePage.employees:
        return 'Employees';
      case _RolePage.expenses:
        return 'Expenses';
      case _RolePage.alerts:
        return 'Alerts';
      case _RolePage.reports:
        return 'Reports';
      case _RolePage.assets:
        return 'Assets';
      case _RolePage.settings:
        return 'Settings';
      case _RolePage.approvals:
        return 'Approvals';
      case _RolePage.barcodes:
        return 'Barcode';
      case _RolePage.adminShops:
        return 'Mart Management';
    }
  }

  String _subtitleForPage(_RolePage page, String role) {
    switch (page) {
      case _RolePage.dashboard:
        return 'Welcome back ($role). Use the sidebar to navigate.';
      case _RolePage.pos:
        return 'Cashier-style POS screen (placeholder).';
      case _RolePage.dailyReport:
        return 'Cashier daily report page (placeholder).';
      case _RolePage.customers:
        return 'Customer management page (placeholder).';
      case _RolePage.todaySales:
        return "Today's sales report (placeholder).";
      case _RolePage.products:
        return 'Owner product management (placeholder).';
      case _RolePage.addProduct:
        return 'Add product flow (placeholder).';
      case _RolePage.inventory:
        return 'Inventory / stock management (placeholder).';
      case _RolePage.employees:
        return 'Employee management (placeholder).';
      case _RolePage.expenses:
        return 'Expense management (placeholder).';
      case _RolePage.alerts:
        return 'Low stock / expiring alerts (placeholder).';
      case _RolePage.reports:
        return 'Reports (placeholder).';
      case _RolePage.assets:
        return 'Assets registration (placeholder).';
      case _RolePage.settings:
        return 'Settings (placeholder).';
      case _RolePage.approvals:
        return 'Approvals (placeholder).';
      case _RolePage.barcodes:
        return 'Barcode management (placeholder).';
      case _RolePage.adminShops:
        return 'Approve/reject marts (placeholder).';
    }
  }
}

enum _RolePage {
  dashboard,
  // cashier
  pos,
  dailyReport,
  customers,
  todaySales,
  // owner / manager
  products,
  addProduct,
  inventory,
  employees,
  expenses,
  alerts,
  reports,
  assets,
  settings,
  approvals,
  barcodes,
  // admin
  adminShops,
}

class _MenuItem {
  final _RolePage page;
  final IconData icon;
  final String label;

  const _MenuItem(this.page, this.icon, this.label);
}

class CashierDashboardPage extends StatelessWidget {
  const CashierDashboardPage({super.key});

  Widget _infoCard(String label, String value) {
    return Container(
      padding: EdgeInsets.symmetric(vertical: 8.h, horizontal: 12.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8.r),
        boxShadow: [
          BoxShadow(
              color: Colors.black12, blurRadius: 6.r, offset: Offset(0, 2.h)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: TextStyle(fontSize: 10.sp, color: Colors.grey[600])),
          SizedBox(height: 6.h),
          Text(value,
              style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _summaryCard(String label, String value) {
    return Container(
      width: 150.w,
      padding: EdgeInsets.all(12.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10.r),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: TextStyle(fontSize: 12.sp, color: Colors.grey[700])),
          SizedBox(height: 8.h),
          Text(value,
              style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(12.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Dashboard',
                      style: TextStyle(
                          fontSize: 18.sp, fontWeight: FontWeight.bold)),
                  SizedBox(height: 4.h),
                  Text('Quick overview',
                      style:
                          TextStyle(fontSize: 12.sp, color: Colors.grey[600])),
                ],
              ),
              Row(
                children: [
                  _infoCard('Items Sold', '16'),
                  SizedBox(width: 8.w),
                  _infoCard('Total Sales', '\$520.00'),
                ],
              )
            ],
          ),
          SizedBox(height: 12.h),

          // Charts (placeholders)
          Container(
            height: 180.h,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12.r),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Center(
                child: Text('Chart: Top items (placeholder)',
                    style: TextStyle(fontSize: 12.sp))),
          ),
          SizedBox(height: 12.h),

          Container(
            height: 140.h,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12.r),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Center(
                child: Text('Chart: Sales share (placeholder)',
                    style: TextStyle(fontSize: 12.sp))),
          ),
          SizedBox(height: 12.h),

          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _summaryCard('Total Items Sold', '16'),
                SizedBox(width: 8.w),
                _summaryCard('Total Purchasing Cost', '\$520.00'),
              ],
            ),
          ),
          SizedBox(height: 16.h),

          Text('Sold Items',
              style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold)),
          SizedBox(height: 8.h),
          Card(
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10.r)),
            child: Column(
              children: [
                ListTile(
                  leading: CircleAvatar(
                      backgroundColor: Colors.grey.shade200,
                      child: Icon(Icons.shopping_bag)),
                  title: Text('Bread2', style: TextStyle(fontSize: 14.sp)),
                  subtitle: Text('Qty: 6', style: TextStyle(fontSize: 12.sp)),
                  trailing: Text('\$120.00',
                      style: TextStyle(
                          fontSize: 14.sp, fontWeight: FontWeight.bold)),
                ),
                Divider(height: 1.h),
                ListTile(
                  leading: CircleAvatar(
                      backgroundColor: Colors.grey.shade200,
                      child: Icon(Icons.shopping_bag)),
                  title: Text('Baby oil', style: TextStyle(fontSize: 14.sp)),
                  subtitle: Text('Qty: 10', style: TextStyle(fontSize: 12.sp)),
                  trailing: Text('\$400.00',
                      style: TextStyle(
                          fontSize: 14.sp, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          SizedBox(height: 20.h),
        ],
      ),
    );
  }
}

class CashierCustomersPage extends StatefulWidget {
  const CashierCustomersPage({super.key});

  @override
  State<CashierCustomersPage> createState() => _CashierCustomersPageState();
}

class CashierDailyReportPage extends StatefulWidget {
  const CashierDailyReportPage({super.key});

  @override
  State<CashierDailyReportPage> createState() => _CashierDailyReportPageState();
}

class _CashierDailyReportPageState extends State<CashierDailyReportPage> {
  final _totalSalesCtrl = TextEditingController(text: '0');
  final _cashReceivedCtrl = TextEditingController(text: '0');
  final _bankTransfersCtrl = TextEditingController(text: '0');
  final _discountCtrl = TextEditingController(text: '0');
  final _notesCtrl = TextEditingController();

  void _refresh() {
    // Placeholder for refresh logic (e.g., fetch today's POS totals)
    setState(() {
      // simple mock: set cash received to 70% of total sales if numeric
      final total = double.tryParse(_totalSalesCtrl.text) ?? 0.0;
      _cashReceivedCtrl.text = (total * 0.7).toStringAsFixed(0);
    });
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Refreshed totals')));
  }

  void _submitReport() {
    // Basic validation & feedback; replace with real submission logic later
    final total = double.tryParse(_totalSalesCtrl.text) ?? 0.0;
    if (total <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter total sales')));
      return;
    }
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Daily report submitted')));
  }

  @override
  void dispose() {
    _totalSalesCtrl.dispose();
    _cashReceivedCtrl.dispose();
    _bankTransfersCtrl.dispose();
    _discountCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cashierName = Global.storageServices.getUserName() ?? 'cashier';
    final now = DateTime.now();
    final weekdayNames = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ];
    final monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    final weekdayStr = weekdayNames[now.weekday - 1];
    final monthStr = monthNames[now.month - 1];
    final dateStr = '$weekdayStr, $monthStr ${now.day}, ${now.year}';

    return SingleChildScrollView(
      padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 20.h),
      child: Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: 720.w),
          child: Card(
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12.r)),
            child: Padding(
              padding: EdgeInsets.all(16.w),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Daily Report',
                      style: TextStyle(
                          fontSize: 18.sp, fontWeight: FontWeight.bold)),
                  SizedBox(height: 6.h),
                  Text('Submit your daily financial report • $dateStr',
                      style:
                          TextStyle(fontSize: 12.sp, color: Colors.grey[600])),
                  SizedBox(height: 12.h),

                  Container(
                    padding:
                        EdgeInsets.symmetric(horizontal: 12.w, vertical: 14.h),
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(8.r),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Cashier:',
                                style: TextStyle(
                                    fontSize: 12.sp, color: Colors.grey[700])),
                            SizedBox(height: 6.h),
                            Text(cashierName,
                                style: TextStyle(
                                    fontSize: 14.sp,
                                    fontWeight: FontWeight.bold)),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('Date:',
                                style: TextStyle(
                                    fontSize: 12.sp, color: Colors.grey[700])),
                            SizedBox(height: 6.h),
                            Text(dateStr, style: TextStyle(fontSize: 14.sp)),
                          ],
                        ),
                      ],
                    ),
                  ),

                  SizedBox(height: 16.h),

                  // Four inputs in two columns
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('\$ Total Sales (ETB)',
                                style: TextStyle(
                                    fontSize: 12.sp, color: Colors.grey[700])),
                            SizedBox(height: 8.h),
                            TextField(
                              controller: _totalSalesCtrl,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                      borderRadius:
                                          BorderRadius.circular(8.r))),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(width: 12.w),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Cash Received (ETB)',
                                style: TextStyle(
                                    fontSize: 12.sp, color: Colors.grey[700])),
                            SizedBox(height: 8.h),
                            TextField(
                              controller: _cashReceivedCtrl,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                      borderRadius:
                                          BorderRadius.circular(8.r))),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  SizedBox(height: 12.h),

                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Bank Transfers (ETB)',
                                style: TextStyle(
                                    fontSize: 12.sp, color: Colors.grey[700])),
                            SizedBox(height: 8.h),
                            TextField(
                              controller: _bankTransfersCtrl,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                      borderRadius:
                                          BorderRadius.circular(8.r))),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(width: 12.w),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Discount Given (ETB)',
                                style: TextStyle(
                                    fontSize: 12.sp, color: Colors.grey[700])),
                            SizedBox(height: 8.h),
                            TextField(
                              controller: _discountCtrl,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                      borderRadius:
                                          BorderRadius.circular(8.r))),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  SizedBox(height: 12.h),
                  Align(
                    alignment: Alignment.centerRight,
                    child: OutlinedButton.icon(
                      onPressed: _refresh,
                      icon: const Icon(Icons.refresh),
                      label: Text('Refresh', style: TextStyle(fontSize: 12.sp)),
                    ),
                  ),

                  SizedBox(height: 12.h),

                  Text('Additional Notes (Optional)',
                      style:
                          TextStyle(fontSize: 12.sp, color: Colors.grey[700])),
                  SizedBox(height: 8.h),
                  TextField(
                    controller: _notesCtrl,
                    maxLines: 5,
                    decoration: InputDecoration(
                      hintText: 'Any additional information...',
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8.r)),
                    ),
                  ),

                  SizedBox(height: 16.h),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _submitReport,
                      icon: const Icon(Icons.send),
                      label: Padding(
                        padding: EdgeInsets.symmetric(vertical: 12.h),
                        child: Text('Submit Daily Report',
                            style: TextStyle(fontSize: 14.sp)),
                      ),
                      style: ElevatedButton.styleFrom(
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8.r))),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CashierCustomersPageState extends State<CashierCustomersPage> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();

  final List<Map<String, String>> _customers = [
    {
      'name': 'Yared Habtamu Desalegn',
      'phone': '0968757961',
      'city': 'Addis Ababa'
    },
    {'name': 'Abebe kebede', 'phone': '0916757961', 'city': 'Addis Ababa'},
  ];

  void _addCustomer() {
    final name = _nameCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    final city = _cityCtrl.text.trim();
    if (name.isEmpty || phone.isEmpty) return;
    setState(() {
      _customers.insert(0, {'name': name, 'phone': phone, 'city': city});
      _nameCtrl.clear();
      _phoneCtrl.clear();
      _cityCtrl.clear();
    });
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _cityCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(12.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Customer Management',
              style: TextStyle(fontSize: 20.sp, fontWeight: FontWeight.bold)),
          SizedBox(height: 6.h),
          Text('Add and view customers (cashier only)',
              style: TextStyle(fontSize: 12.sp, color: Colors.grey[600])),
          SizedBox(height: 12.h),
          Container(
            padding: EdgeInsets.all(12.w),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12.r),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: TextField(
                    controller: _nameCtrl,
                    decoration: InputDecoration(hintText: 'Name'),
                  ),
                ),
                SizedBox(width: 8.w),
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: _phoneCtrl,
                    decoration: InputDecoration(hintText: 'Phone number'),
                    keyboardType: TextInputType.phone,
                  ),
                ),
                SizedBox(width: 8.w),
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: _cityCtrl,
                    decoration: InputDecoration(hintText: 'City'),
                  ),
                ),
                SizedBox(width: 8.w),
                ElevatedButton(
                  onPressed: _addCustomer,
                  style: ElevatedButton.styleFrom(
                    padding:
                        EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
                  ),
                  child:
                      Text('Add Customer', style: TextStyle(fontSize: 12.sp)),
                )
              ],
            ),
          ),
          SizedBox(height: 18.h),
          Card(
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10.r)),
            child: Padding(
              padding: EdgeInsets.all(12.w),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Your Customers',
                      style: TextStyle(
                          fontSize: 16.sp, fontWeight: FontWeight.w600)),
                  SizedBox(height: 12.h),
                  ListView.separated(
                    shrinkWrap: true,
                    physics: NeverScrollableScrollPhysics(),
                    itemCount: _customers.length,
                    separatorBuilder: (_, __) => Divider(height: 1.h),
                    itemBuilder: (context, index) {
                      final c = _customers[index];
                      return Padding(
                        padding: EdgeInsets.symmetric(vertical: 8.h),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(c['name'] ?? '',
                                style: TextStyle(
                                    fontSize: 14.sp,
                                    fontWeight: FontWeight.w600)),
                            SizedBox(height: 4.h),
                            Text('${c['phone'] ?? ''} • ${c['city'] ?? ''}',
                                style: TextStyle(
                                    fontSize: 12.sp, color: Colors.grey[600])),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RolePlaceholderPage extends StatelessWidget {
  final String title;
  final String subtitle;

  const _RolePlaceholderPage({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(24.0.w),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.layers, size: 64.0.sp, color: Colors.grey.shade600),
            SizedBox(height: 16.0.h),
            Text(
              title,
              style: TextStyle(fontSize: 22.0.sp, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 8.0.h),
            Text(
              subtitle,
              style: TextStyle(fontSize: 14.0.sp, color: Colors.grey.shade700),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 18.0.h),
            Container(
              padding: EdgeInsets.all(12.0.w),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(12.0.r),
                border: Border.all(color: Colors.green.shade100),
              ),
              child: Text(
                'Note: These pages are placeholders (cashier-style)\nso you can wire real UI later.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12.0.sp),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
