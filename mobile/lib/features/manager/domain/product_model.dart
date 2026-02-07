class MProduct {
  final String id;
  final String name;
  final String? category;
  final int quantity;
  final int revenue;
  final int sold;
  final int lowStockThreshold;
  final double purchasePrice;
  final double sellingPrice;
  final DateTime? expiryDate;
  final String imageUrl;

  MProduct({
    required this.id,
    required this.name,
    required this.category,
    required this.quantity,
    required this.revenue,
    required this.sold,
    required this.lowStockThreshold,
    required this.purchasePrice,
    required this.sellingPrice,
    this.expiryDate,
    this.imageUrl = '',
  });

  factory MProduct.fromJson(Map<String, dynamic> json) {
    return MProduct(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? 'Unnamed',
      category: json['category'] ?? '',
      quantity: json['quantity'] ?? 0,
      revenue: json['revenue'],
      sold: json['sold'],
      lowStockThreshold: json['lowStockThreshold'] ?? 0,
      purchasePrice: (json['purchasePrice'] ?? 0).toDouble(),
      sellingPrice: (json['sellingPrice'] ?? 0).toDouble(),
      expiryDate: json['expiryDate'] != null
          ? DateTime.tryParse(json['expiryDate'])
          : null,
      imageUrl: json['imageUrl'] ?? '',
    );
  }

  bool get isLowStock => quantity <= lowStockThreshold;

  bool isExpiringSoon({int days = 7}) {
    if (expiryDate == null) return false;
    final threshold = DateTime.now().add(Duration(days: days));
    return expiryDate!.isBefore(threshold);
  }
}
