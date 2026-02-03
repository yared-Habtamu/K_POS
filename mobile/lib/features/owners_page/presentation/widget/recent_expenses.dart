import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../domain/expense_model.dart';
import 'expense_tile.dart';

class RecentExpenses extends StatelessWidget {
  final List<Expense> expenses;
  final Function(int) onDelete;

  const RecentExpenses({
    super.key,
    required this.expenses,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
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
          Text("Recent Expenses",
              style: TextStyle(
                  fontSize: 18.sp,
                  fontWeight: FontWeight.bold)),

          SizedBox(height: 14.h),

          if (expenses.isEmpty)
            Padding(
              padding: EdgeInsets.symmetric(vertical: 30.h),
              child: const Center(child: Text("No expenses added")),
            )
          else
            ListView.builder(
              itemCount: expenses.length,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemBuilder: (context, i) => ExpenseTile(
                expense: expenses[i],
                onDelete: () => onDelete(i),
              ),
            )
        ],
      ),
    );
  }
}
