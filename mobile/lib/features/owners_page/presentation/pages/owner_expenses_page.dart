import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:pos_app/utils/common_snackbar.dart';

import '../../domain/expense_model.dart';
import '../bloc/owner_bloc.dart';
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
  void initState() {
    context.read<OwnerBloc>().add(OwnerExpenseFetchEvent());
    super.initState();
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

          if (result != null) {
            context.read<OwnerBloc>().add(OwnerExpenseAddEvent(result));
          }
        },
        child: const Icon(Icons.add),
      ),
      body: BlocConsumer<OwnerBloc, OwnerState>(
        listener: (context, state) {
          if (state.error != null) {
            commonSnackBar(
              context,
              "${state.error}",
              Colors.white,
              Colors.redAccent,
            );
            return;
          }
        },
        builder: (context, state) {
          if (state.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          final expenses = state.expenses;
          final total = expenses.fold<double>(0, (sum, e) => sum + e.amount);

          return Padding(
            padding: EdgeInsets.all(16.w),
            child: ListView(
              children: [
                Text(
                  "Expenses Dashboard",
                  style: TextStyle(
                    fontSize: 26.sp,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 20.h),
                Row(
                  children: [
                    Expanded(
                      child: StatCard(
                        title: "Total Expenses",
                        value: "$total ETB",
                      ),
                    ),
                    SizedBox(width: 12.w),

                  ],
                ),
                SizedBox(height: 25.h),
                ...expenses.map(
                  (e) => ExpenseTile(
                    expense: e,
                    onDelete: () {
                      context
                          .read<OwnerBloc>()
                          .add(OwnerExpenseDeleteEvent(e.id!));
                    },
                  ),
                ),
                LayoutBuilder(
                  builder: (context, constraints) {
                    if (constraints.maxWidth > 700) {
                      return Row(
                        children: [
                          Expanded(child: ExpensePieChart(expenses: expenses)),
                          SizedBox(width: 20.w),
                          Expanded(
                            child: RecentExpenses(
                              expenses: expenses,
                              onDelete: (i) {
                                context.read<OwnerBloc>().add(
                                    OwnerExpenseDeleteEvent(expenses[i].id!));
                              },
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
                          onDelete: (i) {
                            context
                                .read<OwnerBloc>()
                                .add(OwnerExpenseDeleteEvent(expenses[i].id!));
                          },
                        ),
                      ],
                    );
                  },
                )
              ],
            ),
          );
        },
      ),
    );
  }
}
