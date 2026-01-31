import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';

import '../../domain/manager_model.dart';

class SalesChartCard extends StatelessWidget {
  final SalesPeriod period;
  final List<double> data;
  final ValueChanged<SalesPeriod> onPeriodChanged;

  const SalesChartCard({
    super.key,
    required this.period,
    required this.data,
    required this.onPeriodChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 400.h,
      padding: EdgeInsets.all(16.0.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24.r),
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
              Text(
                'sales_analytics'.tr,
                style: TextStyle(
                  fontSize: 14.sp,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF1E293B),
                ),
              ),
              _ModernTabs(
                selected: period,
                onChanged: onPeriodChanged,
              ),
            ],
          ),
          SizedBox(height: 32.h),
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

class _ModernTabs extends StatelessWidget {
  final SalesPeriod selected;
  final ValueChanged<SalesPeriod> onChanged;

  const _ModernTabs({required this.selected, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(3.w),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(10.r),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: SalesPeriod.values.map((p) {
          final isSel = p == selected;
          return GestureDetector(
            onTap: () => onChanged(p),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
              decoration: BoxDecoration(
                color: isSel ? Colors.white : Colors.transparent,
                borderRadius: BorderRadius.circular(8.r),
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
                p.name.tr,
                style: TextStyle(
                  fontSize: 13.sp,
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

    canvas.drawPath(path, paint);

    final dotPaint = Paint()..color = Colors.white;
    final borderPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

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