import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

import '../../domain/expense_model.dart';

class AddExpenseDialog extends StatefulWidget {
  const AddExpenseDialog({super.key});

  @override
  State<AddExpenseDialog> createState() => _AddExpenseDialogState();
}

class _AddExpenseDialogState extends State<AddExpenseDialog> {
  final _formKey = GlobalKey<FormState>();

  String category = 'miscellaneous';
  final descriptionController = TextEditingController();
  final amountController = TextEditingController();

  DateTime selectedDate = DateTime.now();

  final List<String> categories = [
    "salary",
    "rent",
    "electricity",
    "water",
    "cleaning",
    "miscellaneous",
  ];

  @override
  void dispose() {
    descriptionController.dispose();
    amountController.dispose();
    super.dispose();
  }

  Future<void> pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );

    if (picked != null) {
      setState(() => selectedDate = picked);
    }
  }

  void submit() {
    if (!_formKey.currentState!.validate()) return;

    final expense = Expense(
      category: category,
      description: descriptionController.text.trim(),
      amount: double.parse(amountController.text.trim()),
      date: selectedDate,
    );

    Navigator.pop(context, expense);
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20.r),
      ),
      child: Padding(
        padding: EdgeInsets.all(20.w),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                "Add Expense",
                style: TextStyle(
                  fontSize: 22.sp,
                  fontWeight: FontWeight.bold,
                ),
              ),

              SizedBox(height: 20.h),

              /// CATEGORY
              DropdownButtonFormField<String>(
                // initialValue: category,
                borderRadius: BorderRadius.circular(12.r),
                items: categories
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (v) => setState(() => category = v!),
                decoration: InputDecoration(
                  labelText: "Category",
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12.r),
                  ),
                ),
              ),

              SizedBox(height: 12.h),

              /// DESCRIPTION
              TextFormField(
                controller: descriptionController,
                validator: (v) => v!.isEmpty ? "Enter description" : null,
                decoration: InputDecoration(
                  labelText: "Description",
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12.r),
                  ),
                ),
              ),

              SizedBox(height: 12.h),

              /// AMOUNT
              TextFormField(
                controller: amountController,
                keyboardType: TextInputType.number,
                validator: (v) => v!.isEmpty ? "Enter amount" : null,
                decoration: InputDecoration(
                  labelText: "Amount (ETB)",
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12.r),
                  ),
                ),
              ),

              SizedBox(height: 12.h),

              /// DATE
              InkWell(
                onTap: pickDate,
                child: Container(
                  padding:
                      EdgeInsets.symmetric(vertical: 16.h, horizontal: 12.w),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12.r),
                    border: Border.all(color: Colors.grey),
                  ),
                  width: double.infinity,
                  child: Text(
                    "${selectedDate.day}/${selectedDate.month}/${selectedDate.year}",
                    style: TextStyle(fontSize: 14.sp),
                  ),
                ),
              ),

              SizedBox(height: 20.h),

              /// BUTTONS
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text("Cancel"),
                    ),
                  ),
                  SizedBox(width: 10.w),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: submit,
                      child: const Text("Add"),
                    ),
                  ),
                ],
              )
            ],
          ),
        ),
      ),
    );
  }
}
