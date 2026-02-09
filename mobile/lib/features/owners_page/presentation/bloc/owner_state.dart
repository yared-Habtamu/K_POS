part of 'owner_bloc.dart';

class OwnerState {
  final List<Expense> expenses;
  final bool loading;
  final String? error;

  // REPORT DATA
  final double totalSales;
  final int totalOrders;
  final double avgOrder;
  final double profit;
  final List<double> salesSeries;
  final List<dynamic>
      paymentMethods; // PaymentMethod from manager domain (kept dynamic to avoid circular type issues)
  final List<dynamic> topProducts; // TopProduct from manager domain

  OwnerState({
    required this.expenses,
    this.loading = false,
    this.error,
    this.totalSales = 0.0,
    this.totalOrders = 0,
    this.avgOrder = 0.0,
    this.profit = 0.0,
    this.salesSeries = const [],
    this.paymentMethods = const [],
    this.topProducts = const [],
  });

  OwnerState copyWith({
    List<Expense>? expenses,
    bool? loading,
    String? error,
    double? totalSales,
    int? totalOrders,
    double? avgOrder,
    double? profit,
    List<double>? salesSeries,
    List<dynamic>? paymentMethods,
    List<dynamic>? topProducts,
  }) {
    return OwnerState(
      expenses: expenses ?? this.expenses,
      loading: loading ?? this.loading,
      error: error,
      totalSales: totalSales ?? this.totalSales,
      totalOrders: totalOrders ?? this.totalOrders,
      avgOrder: avgOrder ?? this.avgOrder,
      profit: profit ?? this.profit,
      salesSeries: salesSeries ?? this.salesSeries,
      paymentMethods: paymentMethods ?? this.paymentMethods,
      topProducts: topProducts ?? this.topProducts,
    );
  }
}
