class Product {
  final String id;
  final String martId;
  final String name;
  final String category;
  final String unit;
  final double purchasePrice;
  final double sellingPrice;
  final int quantity;
  final int storeQuantity;
  final int supermarketQuantity;
  final int lowStockThreshold;
  final String? expiryDate;
  final List<String> barcodes;
  final String? imageUrl;
  final String? createdBy;

  Product({
    required this.id,
    required this.martId,
    required this.name,
    required this.category,
    required this.unit,
    required this.purchasePrice,
    required this.sellingPrice,
    required this.quantity,
    required this.storeQuantity,
    required this.supermarketQuantity,
    required this.lowStockThreshold,
    this.expiryDate,
    this.barcodes = const [],
    this.imageUrl,
    this.createdBy,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      martId: json['martId']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      unit: json['unit']?.toString() ?? 'pcs',
      purchasePrice: (json['purchasePrice'] ?? 0).toDouble(),
      sellingPrice: (json['sellingPrice'] ?? 0).toDouble(),
      quantity: (json['quantity'] ?? 0).toInt(),
      storeQuantity: (json['storeQuantity'] ?? 0).toInt(),
      supermarketQuantity: (json['supermarketQuantity'] ?? 0).toInt(),
      lowStockThreshold: (json['lowStockThreshold'] ?? 10).toInt(),
      expiryDate: json['expiryDate']?.toString(),
      barcodes:
          (json['barcodes'] as List?)?.map((e) => e.toString()).toList() ?? [],
      imageUrl: json['imageUrl']?.toString(),
      createdBy: json['createdBy']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'martId': martId,
        'name': name,
        'category': category,
        'unit': unit,
        'purchasePrice': purchasePrice,
        'sellingPrice': sellingPrice,
        'quantity': quantity,
        'storeQuantity': storeQuantity,
        'supermarketQuantity': supermarketQuantity,
        'lowStockThreshold': lowStockThreshold,
        'expiryDate': expiryDate,
        'barcodes': barcodes,
        'imageUrl': imageUrl,
        'createdBy': createdBy,
      };

  isExpiringSoon({required int days}) {}
}
