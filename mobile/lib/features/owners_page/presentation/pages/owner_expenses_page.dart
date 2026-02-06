import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

import '../../domain/expense_model.dart';
import '../widget/add_expense_dialog.dart';
import '../widget/expense_pie_chart.dart';

import '../widget/expense_stat_card.dart';
import '../widget/expense_tile.dart';
import '../widget/recent_expenses.dart';

class OwnerExpensesPage extends StatefulWidget {
  const OwnerExpensesPage({super.key});

  @override
  State<OwnerExpensesPage> createState() => _OwnerExpensesPageState();
}

class _OwnerExpensesPageState extends State<OwnerExpensesPage> {
  final List<Expense> expenses = [];

  double get total => expenses.fold(0, (sum, e) => sum + e.amount);

  void addExpense(Expense e) {
    setState(() => expenses.insert(0, e));
  }

  void deleteExpense(int i) {
    setState(() => expenses.removeAt(i));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xffF5F7FB),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final result = await showDialog<Expense>(
            context: context,
            builder: (_) => const AddExpenseDialog(),
          );

          if (result != null) addExpense(result);
        },
        child: const Icon(Icons.add),
      ),
      body: Padding(
        padding: EdgeInsets.all(16.w),
        child: ListView(
          children: [
            /// HEADER
            Text(
              "Expenses Dashboard",
              style: TextStyle(
                fontSize: 26.sp,
                fontWeight: FontWeight.bold,
              ),
            ),

            SizedBox(height: 20.h),

            /// STATS
            Row(
              children: [
                Expanded(
                  child: StatCard(
                    title: "Total Expenses",
                    value: "$total ETB",
                  ),
                ),
                SizedBox(width: 12.w),
                const Expanded(
                  child: StatCard(
                    title: "Revenue",
                    value: "43,000 ETB",
                  ),
                ),
              ],
            ),

            SizedBox(height: 25.h),

            /// LIST
            ...List.generate(
              expenses.length,
              (i) => ExpenseTile(
                expense: expenses[i],
                onDelete: () => deleteExpense(i),
              ),
            ),
            LayoutBuilder(
              builder: (context, constraints) {

                if (constraints.maxWidth > 700) {
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: ExpensePieChart(expenses: expenses)),
                      SizedBox(width: 20.w),
                      Expanded(
                        child: RecentExpenses(
                          expenses: expenses,
                          onDelete: deleteExpense,
                        ),
                      ),
                    ],
                  );
                }

                return Column(
                  children: [
                    ExpensePieChart(expenses: expenses),
                    SizedBox(height: 20.h),
                    RecentExpenses(
                      expenses: expenses,
                      onDelete: deleteExpense,
                    ),
                  ],
                );
              },
            )

          ],
        ),
      ),
    );
  }
}
