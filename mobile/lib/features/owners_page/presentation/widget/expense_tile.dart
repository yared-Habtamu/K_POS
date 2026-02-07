import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

import '../../domain/expense_model.dart';

class ExpenseTile extends StatelessWidget {
  final Expense expense;
  final VoidCallback onDelete;

  const ExpenseTile({
    super.key,
    required this.expense,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(bottom: 10.h),
      padding: EdgeInsets.all(14.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14.r),
        boxShadow: [
          BoxShadow(
            blurRadius: 6,
            color: Colors.black12,
          )
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22.r,
            backgroundColor: Colors.indigo.shade50,
            child: Icon(Icons.money, color: Colors.indigo),
          ),

          SizedBox(width: 12.w),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(expense.category,
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15.sp)),
                Text(expense.description,
                    style: TextStyle(color: Colors.grey)),
              ],
            ),
          ),

          Text(
            "${expense.amount.toStringAsFixed(0)} ETB",
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 15.sp,
            ),
          ),

          IconButton(
            onPressed: onDelete,
            icon: const Icon(Icons.delete, color: Colors.red),
          )
        ],
      ),
    );
  }
}
