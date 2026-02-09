import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'report_widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../presentation/bloc/owner_bloc.dart';
import '../../../manager/domain/payment_model.dart' as mgr_models;

// 1. Header Section
class ReportHeader extends StatelessWidget {
  final String title;
  final String dateRange;
  final VoidCallback onExportExcel;
  final VoidCallback onExportPdf;

  const ReportHeader({
    super.key,
    required this.title,
    required this.dateRange,
    required this.onExportExcel,
    required this.onExportPdf,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                      fontSize: 24.sp,
                      fontWeight: FontWeight.w800,
                      height: 1.2),
                ),
                SizedBox(height: 4.h),
                Text(
                  dateRange,
                  style:
                      TextStyle(fontSize: 12.sp, color: Colors.grey.shade600),
                ),
              ],
            ),
            // Hide buttons on very small screens, or turn into popup menu
            if (ScreenUtil().screenWidth > 400)
              Row(
                children: [
                  _IconBtn(
                      Icons.table_chart_outlined, Colors.green, onExportExcel),
                  SizedBox(width: 8.w),
                  _IconBtn(
                      Icons.picture_as_pdf_outlined, Colors.red, onExportPdf),
                ],
              )
          ],
        ),
      ],
    );
  }

  Widget _IconBtn(IconData icon, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.all(8.r),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8.r),
        ),
        child: Icon(icon, color: color, size: 20.sp),
      ),
    );
  }
}

// 2. Stats Grid (Responsive)
class StatsGrid extends StatelessWidget {
  final String totalSales;
  final String totalOrders;
  final String avgOrder;
  final String grossProfit;

  const StatsGrid({
    super.key,
    required this.totalSales,
    required this.totalOrders,
    required this.avgOrder,
    required this.grossProfit,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: ScreenUtil().screenWidth > 600 ? 4 : 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12.w,
      mainAxisSpacing: 12.h,
      childAspectRatio: ScreenUtil().screenWidth > 600 ? 2.5 : 1.6,
      children: [
        StatCard(
            title: 'Total Sales',
            value: totalSales,
            icon: Icons.attach_money,
            iconColor: Colors.green),
        StatCard(
            title: 'Orders',
            value: totalOrders,
            icon: Icons.shopping_bag_outlined,
            iconColor: Colors.blue),
        StatCard(
            title: 'Avg Order',
            value: avgOrder,
            icon: Icons.analytics_outlined,
            iconColor: Colors.orange),
        StatCard(
            title: 'Profit',
            value: grossProfit,
            icon: Icons.trending_up,
            iconColor: Colors.purple),
      ],
    );
  }
}

// 3. Payment Methods Pie Chart Section
class PaymentMethodsSection extends StatelessWidget {
  const PaymentMethodsSection({super.key});

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Payment Methods',
                  style:
                      TextStyle(fontSize: 16.sp, fontWeight: FontWeight.w700)),
              Icon(Icons.more_horiz, color: Colors.grey, size: 20.sp),
            ],
          ),
          SizedBox(height: 20.h),
          SizedBox(
            height: 180.h,
            width: 180.h,
            child:
                BlocBuilder<OwnerBloc, OwnerState>(builder: (context, state) {
              final pm = state.paymentMethods.cast<mgr_models.PaymentMethod>();

              if (state.loading || pm.isEmpty) {
                // Fallback to placeholder
                return CustomPaint(
                  painter: PieChartPainter(
                    values: [0.6, 0.25, 0.15],
                    colors: const [
                      Color(0xFF1677FF),
                      Color(0xFF10B981),
                      Color(0xFFF59E0B)
                    ],
                  ),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text("Total",
                            style:
                                TextStyle(fontSize: 12.sp, color: Colors.grey)),
                        Text("\$360",
                            style: TextStyle(
                                fontSize: 18.sp, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                );
              }

              final total = pm.fold<double>(0, (p, e) => p + e.amount);
              final values =
                  pm.map((e) => total == 0 ? 0.0 : (e.amount / total)).toList();
              final colors = pm.map((e) => e.color).toList();

              return CustomPaint(
                painter: PieChartPainter(values: values, colors: colors),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text("Total",
                          style:
                              TextStyle(fontSize: 12.sp, color: Colors.grey)),
                      Text("\$${state.totalSales.toStringAsFixed(2)}",
                          style: TextStyle(
                              fontSize: 18.sp, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              );
            }),
          ),
          SizedBox(height: 20.h),
          // Legend
          BlocBuilder<OwnerBloc, OwnerState>(builder: (context, state) {
            final pm = state.paymentMethods.cast<mgr_models.PaymentMethod>();
            if (pm.isEmpty) {
              return Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: const [
                  _LegendItem(color: Color(0xFF1677FF), label: 'Cash'),
                  _LegendItem(color: Color(0xFF10B981), label: 'Card'),
                  _LegendItem(color: Color(0xFFF59E0B), label: 'Mobile'),
                ],
              );
            }

            return Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: pm
                  .map((e) => _LegendItem(color: e.color, label: e.name))
                  .toList(),
            );
          })
        ],
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(radius: 4.r, backgroundColor: color),
        SizedBox(width: 6.w),
        Text(label,
            style: TextStyle(fontSize: 12.sp, color: Colors.grey.shade700)),
      ],
    );
  }
}

class TopSellingProductsSection extends StatelessWidget {
  const TopSellingProductsSection({super.key});

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Top Products',
                style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.w700),
              ),
              // Optional: Revenue Label
              Row(
                children: [
                  Container(
                    width: 10.w,
                    height: 10.w,
                    decoration: BoxDecoration(
                      color: Theme.of(context).primaryColor,
                      borderRadius: BorderRadius.circular(2.r),
                    ),
                  ),
                  SizedBox(width: 6.w),
                  Text(
                    'Revenue',
                    style: TextStyle(
                      fontSize: 12.sp,
                      color: Colors.grey.shade600,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              )
            ],
          ),

          SizedBox(height: 24.h),

          // The Chart Area
          SizedBox(
            height: 180.h,
            child: const _BarChartBody(),
          ),
        ],
      ),
    );
  }
}

class _BarChartBody extends StatelessWidget {
  const _BarChartBody();

  @override
  Widget build(BuildContext context) {
    // Use bloc state to populate bars
    return BlocBuilder<OwnerBloc, OwnerState>(builder: (context, state) {
      final products = state.topProducts.cast<mgr_models.TopProduct>();

      if (state.loading || products.isEmpty) {
        return Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: const [
            // Example Bars (fallback)
            _SingleBar(
                label: 'Oil', percentage: 0.85, color: Color(0xFF1677FF)),
            _SingleBar(
                label: 'Bread', percentage: 0.45, color: Color(0xFF1677FF)),
            _SingleBar(
                label: 'Milk', percentage: 0.65, color: Color(0xFF1677FF)),
            _SingleBar(
                label: 'Water', percentage: 0.30, color: Color(0xFF1677FF)),
            _SingleBar(
                label: 'Eggs', percentage: 0.55, color: Color(0xFF1677FF)),
          ],
        );
      }

      // Normalize by revenue (or sold if revenue not present)
      final maxVal = products
          .map((p) => (p.revenue ?? 0))
          .fold<double>(0, (prev, e) => e > prev ? e : prev);
      final list = products.take(5).toList();

      return Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: list.map((p) {
          final val = (p.revenue ?? 0);
          final pct = maxVal <= 0 ? 0.0 : (val / maxVal).clamp(0.0, 1.0);
          return _SingleBar(
              label: (p.name ?? 'N/A'),
              percentage: pct,
              color: Theme.of(context).primaryColor);
        }).toList(),
      );
    });
  }
}

class _SingleBar extends StatelessWidget {
  final String label;
  final double percentage; // 0.0 to 1.0
  final Color color;

  const _SingleBar({
    required this.label,
    required this.percentage,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        // The Bar Logic
        Expanded(
          child: Stack(
            alignment: Alignment.bottomCenter,
            children: [
              // Background track (optional, makes it look more modern)
              Container(
                width: 12.w, // Bar width
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(6.r),
                ),
              ),
              // The Actual Filled Bar
              FractionallySizedBox(
                heightFactor: percentage,
                child: Container(
                  width: 12.w,
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(6.r),
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [
                        color.withOpacity(0.8),
                        color,
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        SizedBox(height: 8.h),
        // The Label
        Text(
          label,
          style: TextStyle(
            fontSize: 11.sp,
            color: Colors.grey.shade600,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
