import 'package:flutter/material.dart';

class StoreKeeperBarcodeScannerPage extends StatefulWidget {
  const StoreKeeperBarcodeScannerPage({super.key});

  @override
  State<StoreKeeperBarcodeScannerPage> createState() => _StoreKeeperBarcodeScannerPageState();
}

class _StoreKeeperBarcodeScannerPageState extends State<StoreKeeperBarcodeScannerPage> {
  final TextEditingController _controller = TextEditingController();

  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final allItems = _mockProducts();
    final items = _filter(allItems, _query);

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final crossAxisCount = width >= 1000
            ? 3
            : width >= 650
                ? 2
                : 1;

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Barcode Scanner',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 14),
              _ScannerSearchCard(
                controller: _controller,
                onChanged: (value) => setState(() => _query = value),
                onSearch: () {
                  setState(() => _query = _controller.text);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Search (mock)')),
                  );
                },
              ),
              const SizedBox(height: 16),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: items.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: crossAxisCount,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                    childAspectRatio: width >= 1200
                      ? 0.78
                      : width >= 1000
                        ? 0.82
                        : width >= 650
                          ? 0.88
                          : 0.86,
                ),
                itemBuilder: (context, index) {
                  return _BarcodeProductCard(product: items[index]);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  List<_BarcodeProduct> _filter(List<_BarcodeProduct> items, String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return items;

    return items
        .where(
          (p) => p.name.toLowerCase().contains(q) ||
              p.category.toLowerCase().contains(q) ||
              p.barcodes.any((b) => b.contains(q)),
        )
        .toList();
  }
}

class _ScannerSearchCard extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onSearch;

  const _ScannerSearchCard({
    required this.controller,
    required this.onChanged,
    required this.onSearch,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isNarrow = constraints.maxWidth < 520;

          final field = _SearchField(controller: controller, onChanged: onChanged);
          final button = SizedBox(
            height: 54,
            child: ElevatedButton.icon(
              onPressed: onSearch,
              icon: const Icon(Icons.search),
              label: const Text('Search'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade900,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 22),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          );

          return isNarrow
              ? Column(
                  children: [
                    field,
                    const SizedBox(height: 12),
                    SizedBox(width: double.infinity, child: button),
                  ],
                )
              : Row(
                  children: [
                    Expanded(child: field),
                    const SizedBox(width: 12),
                    button,
                  ],
                );
        },
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  const _SearchField({required this.controller, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 54,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.blue.shade900, width: 2),
      ),
      child: Row(
        children: [
          Icon(Icons.qr_code_2, color: Colors.grey.shade700),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              decoration: const InputDecoration(
                hintText: 'Scan or enter barcode...',
                border: InputBorder.none,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BarcodeProductCard extends StatelessWidget {
  final _BarcodeProduct product;

  const _BarcodeProductCard({required this.product});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CardImage(imageUrl: product.imageUrl),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  product.category,
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Text(
                      '${product.priceEtb} ETB',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Colors.blue.shade900,
                      ),
                    ),
                    const Spacer(),
                    Flexible(
                      child: Text(
                        product.barcodes.join(', '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                        textAlign: TextAlign.right,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CardImage extends StatelessWidget {
  final String? imageUrl;

  const _CardImage({required this.imageUrl});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 220,
      width: double.infinity,
      color: Colors.grey.shade200,
      child: imageUrl == null || imageUrl!.trim().isEmpty
          ? Center(
              child: Icon(Icons.inventory_2_outlined, size: 44, color: Colors.grey.shade600),
            )
          : Image.network(
              imageUrl!,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Center(
                  child: Icon(Icons.inventory_2_outlined, size: 44, color: Colors.grey.shade600),
                );
              },
            ),
    );
  }
}

class _BarcodeProduct {
  final String name;
  final String category;
  final int priceEtb;
  final List<String> barcodes;
  final String? imageUrl;

  const _BarcodeProduct({
    required this.name,
    required this.category,
    required this.priceEtb,
    required this.barcodes,
    this.imageUrl,
  });
}

List<_BarcodeProduct> _mockProducts() {
  return const [
    _BarcodeProduct(
      name: 'Blue Magic',
      category: 'Personal Care',
      priceEtb: 450,
      barcodes: ['767083286885'],
      imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&auto=format&fit=crop',
    ),
    _BarcodeProduct(
      name: 'Diva',
      category: 'Household',
      priceEtb: 75,
      barcodes: ['766905020772', '766905023088'],
      imageUrl: 'https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?w=1200&auto=format&fit=crop',
    ),
    _BarcodeProduct(
      name: 'Fanta',
      category: 'Beverages',
      priceEtb: 35,
      barcodes: ['766005603970'],
      imageUrl: '',
    ),
  ];
}
