import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../domain/manager_model.dart';
import '../widgets/dashboard_header.dart';
import '../widgets/dashboard_stats_grid.dart';
import '../widgets/sales_chart_card.dart';
import '../widgets/top_products_card.dart';

class ManagerDashboardPage extends StatefulWidget {
  const ManagerDashboardPage({super.key});

  @override
  State<ManagerDashboardPage> createState() => _ManagerDashboardPageState();
}

class _ManagerDashboardPageState extends State<ManagerDashboardPage> {
  // This state will move to your Bloc later
  SalesPeriod _period = SalesPeriod.weekly;

  @override
  Widget build(BuildContext context) {
    // These mock calls will be replaced by state.stats, state.products, etc.
    final stats = mockOwnerStats();
    final sales = mockSales(_period);
    final topProducts = mockTopProducts();

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FD),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            final isWide = width >= 1000;

            return SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                horizontal: width > 600 ? 32.w : 16.w,
                vertical: 24.h,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DashboardHeader(
                    onInvite: () => _toast(context, 'Invite Owner'),
                    onRegister: () => _toast(context, 'Register Mart'),
                  ),
                  SizedBox(height: 32.h),

                  // Stats Grid
                  DashboardStatsGrid(stats: stats),

                  SizedBox(height: 32.h),

                  // Charts and Top Products
                  if (isWide)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          flex: 2,
                          child: SalesChartCard(
                            period: _period,
                            data: sales,
                            onPeriodChanged: (p) => setState(() => _period = p),
                          ),
                        ),
                        const SizedBox(width: 24),
                        Expanded(
                          flex: 1,
                          child: TopProductsCard(products: topProducts),
                        ),
                      ],
                    )
                  else ...[
                    SalesChartCard(
                      period: _period,
                      data: sales,
                      onPeriodChanged: (p) => setState(() => _period = p),
                    ),
                    const SizedBox(height: 24),
                    TopProductsCard(products: topProducts),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  void _toast(BuildContext context, String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }
}
