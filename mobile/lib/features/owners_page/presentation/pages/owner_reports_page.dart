import 'dart:math' as math;

import 'package:flutter/material.dart';

enum _ReportPeriod { daily, weekly, monthly, custom }

class OwnerReportsPage extends StatefulWidget {
  const OwnerReportsPage({super.key});

  @override
  State<OwnerReportsPage> createState() => _OwnerReportsPageState();
}

class _OwnerReportsPageState extends State<OwnerReportsPage> {
  _ReportPeriod _period = _ReportPeriod.monthly;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth;
        final isWide = maxWidth >= 900;
        final contentMaxWidth = maxWidth >= 700 ? 820.0 : double.infinity;

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Center(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: contentMaxWidth),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _Header(
                    title: 'Sales Reports',
                    subtitle: 'Period: 1 Jan 2026 – 31 Jan 2026',
                    onExportExcel: () =>
                        _toast(context, 'Export to Excel (mock)'),
                    onExportPdf: () => _toast(context, 'Export to PDF (mock)'),
                  ),
                  const SizedBox(height: 14),
                  _SurfaceCard(
                    child: Row(
                      children: [
                        Text(
                          'Report Period:',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade700,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Wrap(
                              spacing: 10,
                              children: [
                                _PeriodChip(
                                  label: 'Daily',
                                  selected: _period == _ReportPeriod.daily,
                                  onTap: () => setState(
                                      () => _period = _ReportPeriod.daily),
                                ),
                                _PeriodChip(
                                  label: 'Weekly',
                                  selected: _period == _ReportPeriod.weekly,
                                  onTap: () => setState(
                                      () => _period = _ReportPeriod.weekly),
                                ),
                                _PeriodChip(
                                  label: 'Monthly',
                                  selected: _period == _ReportPeriod.monthly,
                                  onTap: () => setState(
                                      () => _period = _ReportPeriod.monthly),
                                ),
                                _PeriodChip(
                                  label: 'Custom',
                                  selected: _period == _ReportPeriod.custom,
                                  onTap: () => setState(
                                      () => _period = _ReportPeriod.custom),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  _StatsRow(isWide: isWide),
                  const SizedBox(height: 14),
                  if (isWide)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Expanded(child: _PaymentMethodsCard()),
                        SizedBox(width: 14),
                        Expanded(child: _TopSellingProductsCard()),
                      ],
                    )
                  else ...const [
                    _PaymentMethodsCard(),
                    SizedBox(height: 14),
                    _TopSellingProductsCard(),
                  ],
                  const SizedBox(height: 14),
                  const _TaxSummaryCard(),
                  const SizedBox(height: 8),
                  Text(
                    'Tip: Charts are placeholders for now; data wiring can come next.',
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: Colors.grey.shade700),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _Header extends StatelessWidget {
  final String title;
  final String subtitle;
  final VoidCallback onExportExcel;
  final VoidCallback onExportPdf;

  const _Header({
    required this.title,
    required this.subtitle,
    required this.onExportExcel,
    required this.onExportPdf,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 520;

        final left = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: theme.textTheme.headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: Colors.grey.shade700),
            ),
          ],
        );

        final actions = Wrap(
          spacing: 10,
          runSpacing: 10,
          alignment: WrapAlignment.end,
          children: [
            ElevatedButton(
              onPressed: onExportExcel,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green.shade600,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Export to Excel'),
            ),
            ElevatedButton(
              onPressed: onExportPdf,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade600,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Export to PDF'),
            ),
          ],
        );

        if (isNarrow) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              left,
              const SizedBox(height: 12),
              actions,
            ],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: left),
            actions,
          ],
        );
      },
    );
  }
}

class _SurfaceCard extends StatelessWidget {
  final Widget child;
  final double? minHeight;

  const _SurfaceCard({required this.child, this.minHeight});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      constraints: BoxConstraints(minHeight: minHeight ?? 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: child,
    );
  }
}

class _PeriodChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _PeriodChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bg = selected ? Colors.blue.shade900 : Colors.grey.shade200;
    final fg = selected ? Colors.white : Colors.grey.shade800;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style:
              TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: fg),
        ),
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  final bool isWide;

  const _StatsRow({required this.isWide});

  @override
  Widget build(BuildContext context) {
    final cards = const [
      _StatCard(title: 'Total Sales', value: r'$432.00'),
      _StatCard(title: 'Total Orders', value: '3'),
      _StatCard(title: 'Avg Order', value: r'$144.00'),
      _StatCard(title: 'Gross Profit', value: r'$360.00'),
    ];

    if (isWide) {
      return Row(
        children: [
          for (int i = 0; i < cards.length; i++) ...[
            Expanded(child: cards[i]),
            if (i != cards.length - 1) const SizedBox(width: 14),
          ],
        ],
      );
    }
    // For narrow screens, adapt columns based on available width to avoid
    // making the cards too short (which causes vertical overflow).
    return LayoutBuilder(builder: (context, constraints) {
      final width = constraints.maxWidth;
      final crossAxis = width < 360 ? 1 : 2;
      final aspect = crossAxis == 1 ? 5.2 : 2.4;

      // Make the cards taller on medium widths to avoid tiny heights that
      // cause vertical overflow (this happens on many phones in landscape
      // or older narrow devices). Use a smaller aspect ratio for mid widths.
      final effectiveAspect =
          crossAxis == 1 ? aspect : (width < 420 ? 1.8 : aspect);

      return GridView.count(
        crossAxisCount: crossAxis,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 14,
        mainAxisSpacing: 14,
        childAspectRatio: effectiveAspect,
        children: cards,
      );
    });
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;

  const _StatCard({required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return _SurfaceCard(
      minHeight: 72,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade700,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          // Allow the value to scale down if the space is tight to prevent
          // RenderFlex overflow on very small heights.
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }
}

class _PaymentMethodsCard extends StatelessWidget {
  const _PaymentMethodsCard();

  @override
  Widget build(BuildContext context) {
    return _SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Payment Methods',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          const SizedBox(height: 220, child: _FakePieChart()),
          const SizedBox(height: 10),
          Wrap(
            spacing: 14,
            runSpacing: 10,
            alignment: WrapAlignment.center,
            children: const [
              _LegendDot(color: Color(0xFF1677FF), label: 'Cash'),
              _LegendDot(color: Color(0xFF10B981), label: 'Card'),
              _LegendDot(color: Color(0xFFF59E0B), label: 'Mobile'),
              _LegendDot(color: Color(0xFFFB7185), label: 'Credit'),
            ],
          ),
        ],
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(label,
            style: TextStyle(
                color: Colors.grey.shade700, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _FakePieChart extends StatelessWidget {
  const _FakePieChart();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _PiePainter(
        segments: const [
          _PieSegment(0.83, Color(0xFF1677FF)),
          _PieSegment(0.17, Color(0xFF10B981)),
          _PieSegment(0.0, Color(0xFFF59E0B)),
          _PieSegment(0.0, Color(0xFFFB7185)),
        ],
      ),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: const Text('Amount : \$360',
              style: TextStyle(fontWeight: FontWeight.w700)),
        ),
      ),
    );
  }
}

class _PieSegment {
  final double value;
  final Color color;

  const _PieSegment(this.value, this.color);
}

class _PiePainter extends CustomPainter {
  final List<_PieSegment> segments;

  const _PiePainter({required this.segments});

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final center = Offset(rect.center.dx.toDouble(), rect.center.dy.toDouble());
    final radius = (math.min(size.width, size.height) / 2 - 8).toDouble();
    var start = -math.pi / 2;

    for (final seg in segments) {
      final sweep =
          (seg.value <= 0) ? 0.0 : (seg.value * 2 * math.pi).toDouble();
      final paint = Paint()
        ..color = seg.color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 28
        ..strokeCap = StrokeCap.butt;

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        start,
        sweep,
        false,
        paint,
      );
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(covariant _PiePainter oldDelegate) =>
      oldDelegate.segments != segments;
}

class _TopSellingProductsCard extends StatelessWidget {
  const _TopSellingProductsCard();

  @override
  Widget build(BuildContext context) {
    return _SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Top Selling Products',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          const SizedBox(height: 220, child: _FakeBarChart()),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                      color: Colors.green.shade600,
                      borderRadius: BorderRadius.circular(2))),
              const SizedBox(width: 8),
              Text('Revenue (\$)',
                  style: TextStyle(
                      color: Colors.grey.shade700,
                      fontWeight: FontWeight.w600)),
            ],
          ),
        ],
      ),
    );
  }
}

class _FakeBarChart extends StatelessWidget {
  const _FakeBarChart();

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        const SizedBox(width: 28),
        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Expanded(
                      child: FractionallySizedBox(
                        alignment: Alignment.bottomCenter,
                        heightFactor: 0.86,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.green.shade600,
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text('Baby oil',
                        style: TextStyle(color: Colors.grey.shade700)),
                  ],
                ),
              ),
              const SizedBox(width: 22),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Expanded(
                      child: FractionallySizedBox(
                        alignment: Alignment.bottomCenter,
                        heightFactor: 0.26,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.green.shade600,
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text('Bread2',
                        style: TextStyle(color: Colors.grey.shade700)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 28),
      ],
    );
  }
}

class _TaxSummaryCard extends StatelessWidget {
  const _TaxSummaryCard();

  @override
  Widget build(BuildContext context) {
    return _SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Tax Summary',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Category',
                    style: TextStyle(
                        color: Colors.grey.shade700,
                        fontWeight: FontWeight.w700),
                  ),
                ),
                Text(
                  'Tax Amount',
                  style: TextStyle(
                      color: Colors.grey.shade700, fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Expanded(
                child: Text('Total',
                    style: TextStyle(fontWeight: FontWeight.w700)),
              ),
              Text(
                r'$0.00',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

void _toast(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
}
