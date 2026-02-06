class SaleItem {
  final String? productId;
  final String name;
  final double price;
  final int quantity;
  final double total;

  SaleItem({
    required this.productId,
    required this.name,
    required this.price,
    required this.quantity,
    required this.total,
  });

  factory SaleItem.fromJson(Map<String, dynamic> json) {
    return SaleItem(
      productId: json['productId']?.toString(),
      name: json['name']?.toString() ?? '',
      price: (json['price'] ?? 0).toDouble(),
      quantity: (json['quantity'] ?? 0).toInt(),
      total: (json['total'] ?? 0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'name': name,
        'price': price,
        'quantity': quantity,
        'total': total,
      };
}

class Sale {
  final String id;
  final String martId;
  final String? cashierId;
  final String? cashierName;
  final String receiptId;
  final List<SaleItem> items;
  final double subtotal;
  final Map<String, dynamic>? discount;
  final List<Map<String, dynamic>> extraCharges;
  final double tax;
  final double taxRate;
  final double total;
  final String? paymentMethod;
  final DateTime? date;

  Sale({
    required this.id,
    required this.martId,
    required this.receiptId,
    required this.items,
    required this.subtotal,
    required this.tax,
    required this.taxRate,
    required this.total,
    this.cashierId,
    this.cashierName,
    this.discount,
    this.extraCharges = const [],
    this.paymentMethod,
    this.date,
  });

  factory Sale.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    final items = rawItems is List
        ? rawItems
            .map((e) => SaleItem.fromJson(Map<String, dynamic>.from(e)))
            .toList()
        : <SaleItem>[];

    return Sale(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      martId: json['martId']?.toString() ?? '',
      cashierId: json['cashierId']?.toString(),
      cashierName: json['cashierName']?.toString(),
      receiptId: json['receiptId']?.toString() ?? '',
      items: items,
      subtotal: (json['subtotal'] ?? 0).toDouble(),
      discount: json['discount'] is Map
          ? Map<String, dynamic>.from(json['discount'] as Map)
          : null,
      extraCharges: json['extraCharges'] is List
          ? (json['extraCharges'] as List)
              .map((e) => Map<String, dynamic>.from(e as Map))
              .toList()
          : const [],
      tax: (json['tax'] ?? 0).toDouble(),
      taxRate: (json['taxRate'] ?? 0).toDouble(),
      total: (json['total'] ?? 0).toDouble(),
      paymentMethod: json['paymentMethod']?.toString(),
      date: json['date'] != null ? DateTime.tryParse(json['date'].toString()) : null,
    );
  }
}
