import 'dart:math' as math;
import 'dart:ui' as ui;
import 'package:flutter/material.dart';

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

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FD),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          final isDesktop = width >= 1100;
          final isTablet = width >= 700 && width < 1100;

          return SingleChildScrollView(
            padding: EdgeInsets.symmetric(
              horizontal: width > 600 ? 32 : 16,
              vertical: 24,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ModernHeader(
                  onInvite: () => _toast(context, 'Invite Owner'),
                  onRegister: () => _toast(context, 'Register Mart'),
                ),
                const SizedBox(height: 32),
                _StatsGrid(stats: stats, isDesktop: isDesktop, isTablet: isTablet),
                const SizedBox(height: 32),
                if (isDesktop)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 2,
                        child: _SalesChartCard(
                          period: _period,
                          data: sales,
                          onPeriodChanged: (p) => setState(() => _period = p),
                        ),
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        flex: 1,
                        child: _TopProductsCard(products: topProducts),
                      ),
                    ],
                  )
                else ...[
                  _SalesChartCard(
                    period: _period,
                    data: sales,
                    onPeriodChanged: (p) => setState(() => _period = p),
                  ),
                  const SizedBox(height: 24),
                  _TopProductsCard(products: topProducts),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  void _toast(BuildContext context, String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }
}

class _ModernHeader extends StatelessWidget {
  final VoidCallback onInvite;
  final VoidCallback onRegister;

  const _ModernHeader({required this.onInvite, required this.onRegister});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final isSmall = constraints.maxWidth < 600;

      final textSection = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Overview',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1A1D1E),
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            "Here's what's happening with your store today.",
            style: TextStyle(
              fontSize: 15,
              color: Colors.grey.shade600,
              height: 1.4,
            ),
          ),
        ],
      );

      final buttons = Row(
        children: [
          _ActionButton(
            label: 'Invite',
            icon: Icons.person_add_alt_1_rounded,
            isPrimary: false,
            onTap: onInvite,
          ),
          const SizedBox(width: 12),
          _ActionButton(
            label: 'New Mart',
            icon: Icons.store_rounded,
            isPrimary: true,
            onTap: onRegister,
          ),
        ],
      );

      if (isSmall) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [textSection, const SizedBox(height: 20), buttons],
        );
      }

      return Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [textSection, buttons],
      );
    });
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isPrimary;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.isPrimary,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 48,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        decoration: BoxDecoration(
          color: isPrimary ? const Color(0xFF0F172A) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: isPrimary ? null : Border.all(color: Colors.grey.shade300),
          boxShadow: isPrimary
              ? [
            BoxShadow(
              color: const Color(0xFF0F172A).withOpacity(0.2),
              blurRadius: 12,
              offset: const Offset(0, 4),
            )
          ]
              : null,
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 18,
              color: isPrimary ? Colors.white : const Color(0xFF0F172A),
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
                color: isPrimary ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  final _OwnerStats stats;
  final bool isDesktop;
  final bool isTablet;

  const _StatsGrid({
    required this.stats,
    required this.isDesktop,
    required this.isTablet,
  });

  @override
  Widget build(BuildContext context) {
    final cards = [
      _StatData(
        title: "Total Revenue",
        value: "${stats.todaySalesEtb.toInt()}",
        suffix: "ETB",
        trend: "+${stats.salesDeltaPct}%",
        isTrendUp: true,
        icon: Icons.payments_rounded,
        color: const Color(0xFF6366F1),
      ),
      _StatData(
        title: "Transactions",
        value: "${stats.transactions}",
        trend: "+${stats.transactionsDeltaPct}%",
        isTrendUp: true,
        icon: Icons.receipt_long_rounded,
        color: const Color(0xFF10B981),
      ),
      _StatData(
        title: "Net Profit",
        value: "${stats.profitEtb.toInt()}",
        suffix: "ETB",
        trend: "+${stats.profitDeltaPct}%",
        isTrendUp: true,
        icon: Icons.pie_chart_rounded,
        color: const Color(0xFFF59E0B),
      ),
      _StatData(
        title: "Active Alerts",
        value: "${stats.alerts}",
        trend: "Action needed",
        isTrendUp: false,
        icon: Icons.notifications_active_rounded,
        color: const Color(0xFFEF4444),
      ),
    ];

    int crossAxisCount = 1;
    if (isDesktop) crossAxisCount = 4;
    else if (isTablet) crossAxisCount = 2;

    return Wrap(
      spacing: 16,
      runSpacing: 16,
      children: cards.map((data) {
        final w = isDesktop
            ? (MediaQuery.of(context).size.width - 64 - (16 * 3)) / 4
            : isTablet
            ? (MediaQuery.of(context).size.width - 64 - 16) / 2
            : double.infinity;

        return SizedBox(
          width: w,
          child: _StatCard(data: data),
        );
      }).toList(),
    );
  }
}

class _StatData {
  final String title;
  final String value;
  final String? suffix;
  final String trend;
  final bool isTrendUp;
  final IconData icon;
  final Color color;

  _StatData({
    required this.title,
    required this.value,
    this.suffix,
    required this.trend,
    required this.isTrendUp,
    required this.icon,
    required this.color,
  });
}

class _StatCard extends StatelessWidget {
  final _StatData data;

  const _StatCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.06),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: data.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(data.icon, color: data.color, size: 20),
              ),
              _TrendBadge(text: data.trend, isUp: data.isTrendUp),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            data.title,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade500,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                data.value,
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF1E293B),
                ),
              ),
              if (data.suffix != null) ...[
                const SizedBox(width: 4),
                Text(
                  data.suffix!,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey.shade400,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _TrendBadge extends StatelessWidget {
  final String text;
  final bool isUp;

  const _TrendBadge({required this.text, required this.isUp});

  @override
  Widget build(BuildContext context) {
    final color = isUp ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isUp ? Icons.trending_up_rounded : Icons.trending_down_rounded,
            size: 14,
            color: color,
          ),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _SalesChartCard extends StatelessWidget {
  final _SalesPeriod period;
  final List<double> data;
  final ValueChanged<_SalesPeriod> onPeriodChanged;

  const _SalesChartCard({
    required this.period,
    required this.data,
    required this.onPeriodChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 400,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.06),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Sales Analytics',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1E293B),
                ),
              ),
              _ModernTabs(
                selected: period,
                onChanged: onPeriodChanged,
              ),
            ],
          ),
          const SizedBox(height: 32),
          Expanded(
            child: CustomPaint(
              size: Size.infinite,
              painter: _SmoothChartPainter(
                values: data,
                color: const Color(0xFF6366F1),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TopProductsCard extends StatelessWidget {
  final List<_TopProduct> products;

  const _TopProductsCard({required this.products});

  @override
  Widget build(BuildContext context) {
    final maxVal = products.fold<double>(0, (p, c) => math.max(p, c.value));

    return Container(
      height: 400,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.06),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Top Performers',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 24),
          Expanded(
            child: ListView.separated(
              physics: const NeverScrollableScrollPhysics(),
              itemCount: products.length,
              separatorBuilder: (_, __) => const SizedBox(height: 20),
              itemBuilder: (context, index) {
                final p = products[index];
                final pct = p.value / (maxVal == 0 ? 1 : maxVal);

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          p.label,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF475569),
                          ),
                        ),
                        Text(
                          "${p.value.toStringAsFixed(1)}k",
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Container(
                      height: 8,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: FractionallySizedBox(
                        alignment: Alignment.centerLeft,
                        widthFactor: pct,
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF6366F1), Color(0xFF818CF8)],
                            ),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                    )
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ModernTabs extends StatelessWidget {
  final _SalesPeriod selected;
  final ValueChanged<_SalesPeriod> onChanged;

  const _ModernTabs({required this.selected, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: _SalesPeriod.values.map((p) {
          final isSel = p == selected;
          return GestureDetector(
            onTap: () => onChanged(p),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isSel ? Colors.white : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
                boxShadow: isSel
                    ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  )
                ]
                    : null,
              ),
              child: Text(
                p.name[0].toUpperCase() + p.name.substring(1),
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isSel ? const Color(0xFF1E293B) : const Color(0xFF94A3B8),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _SmoothChartPainter extends CustomPainter {
  final List<double> values;
  final Color color;

  _SmoothChartPainter({required this.values, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;

    final paint = Paint()
      ..color = color
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final maxVal = values.reduce(math.max);
    final minVal = values.reduce(math.min);
    final range = maxVal - minVal;
    final wStep = size.width / (values.length - 1);

    // Normalize logic
    double getY(double val) {
      if (range == 0) return size.height / 2;
      return size.height - ((val - minVal) / range) * (size.height * 0.8) - (size.height * 0.1);
    }

    final path = Path();
    path.moveTo(0, getY(values[0]));

    for (int i = 0; i < values.length - 1; i++) {
      final x1 = i * wStep;
      final y1 = getY(values[i]);
      final x2 = (i + 1) * wStep;
      final y2 = getY(values[i + 1]);

      final controlX = (x1 + x2) / 2;
      path.cubicTo(controlX, y1, controlX, y2, x2, y2);
    }

    // Draw Shadow
    final fillPath = Path.from(path)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

    final gradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [color.withOpacity(0.2), color.withOpacity(0.0)],
    );

    canvas.drawPath(
      fillPath,
      Paint()..shader = gradient.createShader(Rect.fromLTWH(0, 0, size.width, size.height)),
    );

    // Draw Line
    canvas.drawPath(path, paint);

    // Draw Dots
    final dotPaint = Paint()..color = Colors.white;
    final borderPaint = Paint()..color = color..style = PaintingStyle.stroke..strokeWidth = 2;

    for (int i = 0; i < values.length; i++) {
      final cx = i * wStep;
      final cy = getY(values[i]);
      canvas.drawCircle(Offset(cx, cy), 5, dotPaint);
      canvas.drawCircle(Offset(cx, cy), 5, borderPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _SmoothChartPainter oldDelegate) => true;
}

// --- Data Models ---

enum _SalesPeriod { daily, weekly, monthly }

class _OwnerStats {
  final double todaySalesEtb;
  final double salesDeltaPct;
  final int transactions;
  final double transactionsDeltaPct;
  final double profitEtb;
  final double profitDeltaPct;
  final int alerts;

  const _OwnerStats({
    required this.todaySalesEtb,
    required this.salesDeltaPct,
    required this.transactions,
    required this.transactionsDeltaPct,
    required this.profitEtb,
    required this.profitDeltaPct,
    required this.alerts,
  });
}

class _TopProduct {
  final String label;
  final double value;
  _TopProduct({required this.label, required this.value});
}

_OwnerStats _mockOwnerStats() => const _OwnerStats(
  todaySalesEtb: 8292,
  salesDeltaPct: 12.5,
  transactions: 24,
  transactionsDeltaPct: 8.2,
  profitEtb: 5592,
  profitDeltaPct: 5.3,
  alerts: 3,
);

List<double> _mockSales(_SalesPeriod period) {
  switch (period) {
    case _SalesPeriod.daily: return [12, 18, 14, 22, 19, 24, 21];
    case _SalesPeriod.weekly: return [40, 65, 50, 80, 75, 90, 85];
    case _SalesPeriod.monthly: return [30, 45, 40, 60, 55, 70, 65, 80, 75, 90, 85, 95];
  }
}

List<_TopProduct> _mockTopProducts() => [
  _TopProduct(label: 'Blue Magic', value: 7.2),
  _TopProduct(label: 'Coca Cola', value: 5.0),
  _TopProduct(label: 'Water 1L', value: 3.5),
  _TopProduct(label: 'Bread', value: 2.8),
];