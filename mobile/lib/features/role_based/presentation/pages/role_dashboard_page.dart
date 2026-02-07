import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:pos_app/features/common_use_pages/common_drawer_and_header.dart';
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
import 'package:pos_app/features/owners_page/presentation/pages/owner_point_of_sale_page.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_products_page.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_inventory_page.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_employees_page.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_settings_page.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_expenses_page.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_reports_page.dart';
import 'package:pos_app/features/reports/data/today_sales_repository.dart';
import 'package:pos_app/services/global.dart';
import 'package:pos_app/features/reports/data/daily_report_repository.dart';
import 'package:pos_app/features/customers/data/customers_repository.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:pos_app/utils/common_widgets.dart';
import 'package:provider/provider.dart';

import '../../../../services/get_current_user.dart';
import '../../../common_use_pages/common_language_dropdown.dart';
import '../../../manager/presentation/pages/manager_report_page.dart';

class RoleDashboardPage extends StatefulWidget {
  const RoleDashboardPage({super.key});

  @override
  State<RoleDashboardPage> createState() => _RoleDashboardPageState();
}

class _RoleDashboardPageState extends State<RoleDashboardPage> {
  final GlobalKey<ScaffoldState> _drawerKey = GlobalKey<ScaffoldState>();

  String _role = '';
  _RolePage _selected = _RolePage.dashboard;

  @override
  void initState() {
    super.initState();
    _loadRole();
  }

  void _loadRole() async {
    final userProvider = await context.read<UserProvider>();
    setState(() {
      final roleStr = userProvider.role ?? '';
      print(".......point break 5(user actual role value)  - > ${roleStr}");
      _role = _normalizeRole(roleStr);
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
          _MenuItem(_RolePage.employees, Icons.people, 'Employees'),
          _MenuItem(_RolePage.todaySales, Icons.today, "Today's Sales"),
          _MenuItem(_RolePage.alerts, Icons.notifications, 'Alerts'),
          _MenuItem(_RolePage.assets, Icons.storage, 'Assets'),
          _MenuItem(_RolePage.expenses, Icons.receipt_long, 'Expenses'),
          _MenuItem(_RolePage.reports, Icons.bar_chart, 'Reports'),
          _MenuItem(_RolePage.settings, Icons.settings, 'Settings'),
        ];
      case 'manager':
        return const [
          _MenuItem(_RolePage.dashboard, Icons.dashboard, 'Dashboard'),
          _MenuItem(_RolePage.products, Icons.inventory_2, 'Products'),
          _MenuItem(_RolePage.pos, Icons.point_of_sale, 'Point Of Sale'),
          _MenuItem(_RolePage.inventory, Icons.warehouse, 'Inventory'),
          _MenuItem(_RolePage.employees, Icons.people, 'Employees'),
          _MenuItem(_RolePage.todaySales, Icons.today, "Today's Sales"),
          _MenuItem(_RolePage.alerts, Icons.notifications, 'Alerts'),
          _MenuItem(_RolePage.approvals, Icons.checklist, 'Approvals'),
          _MenuItem(_RolePage.assets, Icons.storage, 'Assets'),
        ];
      case 'store_keeper':
        return const [
          _MenuItem(_RolePage.inventory, Icons.warehouse, 'Stock / Inventory'),
          _MenuItem(_RolePage.barcodes, Icons.qr_code, 'Barcode'),
          _MenuItem(_RolePage.alerts, Icons.notifications, 'Alerts'),
        ];
      case 'cashier':
        return const [
          _MenuItem(_RolePage.dashboard, Icons.dashboard, 'Dashboard'),
          _MenuItem(_RolePage.pos, Icons.point_of_sale, 'Point Of Sale'),
          _MenuItem(_RolePage.dailyReport, Icons.library_books, 'Daily Report'),
          _MenuItem(_RolePage.customers, Icons.groups, 'Customers'),
        ];
      default:
        // Unknown/empty role: show minimal dashboard entry so UI doesn't assume cashier
        return const [
          _MenuItem(_RolePage.dashboard, Icons.dashboard, 'Dashboard'),
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
                  color: Colors.blue.shade900,
                ),
        ),
        title: Text(
          _titleForPage(_selected),
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
        ),
        actions: [
          LanguageDropdown(),
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
          return const OwnerPointOfSalesPage();
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
        case _RolePage.settings:
          return const OwnerSettingsPage();
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
        case _RolePage.reports:
          return const ManagerReportPage();
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
          return const OwnerPointOfSalesPage();
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

class CashierDashboardPage extends StatefulWidget {
  const CashierDashboardPage({super.key});

  @override
  State<CashierDashboardPage> createState() => _CashierDashboardPageState();
}

class _CashierDashboardPageState extends State<CashierDashboardPage> {
  final _repo = TodaySalesRepository();
  bool _loading = true;
  String? _error;
  List<dynamic> _items = [];
  int _totalItemsSold = 0;
  double _totalPurchasingCost = 0.0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final payload = await _repo.fetchTodaySales();
      final items = (payload['items'] as List<dynamic>?) ?? [];
      final totalItemsSoldVal = payload['totalItemsSold'] ??
          items.fold<int>(
              0,
              (s, it) =>
                  s +
                  (int.tryParse('${it['qty'] ?? it['quantity'] ?? 0}') ?? 0));

      final totalItemsSold = int.tryParse('${totalItemsSoldVal ?? 0}') ?? 0;
      final totalPurchasingCost = (payload['totalPurchasingCost'] != null)
          ? double.tryParse('${payload['totalPurchasingCost']}') ?? 0.0
          : items.fold<double>(0.0,
              (s, it) => s + ((double.tryParse('${it['total'] ?? 0}') ?? 0.0)));

      setState(() {
        _items = items;
        _totalItemsSold = totalItemsSold;
        _totalPurchasingCost = totalPurchasingCost;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

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

  Widget _buildBarChart() {
    final topItems = _items
        .map((e) => {
              'name': (e['name'] ?? 'Unknown').toString(),
              'total': double.tryParse('${e['total'] ?? 0}') ?? 0.0
            })
        .toList()
      ..sort((a, b) => (b['total'] as double).compareTo(a['total'] as double));

    final data = topItems.take(6).toList();
    final colors = [
      Colors.indigo,
      Colors.cyan,
      Colors.orange,
      Colors.green,
      Colors.red,
      Colors.purple
    ];

    final groups = <BarChartGroupData>[];
    for (int i = 0; i < data.length; i++) {
      final d = data[i];
      groups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: d['total'] as double,
              color: colors[i % colors.length],
              width: 16.w,
            ),
          ],
        ),
      );
    }

    final maxY =
        (data.isNotEmpty ? (data.first['total'] as double) * 1.2 : 10.0);

    return Column(
      children: [
        SizedBox(
          height: 150.h,
          child: Padding(
            padding: EdgeInsets.only(right: 12.w),
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: maxY,
                barTouchData: BarTouchData(enabled: true),
                titlesData: FlTitlesData(
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(showTitles: true, reservedSize: 40),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, meta) {
                        final idx = value.toInt();
                        if (idx < 0 || idx >= data.length)
                          return const SizedBox.shrink();
                        final label = data[idx]['name'] as String;
                        return SideTitleWidget(
                            axisSide: meta.axisSide,
                            child:
                                Text(label, style: TextStyle(fontSize: 10.sp)));
                      },
                    ),
                  ),
                ),
                gridData: FlGridData(show: true),
                borderData: FlBorderData(show: false),
                barGroups: groups,
              ),
            ),
          ),
        ),
        SizedBox(height: 6.h),
        // Legend
        Wrap(
          spacing: 8.w,
          children: List.generate(
            data.length,
            (i) {
              final name = data[i]['name'] as String;
              final col = colors[i % colors.length];
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(width: 10.w, height: 10.h, color: col),
                  SizedBox(width: 6.w),
                  Text(name, style: TextStyle(fontSize: 12.sp)),
                ],
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildPieChart() {
    final topItems = _items
        .map((e) => {
              'name': (e['name'] ?? 'Unknown').toString(),
              'total': double.tryParse('${e['total'] ?? 0}') ?? 0.0
            })
        .toList()
      ..sort((a, b) => (b['total'] as double).compareTo(a['total'] as double));

    final data = topItems.take(6).toList();
    final colors = [
      Colors.indigo,
      Colors.cyan,
      Colors.orange,
      Colors.green,
      Colors.red,
      Colors.purple
    ];
    final totalSum =
        data.fold<double>(0.0, (s, d) => s + (d['total'] as double));

    return Column(
      children: [
        SizedBox(
          height: 120.h,
          child: PieChart(
            PieChartData(
              sections: List.generate(
                data.length,
                (i) {
                  final d = data[i];
                  final value = (d['total'] as double);
                  final percent =
                      totalSum > 0 ? (value / totalSum) * 100.0 : 0.0;
                  return PieChartSectionData(
                    color: colors[i % colors.length],
                    value: value,
                    title: '${percent.toStringAsFixed(0)}%',
                    radius: 36.r,
                    titleStyle: TextStyle(
                        fontSize: 12.sp,
                        fontWeight: FontWeight.bold,
                        color: Colors.white),
                  );
                },
              ),
            ),
          ),
        ),
        SizedBox(height: 8.h),
        Wrap(
          spacing: 10.w,
          runSpacing: 6.h,
          children: List.generate(
            data.length,
            (i) {
              final name = data[i]['name'] as String;
              final col = colors[i % colors.length];
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(width: 10.w, height: 10.h, color: col),
                  SizedBox(width: 6.w),
                  Text(name, style: TextStyle(fontSize: 12.sp)),
                ],
              );
            },
          ),
        ),
      ],
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
    return RefreshIndicator(
      onRefresh: _load,
      child: SingleChildScrollView(
        physics: AlwaysScrollableScrollPhysics(),
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
                        style: TextStyle(
                            fontSize: 12.sp, color: Colors.grey[600])),
                  ],
                ),
                Row(
                  children: [
                    _infoCard(
                        'Items Sold', _loading ? '…' : '$_totalItemsSold'),
                    SizedBox(width: 8.w),
                    _infoCard(
                        'Total Sales',
                        _loading
                            ? '…'
                            : '\$${_totalPurchasingCost.toStringAsFixed(2)}'),
                  ],
                )
              ],
            ),
            SizedBox(height: 12.h),

            // Top items bar chart
            Container(
              height: 220.h,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12.r),
                border: Border.all(color: Colors.grey.shade200),
              ),
              padding: EdgeInsets.all(8.w),
              child: _loading
                  ? Center(child: CircularProgressIndicator())
                  : (_items.isEmpty
                      ? Center(
                          child: Text('No sales yet',
                              style: TextStyle(fontSize: 12.sp)))
                      : _buildBarChart()),
            ),
            SizedBox(height: 12.h),
            // Sales share donut
            Container(
              height: 180.h,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12.r),
                border: Border.all(color: Colors.grey.shade200),
              ),
              padding: EdgeInsets.all(8.w),
              child: _loading
                  ? Center(child: CircularProgressIndicator())
                  : (_items.isEmpty
                      ? Center(child: Text('No data'))
                      : _buildPieChart()),
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

            if (_error != null) ...[
              Card(
                child: Padding(
                  padding: EdgeInsets.all(12.w),
                  child: Column(
                    children: [
                      Text('Failed to load data',
                          style: TextStyle(color: Colors.red)),
                      SizedBox(height: 8.h),
                      Text(_error ?? ''),
                      SizedBox(height: 8.h),
                      OutlinedButton.icon(
                        onPressed: _load,
                        icon: Icon(Icons.refresh),
                        label: Text('Retry'),
                      )
                    ],
                  ),
                ),
              ),
            ] else if (_loading) ...[
              Card(
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10.r)),
                child: Padding(
                  padding: EdgeInsets.all(24.w),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),
            ] else ...[
              Card(
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10.r)),
                child: Column(
                  children: _items.isEmpty
                      ? [
                          Padding(
                            padding: EdgeInsets.all(16.w),
                            child: Text('No items sold today',
                                style: TextStyle(color: Colors.grey[600])),
                          )
                        ]
                      : List<Widget>.from(
                          _items.map((it) {
                            final name = (it['name'] ?? 'Unknown').toString();
                            final qty = int.tryParse(
                                    '${it['qty'] ?? it['quantity'] ?? 0}') ??
                                0;
                            final total =
                                double.tryParse('${it['total'] ?? 0}') ?? 0.0;
                            final img = (it['image'] ?? it['imageUrl'] ?? '')
                                .toString();
                            return Column(
                              children: [
                                ListTile(
                                  leading: img.isNotEmpty
                                      ? CircleAvatar(
                                          backgroundImage: NetworkImage(img))
                                      : CircleAvatar(
                                          backgroundColor: Colors.grey.shade200,
                                          child: Icon(Icons.shopping_bag)),
                                  title: Text(name,
                                      style: TextStyle(fontSize: 14.sp)),
                                  subtitle: Text('Qty: $qty',
                                      style: TextStyle(fontSize: 12.sp)),
                                  trailing: Text(
                                      '\$${total.toStringAsFixed(2)}',
                                      style: TextStyle(
                                          fontSize: 14.sp,
                                          fontWeight: FontWeight.bold)),
                                ),
                                Divider(height: 1.h),
                              ],
                            );
                          }),
                        ),
                ),
              ),
            ],
            SizedBox(height: 20.h),
          ],
        ),
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
  // Read-only daily report driven from backend. Values update automatically.
  final _repo = DailyReportRepository();
  bool _loading = true;
  String? _error;
  double _totalSales = 0.0;
  double _cashReceived = 0.0;
  double _bankTransfer = 0.0;
  double _discountsGiven = 0.0;
  List<dynamic> _sales = [];
  List<dynamic> _submittedReports = [];
  // No automatic polling; Refresh is manual via the Refresh button.

  @override
  void initState() {
    super.initState();
    // load once on init; subsequent refreshes are manual via the Refresh button
    _load();
  }

  @override
  void dispose() {
    // no timer to cancel; simply call super
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final day = DateTime.now().toIso8601String().substring(0, 10);
      final data = await _repo.fetchDailyReport(date: day);
      final sales = await _repo.fetchSales(date: day);
      final reports = await _repo.fetchSubmittedReports(date: day);

      final totalSales = double.tryParse('${data['totalSales'] ?? 0}') ?? 0.0;
      final discounts =
          double.tryParse('${data['discountsTotal'] ?? 0}') ?? 0.0;
      final salesBy = (data['salesByPaymentMethod'] as List<dynamic>?) ?? [];
      final cash = double.tryParse(
              '${salesBy.firstWhere((m) => m['method'] == 'cash', orElse: () => const {})['total'] ?? 0}') ??
          0.0;
      final bank = double.tryParse(
              '${salesBy.firstWhere((m) => m['method'] == 'cbe_bank', orElse: () => const {})['total'] ?? 0}') ??
          0.0;

      setState(() {
        _totalSales = totalSales;
        _discountsGiven = discounts;
        _cashReceived = cash;
        _bankTransfer = bank;
        _sales = sales;
        _submittedReports = reports;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  // previous controller-based dispose removed (page is read-only now)

  @override
  Widget build(BuildContext context) {
    final userProvider = context.watch<UserProvider>();
    final cashierName = userProvider.user?.username;
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
                            Text(cashierName ?? 'Loading',
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

                  if (_error != null)
                    Card(
                      color: Colors.red.shade50,
                      child: Padding(
                        padding: EdgeInsets.all(12.w),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                                child: Text(
                                    'Failed to load daily report: $_error',
                                    style: TextStyle(color: Colors.red))),
                            OutlinedButton(
                                onPressed: _load, child: Text('Retry'))
                          ],
                        ),
                      ),
                    ),

                  // Aggregated totals (read-only; updated from backend)
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
                            Container(
                              height: 44.h,
                              padding: EdgeInsets.symmetric(
                                  horizontal: 12.w, vertical: 10.h),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8.r),
                                border: Border.all(color: Colors.grey.shade300),
                              ),
                              child: _loading
                                  ? Row(children: [
                                      SizedBox(
                                          width: 16.w,
                                          height: 16.h,
                                          child: CircularProgressIndicator(
                                              strokeWidth: 2)),
                                      SizedBox(width: 8.w),
                                      Text('Loading...')
                                    ])
                                  : Text('${_totalSales.toStringAsFixed(2)}'),
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
                            Container(
                              height: 44.h,
                              padding: EdgeInsets.symmetric(
                                  horizontal: 12.w, vertical: 10.h),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8.r),
                                border: Border.all(color: Colors.grey.shade300),
                              ),
                              child: _loading
                                  ? Text('Loading...')
                                  : Text('${_cashReceived.toStringAsFixed(2)}'),
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
                            Container(
                              height: 44.h,
                              padding: EdgeInsets.symmetric(
                                  horizontal: 12.w, vertical: 10.h),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8.r),
                                border: Border.all(color: Colors.grey.shade300),
                              ),
                              child: _loading
                                  ? Text('Loading...')
                                  : Text('${_bankTransfer.toStringAsFixed(2)}'),
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
                            Container(
                              height: 44.h,
                              padding: EdgeInsets.symmetric(
                                  horizontal: 12.w, vertical: 10.h),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8.r),
                                border: Border.all(color: Colors.grey.shade300),
                              ),
                              child: _loading
                                  ? Text('Loading...')
                                  : Text(
                                      '${_discountsGiven.toStringAsFixed(2)}'),
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
                      onPressed: _load,
                      icon: const Icon(Icons.refresh),
                      label: Text('Refresh', style: TextStyle(fontSize: 12.sp)),
                    ),
                  ),

                  SizedBox(height: 12.h),
                  // Transactions list (read-only)
                  Text('Transactions',
                      style: TextStyle(
                          fontSize: 14.sp, fontWeight: FontWeight.w600)),
                  SizedBox(height: 8.h),
                  if (_loading)
                    Center(child: CircularProgressIndicator())
                  else if (_sales.isEmpty)
                    Text('No transactions for today',
                        style: TextStyle(color: Colors.grey[600]))
                  else
                    Column(
                      children: _sales.map((s) {
                        final total =
                            double.tryParse('${s['total'] ?? 0}') ?? 0.0;
                        final method =
                            (s['paymentMethod'] ?? 'unknown').toString();
                        final time = s['date'] != null
                            ? DateTime.parse(s['date']).toLocal()
                            : null;
                        final title = s['receiptId'] ?? s['_id'] ?? '';
                        return Column(
                          children: [
                            ListTile(
                              title: Text(title.toString()),
                              subtitle: Text(
                                  '${method.toUpperCase()} • ${time != null ? time.toIso8601String().split('T').last.split('.').first : ''}'),
                              trailing: Text('${total.toStringAsFixed(2)}',
                                  style:
                                      TextStyle(fontWeight: FontWeight.bold)),
                            ),
                            Divider(height: 1.h),
                          ],
                        );
                      }).toList(),
                    ),

                  SizedBox(height: 12.h),
                  // Submitted reports for managers/owners
                  if (_submittedReports.isNotEmpty &&
                      (roleStr.contains('manager') ||
                          roleStr.contains('owner')))
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Submitted Reports',
                            style: TextStyle(
                                fontSize: 14.sp, fontWeight: FontWeight.w600)),
                        SizedBox(height: 8.h),
                        Column(
                          children: _submittedReports.map((r) {
                            return ListTile(
                              title: Text(r['cashierName'] ?? 'cashier'),
                              subtitle: Text(r['notes'] ?? '-'),
                              trailing:
                                  Text('${(r['totalSales'] ?? 0).toString()}'),
                            );
                          }).toList(),
                        )
                      ],
                    ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Submitted Reports',
                          style: TextStyle(
                              fontSize: 14.sp, fontWeight: FontWeight.w600)),
                      SizedBox(height: 8.h),
                      Column(
                        children: _submittedReports.map((r) {
                          return ListTile(
                            title: Text(r['cashierName'] ?? 'cashier'),
                            subtitle: Text(r['notes'] ?? '-'),
                            trailing:
                                Text('${(r['totalSales'] ?? 0).toString()}'),
                          );
                        }).toList(),
                      )
                    ],
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

  final _repo = CustomersRepository();
  List<dynamic> _customers = [];
  bool _loading = false;
  bool _creating = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadCustomers();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _cityCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCustomers() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await _repo.fetchCustomers();
      setState(() => _customers = list);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _createCustomer() async {
    final name = _nameCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    final city = _cityCtrl.text.trim();
    if (name.isEmpty || phone.isEmpty) return;
    setState(() {
      _creating = true;
    });
    try {
      final created = await _repo.createCustomer(
          name: name, phoneNumber: phone, city: city);
      setState(() {
        _customers.insert(0, created);
        _nameCtrl.clear();
        _phoneCtrl.clear();
        _cityCtrl.clear();
      });
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Customer added')));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to add customer: ${e.toString()}')));
    } finally {
      setState(() {
        _creating = false;
      });
    }
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
            child: Column(
              children: [
                TextField(
                  controller: _nameCtrl,
                  decoration: InputDecoration(hintText: 'Name'),
                ),
                SizedBox(height: 8.h),
                TextField(
                  controller: _phoneCtrl,
                  decoration: InputDecoration(hintText: 'Phone number'),
                  keyboardType: TextInputType.phone,
                ),
                SizedBox(height: 8.h),
                TextField(
                  controller: _cityCtrl,
                  decoration: InputDecoration(hintText: 'City'),
                ),
                SizedBox(height: 12.h),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _creating ? null : _createCustomer,
                    style: ElevatedButton.styleFrom(
                      padding: EdgeInsets.symmetric(
                          horizontal: 16.w, vertical: 14.h),
                    ),
                    child: _creating
                        ? SizedBox(
                            height: 16.h,
                            width: 16.w,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : Text('Add Customer',
                            style: TextStyle(fontSize: 14.sp)),
                  ),
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Your Customers',
                          style: TextStyle(
                              fontSize: 16.sp, fontWeight: FontWeight.w600)),
                      OutlinedButton.icon(
                        onPressed: _loadCustomers,
                        icon: Icon(Icons.refresh, size: 16.h),
                        label:
                            Text('Refresh', style: TextStyle(fontSize: 12.sp)),
                      )
                    ],
                  ),
                  SizedBox(height: 12.h),
                  if (_loading)
                    Padding(
                      padding: EdgeInsets.all(16.w),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (_error != null)
                    Padding(
                      padding: EdgeInsets.all(12.w),
                      child: Text('Failed to load customers: $_error',
                          style: TextStyle(color: Colors.red)),
                    )
                  else if (_customers.isEmpty)
                    Padding(
                      padding: EdgeInsets.all(12.w),
                      child: Text('No customers yet',
                          style: TextStyle(color: Colors.grey[600])),
                    )
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: NeverScrollableScrollPhysics(),
                      itemCount: _customers.length,
                      separatorBuilder: (_, __) => Divider(height: 1.h),
                      itemBuilder: (context, index) {
                        final c = _customers[index] as Map<String, dynamic>;
                        final name = (c['name'] ?? '').toString();
                        final phone =
                            (c['phoneNumber'] ?? c['phone'] ?? '').toString();
                        final city = (c['city'] ?? '').toString();
                        return Padding(
                          padding: EdgeInsets.symmetric(vertical: 8.h),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(name,
                                  style: TextStyle(
                                      fontSize: 14.sp,
                                      fontWeight: FontWeight.w600)),
                              SizedBox(height: 4.h),
                              Text('$phone • $city',
                                  style: TextStyle(
                                      fontSize: 12.sp,
                                      color: Colors.grey[600])),
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
