import 'package:flutter/material.dart';

class PaymentMethod {
  final String name;
  final double amount;
  final Color color;

  const PaymentMethod({
    required this.name,
    required this.amount,
    required this.color,
  });
}

class TopProduct {
  final String? name;
  final double? revenue; // or percentage depending on backend
  final String? productId;
  final int? sold;

  const TopProduct({
    required this.name,
    required this.revenue,
    this.sold,
    this.productId,
  });
}
