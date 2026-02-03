import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

import '../../domain/expense_model.dart';

class ExpensePieChart extends StatelessWidget {
  final List<Expense> expenses;

  const ExpensePieChart({super.key, required this.expenses});

  Map<String, double> get grouped {
    final Map<String, double> data = {};

    for (var e in expenses) {
      data[e.category] = (data[e.category] ?? 0) + e.amount;
    }

    return data;
  }

  static const colors = [
    Color(0xff4F46E5),
    Color(0xff06B6D4),
    Color(0xff10B981),
    Color(0xffF59E0B),
    Color(0xffEF4444),
    Color(0xff8B5CF6),
  ];

  @override
  Widget build(BuildContext context) {
    final data = grouped;

    if (data.isEmpty) {
      return const Center(child: Text("No expenses yet"));
    }

    int index = 0;

    final sections = data.entries.map((e) {
      final color = colors[index % colors.length];
      index++;

      return PieChartSectionData(
        value: e.value,
        color: color,
        radius: 55.r,
        title: "",
      );
    }).toList();

    return Container(
      padding: EdgeInsets.all(18.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18.r),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 10)
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Expenses by Category",
              style: TextStyle(
                  fontSize: 18.sp,
                  fontWeight: FontWeight.bold)),

          SizedBox(height: 20.h),

          SizedBox(
            height: 220.h,
            child: PieChart(
              PieChartData(
                sections: sections,
                centerSpaceRadius: 40.r,
                sectionsSpace: 2,
              ),
            ),
          ),

          SizedBox(height: 20.h),

          /// LEGEND
          Wrap(
            spacing: 14.w,
            runSpacing: 8.h,
            children: data.entries.toList().asMap().entries.map((entry) {
              final i = entry.key;
              final category = entry.value.key;

              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 12.w,
                    height: 12.w,
                    color: colors[i % colors.length],
                  ),
                  SizedBox(width: 6.w),
                  Text(category),
                ],
              );
            }).toList(),
          )
        ],
      ),
    );
  }
}
