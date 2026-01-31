class POSProduct {
  final String name;
  final String category;
  final int priceEtb;
  final List<String> barcodes;
  final String? imageUrl;
  final List<String> reviews;

  const POSProduct({
    required this.name,
    required this.category,
    required this.priceEtb,
    required this.barcodes,
    this.imageUrl,
    this.reviews = const [],
  });
}

List<POSProduct> mockProducts() {
  return const [
    POSProduct(
      name: 'Blue Magic',
      category: 'Personal Care',
      priceEtb: 450,
      barcodes: ['767083286885'],
      imageUrl:
          'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&auto=format&fit=crop',
      reviews: ['Great smell', 'Lasts long', 'Worth the price'],
    ),
    POSProduct(
      name: 'Diva',
      category: 'Household',
      priceEtb: 75,
      barcodes: ['766905020772', '766905023088'],
      imageUrl:
          'https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?w=1200&auto=format&fit=crop',
      reviews: ['Very cleaning', 'Value for money'],
    ),
    POSProduct(
      name: 'Fanta',
      category: 'Beverages',
      priceEtb: 35,
      barcodes: ['766005603970'],
      imageUrl: '',
      reviews: ['Tasty', 'Sweet but refreshing'],
    ),
  ];
}
