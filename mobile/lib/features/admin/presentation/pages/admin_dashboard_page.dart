import 'package:flutter/material.dart';

import '../../data/mock_admin_data.dart';
import '../../domain/admin_shop.dart';

class AdminDashboardPage extends StatefulWidget {
  const AdminDashboardPage({super.key});

  @override
  State<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends State<AdminDashboardPage> {
  _Period _period = _Period.month;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final shops = MockAdminData.shops();

    final approvedCount = shops.where((s) => s.status == AdminShopStatus.active).length;
    final pendingCount = shops.where((s) => s.status == AdminShopStatus.pending).length;
    final totalTransactions = _mockTotalTransactions(shops);
    final activeUsersCount = shops
        .where((s) => s.status == AdminShopStatus.active)
        .fold<int>(0, (acc, s) => acc + s.users);

    final platformFeeRevenue = approvedCount * MockAdminData.platformFeeEtb;
    final salesThisMonth = _mockSalesForPeriod(shops, _Period.month);

    final revenueSeries = _mockRevenueSeries(shops, _Period.week);
    final martsSeries = _mockMartsRegisteredSeries(shops, _period);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('System Administration', style: theme.textTheme.headlineSmall),
        const SizedBox(height: 6),
        Text(
          'Overview of all registered supermarkets and system activity',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: 16),

        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 900;
            final left = _PlatformRevenueCard(
              series: revenueSeries,
              salesValue: salesThisMonth,
              platformFeeRevenue: platformFeeRevenue,
            );
            final right = _QuickStatsCard(
              totalShops: shops.length,
              totalTransactions: totalTransactions,
              pendingApprovals: pendingCount,
              activeUsers: activeUsersCount,
            );

            if (!isWide) {
              return Column(
                children: [
                  left,
                  const SizedBox(height: 12),
                  right,
                ],
              );
            }

            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: left),
                const SizedBox(width: 12),
                Expanded(child: right),
              ],
            );
          },
        ),

        const SizedBox(height: 16),

        _MartsRegisteredCard(
          period: _period,
          onPeriodChanged: (p) => setState(() => _period = p),
          series: martsSeries,
          activeUsers: activeUsersCount,
          approvedInPeriod: _mockApprovedInPeriod(shops, _period),
          platformFeeRevenue: platformFeeRevenue,
        ),
        const SizedBox(height: 16),

        Text('Recent shops', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        ...shops.take(5).map((s) => _ShopTile(shop: s)),
      ],
    );
  }
}

enum _Period { week, month, year }

String _periodLabel(_Period period) {
  switch (period) {
    case _Period.week:
      return 'Last 7 days';
    case _Period.month:
      return 'Last 6 months';
    case _Period.year:
      return 'Last 12 months';
  }
}

int _mockTotalTransactions(List<AdminShop> shops) {
  // Mock-only: derive a stable-looking number from sales.
  final sales = shops.fold<int>(0, (acc, s) => acc + s.sales);
  return (sales / 950).round();
}

int _mockSalesForPeriod(List<AdminShop> shops, _Period period) {
  final activeSales = shops.where((s) => s.status == AdminShopStatus.active).fold<int>(0, (acc, s) => acc + s.sales);
  switch (period) {
    case _Period.week:
      return (activeSales * 0.12).round();
    case _Period.month:
      return (activeSales * 0.55).round();
    case _Period.year:
      return (activeSales * 1.8).round();
  }
}

int _mockApprovedInPeriod(List<AdminShop> shops, _Period period) {
  final approved = shops.where((s) => s.status == AdminShopStatus.active).length;
  switch (period) {
    case _Period.week:
      return (approved / 10).floor();
    case _Period.month:
      return (approved / 4).floor();
    case _Period.year:
      return (approved / 2).floor();
  }
}

List<double> _mockRevenueSeries(List<AdminShop> shops, _Period period) {
  // Generates 14 (week) or 6 (month) or 12 (year) points.
  final activeSales = shops.where((s) => s.status == AdminShopStatus.active).fold<int>(0, (acc, s) => acc + s.sales);

  final int points;
  final double scale;
  switch (period) {
    case _Period.week:
      points = 14;
      scale = 0.03;
      break;
    case _Period.month:
      points = 6;
      scale = 0.20;
      break;
    case _Period.year:
      points = 12;
      scale = 0.12;
      break;
  }

  // Deterministic wave based on activeSales so it looks "real" but stable.
  final base = (activeSales * scale).clamp(2000, 60000);
  return List<double>.generate(points, (i) {
    final wave = (i % 5) - 2; // -2..+2
    final bump = (i % 7 == 0) ? 2.6 : (i % 6 == 0 ? 1.7 : 1.0);
    final v = base * (1 + (wave * 0.08)) * bump;
    return v.toDouble();
  });
}

List<double> _mockMartsRegisteredSeries(List<AdminShop> shops, _Period period) {
  final total = shops.length;
  final approved = shops.where((s) => s.status == AdminShopStatus.active).length;

  final int points;
  switch (period) {
    case _Period.week:
      points = 6;
      break;
    case _Period.month:
      points = 6;
      break;
    case _Period.year:
      points = 12;
      break;
  }

  final base = (total / points).clamp(0.0, 5.0);
  return List<double>.generate(points, (i) {
    final wave = (i % 3) - 1; // -1..+1
    final approvedBias = approved > 0 ? 0.4 : -0.2;
    final v = (base + wave + approvedBias).clamp(0.0, 6.0);
    return v;
  });
}

class _PlatformRevenueCard extends StatelessWidget {
  final List<double> series;
  final int salesValue;
  final int platformFeeRevenue;

  const _PlatformRevenueCard({
    required this.series,
    required this.salesValue,
    required this.platformFeeRevenue,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text('Platform Revenue', style: theme.textTheme.titleMedium),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 220,
              child: _SimpleLineChart(values: series),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _Kpi(
                    label: 'This month (sales)',
                    value: '${_formatNumber(salesValue)} ETB',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _Kpi(
                    label: 'Platform fee revenue',
                    value: '${_formatNumber(platformFeeRevenue)} ETB',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickStatsCard extends StatelessWidget {
  final int totalShops;
  final int totalTransactions;
  final int pendingApprovals;
  final int activeUsers;

  const _QuickStatsCard({
    required this.totalShops,
    required this.totalTransactions,
    required this.pendingApprovals,
    required this.activeUsers,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Quick Stats', style: theme.textTheme.titleMedium),
            const SizedBox(height: 12),
            _QuickStatRow(
              label: 'Total Shops',
              value: totalShops.toString(),
              badgeText: 'Active',
            ),
            const SizedBox(height: 10),
            _QuickStatRow(
              label: 'Total Transactions',
              value: totalTransactions.toString(),
              badgeText: 'Records',
            ),
            const SizedBox(height: 10),
            _QuickStatRow(
              label: 'Pending Approvals',
              value: pendingApprovals.toString(),
              badgeText: 'Review',
            ),
            const SizedBox(height: 14),
            Divider(color: theme.dividerColor),
            const SizedBox(height: 12),
            _Kpi(
              label: 'Active users',
              value: activeUsers.toString(),
              small: true,
            ),
          ],
        ),
      ),
    );
  }
}

class _MartsRegisteredCard extends StatelessWidget {
  final _Period period;
  final ValueChanged<_Period> onPeriodChanged;
  final List<double> series;
  final int activeUsers;
  final int approvedInPeriod;
  final int platformFeeRevenue;

  const _MartsRegisteredCard({
    required this.period,
    required this.onPeriodChanged,
    required this.series,
    required this.activeUsers,
    required this.approvedInPeriod,
    required this.platformFeeRevenue,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text('Marts Registered', style: theme.textTheme.titleMedium),
                ),
                _PeriodDropdown(value: period, onChanged: onPeriodChanged),
              ],
            ),
            const SizedBox(height: 6),
            Text(_periodLabel(period), style: theme.textTheme.bodySmall),
            const SizedBox(height: 12),
            SizedBox(
              height: 200,
              child: _SimpleLineChart(values: series),
            ),
            const SizedBox(height: 16),
            _Kpi(label: 'Active users', value: activeUsers.toString(), small: true),
            const SizedBox(height: 8),
            _Kpi(label: 'New approved marts (${_periodLabel(period)})', value: approvedInPeriod.toString(), small: true),
            const SizedBox(height: 8),
            _Kpi(
              label: 'Platform fee revenue (${_periodLabel(period)})',
              value: '${_formatNumber(platformFeeRevenue)} ETB',
              small: true,
            ),
          ],
        ),
      ),
    );
  }
}

String _formatNumber(num value) {
  final s = value.round().toString();
  final buf = StringBuffer();
  for (int i = 0; i < s.length; i++) {
    final reverseIndex = s.length - i;
    buf.write(s[i]);
    if (reverseIndex > 1 && reverseIndex % 3 == 1) {
      buf.write(',');
    }
  }
  return buf.toString();
}

class _PeriodDropdown extends StatelessWidget {
  final _Period value;
  final ValueChanged<_Period> onChanged;

  const _PeriodDropdown({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return DropdownButton<_Period>(
      value: value,
      underline: const SizedBox.shrink(),
      onChanged: (v) {
        if (v != null) onChanged(v);
      },
      items: const [
        DropdownMenuItem(value: _Period.week, child: Text('Week')),
        DropdownMenuItem(value: _Period.month, child: Text('Month')),
        DropdownMenuItem(value: _Period.year, child: Text('Year')),
      ],
    );
  }
}

class _Kpi extends StatelessWidget {
  final String label;
  final String value;
  final bool small;

  const _Kpi({
    required this.label,
    required this.value,
    this.small = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: theme.textTheme.bodySmall),
        const SizedBox(height: 4),
        Text(
          value,
          style: small ? theme.textTheme.titleLarge : theme.textTheme.headlineSmall,
        ),
      ],
    );
  }
}

class _QuickStatRow extends StatelessWidget {
  final String label;
  final String value;
  final String badgeText;

  const _QuickStatRow({
    required this.label,
    required this.value,
    required this.badgeText,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: theme.textTheme.bodySmall),
              const SizedBox(height: 2),
              Text(value, style: theme.textTheme.titleLarge),
            ],
          ),
        ),
        Chip(
          label: Text(badgeText),
          visualDensity: VisualDensity.compact,
        ),
      ],
    );
  }
}

class _SimpleLineChart extends StatelessWidget {
  final List<double> values;

  const _SimpleLineChart({required this.values});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _LineChartPainter(
        values: values,
        theme: Theme.of(context),
      ),
      child: const SizedBox.expand(),
    );
  }
}

class _LineChartPainter extends CustomPainter {
  final List<double> values;
  final ThemeData theme;

  _LineChartPainter({required this.values, required this.theme});

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;

    final padding = 12.0;
    final left = padding;
    final top = padding;
    final right = size.width - padding;
    final bottom = size.height - padding;
    final chartW = (right - left).clamp(1.0, double.infinity);
    final chartH = (bottom - top).clamp(1.0, double.infinity);

    final minV = values.reduce((a, b) => a < b ? a : b);
    final maxV = values.reduce((a, b) => a > b ? a : b);
    final range = (maxV - minV).abs() < 0.0001 ? 1.0 : (maxV - minV);

    final gridPaint = Paint()
      ..color = theme.dividerColor.withAlpha(70)
      ..strokeWidth = 1;

    // Grid
    const gridLines = 4;
    for (int i = 0; i <= gridLines; i++) {
      final y = top + (chartH * (i / gridLines));
      canvas.drawLine(Offset(left, y), Offset(right, y), gridPaint);
    }

    final axisPaint = Paint()
      ..color = theme.dividerColor
      ..strokeWidth = 1.2;
    canvas.drawLine(Offset(left, top), Offset(left, bottom), axisPaint);
    canvas.drawLine(Offset(left, bottom), Offset(right, bottom), axisPaint);

    final linePaint = Paint()
      ..color = theme.colorScheme.primary
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke;

    final fillPaint = Paint()
      ..color = theme.colorScheme.primary.withAlpha(25)
      ..style = PaintingStyle.fill;

    final stepX = values.length == 1 ? chartW : chartW / (values.length - 1);
    final path = Path();
    final fillPath = Path();

    for (int i = 0; i < values.length; i++) {
      final x = left + stepX * i;
      final normalized = (values[i] - minV) / range;
      final y = bottom - normalized * chartH;
      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, bottom);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }
    }
    fillPath.lineTo(left + stepX * (values.length - 1), bottom);
    fillPath.close();

    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, linePaint);

    final dotPaint = Paint()..color = theme.colorScheme.primary;
    for (int i = 0; i < values.length; i++) {
      final x = left + stepX * i;
      final normalized = (values[i] - minV) / range;
      final y = bottom - normalized * chartH;
      canvas.drawCircle(Offset(x, y), 3, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _LineChartPainter oldDelegate) {
    return oldDelegate.values != values || oldDelegate.theme != theme;
  }
}

class _ShopTile extends StatelessWidget {
  final AdminShop shop;

  const _ShopTile({required this.shop});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          child: Text(
            shop.name.isNotEmpty ? shop.name.characters.first.toUpperCase() : 'S',
          ),
        ),
        title: Text(shop.name),
        subtitle: Text('${shop.city}, ${shop.region} • ${shop.owner}'),
        trailing: _StatusChip(status: shop.status),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final AdminShopStatus status;

  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final text = switch (status) {
      AdminShopStatus.active => 'Active',
      AdminShopStatus.pending => 'Pending',
      AdminShopStatus.suspended => 'Suspended',
      AdminShopStatus.rejected => 'Rejected',
    };

    return Chip(
      label: Text(text),
      visualDensity: VisualDensity.compact,
    );
  }
}
