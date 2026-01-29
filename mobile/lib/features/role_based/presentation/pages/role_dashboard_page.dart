import 'package:flutter/material.dart';
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
import 'package:pos_app/features/manager/presentation/pages/manager_pos_page.dart';
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
      _selected =
          _role == 'store_keeper' ? _RolePage.inventory : _RolePage.dashboard;
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
          _MenuItem(_RolePage.todaySales, Icons.today, "Today's Sales"),
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
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 2),
                child: commonDrawerWidget(
                  icon: item.icon,
                  text: item.label,
                  isClicked: _selected == item.page,
                  onTap: () {
                    setState(() => _selected = item.page);
                    Navigator.pop(context);
                  },
                ),
              ),
            )
            .toList(),
      ),
      appBar: AppBar(
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
              : Image.asset('assets/icons/hamburger.png'),
        ),
        title: Text(_titleForPage(_selected)),
        actions: [
          IconButton(
            tooltip: 'Logout',
            onPressed: () {
              Global.storageServices.setDeviceOpenedFirst(false);
              LogoutShowDialogue(context);
            },
            icon: const Icon(Icons.logout_outlined),
          ),
          const SizedBox(width: 8),
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
          return const ManagerPosPage();
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

class _RolePlaceholderPage extends StatelessWidget {
  final String title;
  final String subtitle;

  const _RolePlaceholderPage({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.layers, size: 64, color: Colors.grey.shade600),
            const SizedBox(height: 16),
            Text(
              title,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green.shade100),
              ),
              child: const Text(
                'Note: These pages are placeholders (cashier-style)\nso you can wire real UI later.',
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
