import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class OwnerDashboardPage extends StatefulWidget {
  const OwnerDashboardPage({super.key});

  @override
  State<OwnerDashboardPage> createState() => _OwnerDashboardPageState();
}

class _OwnerDashboardPageState extends State<OwnerDashboardPage> {
  _SalesPeriod _period = _SalesPeriod.weekly;

  @override
  Widget build(BuildContext context) {
    final stats = _mockOwnerStats();
    final sales = _mockSales(_period);
    final topProducts = _mockTopProducts();

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final isWide = width >= 1000;

        return SingleChildScrollView(
          padding: EdgeInsets.all(16.0.w),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _HeaderRow(),
              SizedBox(height: 16.0.h),
              _StatsGrid(stats: stats),
              SizedBox(height: 16.0.h),
              if (isWide)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: _WeeklySalesCard(
                        period: _period,
                        onPeriodChanged: (p) => setState(() => _period = p),
                        series: sales,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _TopSellingCard(products: topProducts),
                    ),
                  ],
                )
              else ...[
                _WeeklySalesCard(
                  period: _period,
                  onPeriodChanged: (p) => setState(() => _period = p),
                  series: sales,
                ),
                SizedBox(height: 16.0.h),
                _TopSellingCard(products: topProducts),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _HeaderRow extends StatelessWidget {
  const _HeaderRow();

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 650;

        final title = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Dashboard',
              style: TextStyle(fontSize: 28.0.sp, fontWeight: FontWeight.w700),
            ),
            SizedBox(height: 4.0.h),
            Text(
              "Welcome back! Here's what's happening today.",
              style: TextStyle(fontSize: 14.0.sp, color: Colors.grey.shade700),
            ),
          ],
        );

        final actions = const SizedBox.shrink();

        if (isNarrow) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              title,
              SizedBox(height: 12.0.h),
              actions,
            ],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: title),
            actions,
          ],
        );
      },
    );
  }
}

class _StatsGrid extends StatelessWidget {
  final _OwnerStats stats;

  const _StatsGrid({required this.stats});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final columns = width >= 1200
            ? 4
            : width >= 900
                ? 2
                : 1;

        final cards = [
          _StatCard(
            title: "Today's Sales",
            value: '${stats.todaySalesEtb.toStringAsFixed(0)} ETB',
            deltaText: '+${stats.salesDeltaPct.toStringAsFixed(1)}%',
            deltaUp: true,
            icon: Icons.attach_money,
            iconBg: Colors.blue.shade50,
            iconFg: Colors.blue.shade900,
          ),
          _StatCard(
            title: 'Alerts',
            value: '${stats.alerts}',
            deltaText: '${stats.productsLowStock} low/exp',
            deltaUp: false,
            icon: Icons.notifications,
            iconBg: Colors.orange.shade50,
            iconFg: Colors.orange.shade800,
          ),
          _StatCard(
            title: 'Assets',
            value: '${stats.assets}',
            deltaText: '',
            deltaUp: true,
            icon: Icons.shopping_bag_outlined,
            iconBg: Colors.purple.shade50,
            iconFg: Colors.purple.shade800,
          ),
          _StatCard(
            title: 'Transactions',
            value: '${stats.transactions}',
            deltaText: '+${stats.transactionsDeltaPct.toStringAsFixed(1)}%',
            deltaUp: true,
            icon: Icons.shopping_cart_outlined,
            iconBg: Colors.green.shade50,
            iconFg: Colors.green.shade800,
          ),
          _StatCard(
            title: 'Products',
            value: '${stats.products}',
            deltaText: '${stats.productsLowStock} low/exp',
            deltaUp: false,
            icon: Icons.inventory_2_outlined,
            iconBg: Colors.orange.shade50,
            iconFg: Colors.orange.shade800,
          ),
          _StatCard(
            title: 'Profit',
            value: '${stats.profitEtb.toStringAsFixed(0)} ETB',
            deltaText: '+${stats.profitDeltaPct.toStringAsFixed(1)}%',
            deltaUp: true,
            icon: Icons.show_chart,
            iconBg: Colors.purple.shade50,
            iconFg: Colors.purple.shade800,
          ),
        ];

        return GridView.count(
          crossAxisCount: columns,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 16.0.w,
          mainAxisSpacing: 16.0.h,
          childAspectRatio: columns >= 2 ? 3.2 : 2.8,
          children: cards,
        );
      },
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final String deltaText;
  final bool deltaUp;
  final IconData icon;
  final Color iconBg;
  final Color iconFg;

  const _StatCard({
    required this.title,
    required this.value,
    required this.deltaText,
    required this.deltaUp,
    required this.icon,
    required this.iconBg,
    required this.iconFg,
  });

  @override
  Widget build(BuildContext context) {
    final deltaColor = deltaUp ? Colors.green.shade700 : Colors.red.shade700;

    return Container(
      padding: EdgeInsets.symmetric(vertical: 8.0.h, horizontal: 12.0.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16.0.r),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(title,
                    style: TextStyle(
                        fontSize: 14.0.sp, color: Colors.grey.shade700)),
                SizedBox(height: 8.0.h),
                FittedBox(
                    alignment: Alignment.centerLeft,
                    fit: BoxFit.scaleDown,
                    child: Text(value,
                        style: TextStyle(
                            fontSize: 22.0.sp, fontWeight: FontWeight.w800))),
                SizedBox(height: 4.0.h),
                Text(deltaText,
                    style: TextStyle(
                        fontSize: 12.0.sp,
                        color: deltaColor,
                        fontWeight: FontWeight.w700)),
              ],
            ),
          ),
          SizedBox(width: 12.0.w),
          Container(
            width: 44.0.w,
            height: 44.0.h,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(14.0.r),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Icon(icon, color: iconFg, size: 24.0.sp),
          ),
        ],
      ),
    );
  }
}

class _WeeklySalesCard extends StatelessWidget {
  final _SalesPeriod period;
  final ValueChanged<_SalesPeriod> onPeriodChanged;
  final List<double> series;

  const _WeeklySalesCard({
    required this.period,
    required this.onPeriodChanged,
    required this.series,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Weekly Sales',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          _PeriodTabs(period: period, onChanged: onPeriodChanged),
          const SizedBox(height: 12),
          SizedBox(
            height: 240,
            width: double.infinity,
            child: CustomPaint(
              painter: _LineChartPainter(
                  values: series, lineColor: Colors.blue.shade900),
            ),
          ),
        ],
      ),
    );
  }
}

class _TopSellingCard extends StatelessWidget {
  final List<_TopProduct> products;

  const _TopSellingCard({required this.products});

  @override
  Widget build(BuildContext context) {
    final maxV =
        products.isEmpty ? 1.0 : products.map((p) => p.value).reduce(math.max);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Top Selling Products',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          SizedBox(
            height: 240,
            width: double.infinity,
            child: CustomPaint(
              painter: _BarChartPainter(
                items: products,
                maxValue: maxV,
                barColor: Colors.blue.shade900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PeriodTabs extends StatelessWidget {
  final _SalesPeriod period;
  final ValueChanged<_SalesPeriod> onChanged;

  const _PeriodTabs({required this.period, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    Widget chip(String label, _SalesPeriod value) {
      final selected = period == value;
      return ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onChanged(value),
        selectedColor: Colors.blue.shade900,
        labelStyle: TextStyle(
          color: selected ? Colors.white : Colors.grey.shade800,
          fontWeight: FontWeight.w700,
        ),
        backgroundColor: Colors.grey.shade100,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      );
    }

    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        chip('Daily', _SalesPeriod.daily),
        chip('Weekly', _SalesPeriod.weekly),
        chip('Monthly', _SalesPeriod.monthly),
      ],
    );
  }
}

class _LineChartPainter extends CustomPainter {
  final List<double> values;
  final Color lineColor;

  _LineChartPainter({required this.values, required this.lineColor});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = lineColor
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke;

    final gridPaint = Paint()
      ..color = Colors.grey.shade300
      ..strokeWidth = 1;

    // grid
    const gridLines = 4;
    for (int i = 0; i <= gridLines; i++) {
      final y = (size.height / gridLines) * i;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    if (values.length < 2) return;

    final minV = values.reduce(math.min);
    final maxV = values.reduce(math.max);
    final range = (maxV - minV).abs() < 0.0001 ? 1.0 : (maxV - minV);

    final path = Path();
    for (int i = 0; i < values.length; i++) {
      final x = (size.width / (values.length - 1)) * i;
      final norm = (values[i] - minV) / range;
      final y = size.height - (norm * (size.height - 12)) - 6;

      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    canvas.drawPath(path, paint);

    // points
    final dotPaint = Paint()..color = lineColor;
    for (int i = 0; i < values.length; i++) {
      final x = (size.width / (values.length - 1)) * i;
      final norm = (values[i] - minV) / range;
      final y = size.height - (norm * (size.height - 12)) - 6;
      canvas.drawCircle(Offset(x, y), 3.2, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _LineChartPainter oldDelegate) {
    return oldDelegate.values != values || oldDelegate.lineColor != lineColor;
  }
}

class _BarChartPainter extends CustomPainter {
  final List<_TopProduct> items;
  final double maxValue;
  final Color barColor;

  _BarChartPainter({
    required this.items,
    required this.maxValue,
    required this.barColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = Colors.grey.shade300
      ..strokeWidth = 1;

    // vertical grid lines
    const gridLines = 4;
    for (int i = 0; i <= gridLines; i++) {
      final x = (size.width / gridLines) * i;
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }

    if (items.isEmpty) return;

    final barPaint = Paint()..color = barColor;
    final textPainter = TextPainter(textDirection: TextDirection.ltr);

    final rowH = size.height / items.length;
    final barH = math.min(44.0, rowH * 0.65);

    for (int i = 0; i < items.length; i++) {
      final item = items[i];
      final yCenter = (rowH * i) + (rowH / 2);
      final yTop = yCenter - (barH / 2);

      final barW =
          (item.value / (maxValue <= 0 ? 1 : maxValue)) * (size.width - 90);
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(90, yTop, math.max(8, barW), barH),
        const Radius.circular(10),
      );
      canvas.drawRRect(rect, barPaint);

      textPainter.text = TextSpan(
        text: item.label,
        style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade800,
            fontWeight: FontWeight.w600),
      );
      textPainter.layout(maxWidth: 85);
      textPainter.paint(canvas, Offset(0, yCenter - (textPainter.height / 2)));
    }
  }

  @override
  bool shouldRepaint(covariant _BarChartPainter oldDelegate) {
    return oldDelegate.items != items ||
        oldDelegate.maxValue != maxValue ||
        oldDelegate.barColor != barColor;
  }
}

enum _SalesPeriod { daily, weekly, monthly }

class _OwnerStats {
  final double todaySalesEtb;
  final double salesDeltaPct;
  final int transactions;
  final double transactionsDeltaPct;
  final int products;
  final int productsLowStock;
  final double profitEtb;
  final double profitDeltaPct;
  final int alerts;
  final int assets;

  const _OwnerStats({
    required this.todaySalesEtb,
    required this.salesDeltaPct,
    required this.transactions,
    required this.transactionsDeltaPct,
    required this.products,
    required this.productsLowStock,
    required this.profitEtb,
    required this.profitDeltaPct,
    required this.alerts,
    required this.assets,
  });
}

class _TopProduct {
  final String label;
  final double value;

  const _TopProduct({required this.label, required this.value});
}

_OwnerStats _mockOwnerStats() {
  return const _OwnerStats(
    todaySalesEtb: 8292,
    salesDeltaPct: 12.5,
    transactions: 6,
    transactionsDeltaPct: 8.2,
    products: 8,
    productsLowStock: 3,
    profitEtb: 5592,
    profitDeltaPct: 5.3,
    alerts: 2,
    assets: 12,
  );
}

List<double> _mockSales(_SalesPeriod period) {
  switch (period) {
    case _SalesPeriod.daily:
      return const [1200, 1800, 900, 2200, 1600, 1400, 2100];
    case _SalesPeriod.weekly:
      return const [0, 4500, 0, 0, 0, 3200, 0];
    case _SalesPeriod.monthly:
      return const [
        800,
        1200,
        1600,
        900,
        1400,
        1800,
        1500,
        2100,
        1700,
        2300,
        1900,
        2500
      ];
  }
}

List<_TopProduct> _mockTopProducts() {
  return const [
    _TopProduct(label: 'Blue Magic', value: 7.2),
    _TopProduct(label: 'coca', value: 5.0),
  ];
}

void _toast(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
}
