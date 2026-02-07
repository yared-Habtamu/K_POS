import 'package:flutter/material.dart';

class Expense {
  final String? id;
  final String description;
  final String category;
  final double amount;
  final DateTime date;
  final String? martId;
  final String? createdBy;

  const Expense({
     this.id,
    required this.description,
    required this.category,
    required this.amount,
    required this.date,
    this.martId,
    this.createdBy,
  });

  //-------------------------------------------
  // FROM JSON
  //-------------------------------------------

  factory Expense.fromJson(Map<String, dynamic> json) {
    return Expense(
      id: json['_id']?.toString() ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? 'General',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      date: DateTime.tryParse(json['date'] ?? '') ?? DateTime.now(),
      martId: json['martId']?.toString(),
      createdBy: json['createdBy']?.toString(),
    );
  }

  //-------------------------------------------
  // TO JSON (FOR POST)
  //-------------------------------------------

  Map<String, dynamic> toJson() {
    return {
      "description": description,
      "category": category,
      "amount": amount,
      "date": date.toIso8601String(),
      if (martId != null) "martId": martId,
    };
  }

  //-------------------------------------------
  // COPY WITH
  //-------------------------------------------

  Expense copyWith({
    String? id,
    String? description,
    String? category,
    double? amount,
    DateTime? date,
    String? martId,
    String? createdBy,
  }) {
    return Expense(
      id: id ?? this.id,
      description: description ?? this.description,
      category: category ?? this.category,
      amount: amount ?? this.amount,
      date: date ?? this.date,
      martId: martId ?? this.martId,
      createdBy: createdBy ?? this.createdBy,
    );
  }

  //-------------------------------------------
  // CATEGORY COLOR (For Pie Chart / UI)
  //-------------------------------------------

  Color get categoryColor {
    switch (category.toLowerCase()) {
      case 'rent':
        return Colors.blue;

      case 'salary':
        return Colors.green;

      case 'utilities':
        return Colors.orange;

      case 'inventory':
        return Colors.purple;

      case 'transport':
        return Colors.teal;

      case 'tax':
        return Colors.red;

      default:
        return Colors.grey;
    }
  }

  //-------------------------------------------
  // FORMAT DATE (UI helper)
  //-------------------------------------------

  String get formattedDate {
    return "${date.day}/${date.month}/${date.year}";
  }
}
