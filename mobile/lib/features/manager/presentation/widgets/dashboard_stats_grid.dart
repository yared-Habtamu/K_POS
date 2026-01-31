import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';

import '../../domain/manager_model.dart';

class DashboardStatsGrid extends StatelessWidget {
  final DashboardStats stats;

  const DashboardStatsGrid({super.key, required this.stats});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        // Responsive column calculation
        final columns = width >= 1200 ? 4 : width >= 900 ? 2 : 1;

        final cards = [
          _StatData(
            title: "today_sales".tr,
            value: "${stats.todaySalesEtb.toInt()}",
            suffix: "ETB",
            trend: "+${stats.salesDeltaPct.toStringAsFixed(1)}%",
            isTrendUp: true,
            icon: Icons.payments_rounded,
            color: const Color(0xFF6366F1),
          ),
          _StatData(
            title: "transactions".tr,
            value: "${stats.transactions}",
            trend: "+${stats.transactionsDeltaPct.toStringAsFixed(1)}%",
            isTrendUp: true,
            icon: Icons.receipt_long_rounded,
            color: const Color(0xFF10B981),
          ),
          _StatData(
            title: "net_profit".tr,
            value: "${stats.profitEtb.toInt()}",
            suffix: "ETB",
            trend: "+${stats.profitDeltaPct.toStringAsFixed(1)}%",
            isTrendUp: true,
            icon: Icons.pie_chart_rounded,
            color: const Color(0xFFF59E0B),
          ),
          _StatData(
            title: "active_alerts".tr,
            value: "${stats.alerts}",
            trend: "Action needed",
            isTrendUp: false,
            icon: Icons.notifications_active_rounded,
            color: const Color(0xFFEF4444),
          ),
        ];

        return GridView.count(
          crossAxisCount: columns,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 16.0.w,
          mainAxisSpacing: 16.0.h,
          childAspectRatio: columns >= 2 ? 3.2 : 2.8,
          children: cards.map((data) => _StatCard(data: data)).toList(),
        );
      },
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
      padding: EdgeInsets.all(14.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20.r),
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
                child: Icon(data.icon, color: data.color, size: 20.sp),
              ),
              _TrendBadge(text: data.trend, isUp: data.isTrendUp),
            ],
          ),
          SizedBox(height: 10.h),
          Text(
            data.title,
            style: TextStyle(
              fontSize: 12.sp,
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
                style: TextStyle(
                  fontSize: 17.sp,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF1E293B),
                ),
              ),
              if (data.suffix != null) ...[
                const SizedBox(width: 4),
                Text(
                  data.suffix!,
                  style: TextStyle(
                    fontSize: 14.sp,
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