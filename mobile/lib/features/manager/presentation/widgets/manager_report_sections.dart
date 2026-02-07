import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

import '../../domain/payment_model.dart';
import 'manager_report_widgets.dart';

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

  const StatsGrid({
    super.key,
    required this.totalSales,
    required this.totalOrders,
    required this.avgOrder,
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
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;

  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title,
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.w700,
            )),
        Icon(Icons.more_horiz, color: Colors.grey, size: 20.sp),
      ],
    );
  }
}

// 3. Payment Methods Pie Chart Section
class PaymentMethodsSection extends StatelessWidget {
  final List<PaymentMethod> methods;

  const PaymentMethodsSection({
    super.key,
    required this.methods,
  });

  @override
  Widget build(BuildContext context) {
    final total = methods.fold<double>(
      0,
      (sum, item) => sum + item.amount,
    );

    final values = methods.map((e) => e.amount / total).toList();
    final colors = methods.map((e) => e.color).toList();

    return SurfaceCard(
      child: Column(
        children: [
          _SectionHeader(title: 'Payment Methods'),
          SizedBox(height: 20.h),
          SizedBox(
            height: 180.h,
            width: 180.h,
            child: CustomPaint(
              painter: PieChartPainter(
                values: values,
                colors: colors,
              ),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text("Total",
                        style: TextStyle(fontSize: 12.sp, color: Colors.grey)),
                    Text("\$${total.toStringAsFixed(0)}",
                        style: TextStyle(
                            fontSize: 18.sp, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
          ),
          SizedBox(height: 20.h),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: methods
                .map((e) => _LegendItem(
                      color: e.color,
                      label: e.name,
                    ))
                .toList(),
          )
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
  final List<TopProduct> products;

  const TopSellingProductsSection({
    super.key,
    required this.products,
  });

  @override
  Widget build(BuildContext context) {
    final maxRevenue =
    products.map((e) => e.revenue).reduce((a, b) => a! > b! ? a : b);

    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _SectionHeader(title: 'Top Products'),

          SizedBox(height: 24.h),

          SizedBox(
            height: 180.h,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: products.map((product) {
                final percentage = product.revenue! / maxRevenue!;

                return _SingleBar(
                  label: product.name?? '',
                  percentage: percentage,
                  color: Theme.of(context).primaryColor,
                );
              }).toList(),
            ),
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
    // We use a Row to distribute bars evenly
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: const [
        // Example Bars (You can map these from a list later)
        _SingleBar(label: 'Oil', percentage: 0.85, color: Color(0xFF1677FF)),
        _SingleBar(label: 'Bread', percentage: 0.45, color: Color(0xFF1677FF)),
        _SingleBar(label: 'Milk', percentage: 0.65, color: Color(0xFF1677FF)),
        _SingleBar(label: 'Water', percentage: 0.30, color: Color(0xFF1677FF)),
        _SingleBar(label: 'Eggs', percentage: 0.55, color: Color(0xFF1677FF)),
      ],
    );
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
