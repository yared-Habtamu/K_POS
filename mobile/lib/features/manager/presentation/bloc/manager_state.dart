part of 'manager_bloc.dart';

class ManagerState {
  final List<Map<String, dynamic>> registeredAssets;
  final List<MProduct> products;
  final List<MProduct> alertProducts;
  final List<MProduct> expiringSoonProducts;
  final bool loading;
  final String? error;

  // REPORT DATA
  final double totalSales;
  final int totalOrders;
  final double avgOrder;
  final List<PaymentMethod> paymentMethods;
  final List<TopProduct> topProducts;

  const ManagerState({
    this.registeredAssets = const [],
    this.products = const [],
    this.alertProducts = const [],
    this.expiringSoonProducts = const [],
    this.totalSales = 0,
    this.totalOrders = 0,
    this.avgOrder = 0,
    this.paymentMethods = const [],
    this.topProducts = const [],
    this.loading = false,
    this.error,
  });

  ManagerState copyWith({
    List<Map<String, dynamic>>? registeredAssets,
    List<MProduct>? products,
    List<MProduct>? alertProducts,
    List<MProduct>? expiringSoonProducts,
    double? totalSales,
    int? totalOrders,
    double? avgOrder,
    List<PaymentMethod>? paymentMethods,
    List<TopProduct>? topProducts,
    bool? loading,
    String? error,
  }) {
    return ManagerState(
      registeredAssets: registeredAssets ?? this.registeredAssets,
      products: products ?? this.products,
      alertProducts: alertProducts ?? this.alertProducts,
      expiringSoonProducts: expiringSoonProducts ?? this.expiringSoonProducts,
      totalSales: totalSales ?? this.totalSales,
      totalOrders: totalOrders ?? this.totalOrders,
      avgOrder: avgOrder ?? this.avgOrder,
      paymentMethods: paymentMethods ?? this.paymentMethods,
      topProducts: topProducts ?? this.topProducts,
      loading: loading ?? this.loading,
      error: error,
    );
  }
}
