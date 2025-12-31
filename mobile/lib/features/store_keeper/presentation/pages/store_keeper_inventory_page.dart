import 'package:flutter/material.dart';
import 'package:pos_app/features/store_keeper/presentation/pages/store_keeper_barcode_scanner_page.dart';

class StoreKeeperInventoryPage extends StatefulWidget {
  const StoreKeeperInventoryPage({super.key});

  @override
  State<StoreKeeperInventoryPage> createState() => _StoreKeeperInventoryPageState();
}

class _StoreKeeperInventoryPageState extends State<StoreKeeperInventoryPage> {
  final TextEditingController _searchController = TextEditingController();

  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final allItems = _mockItems();
    final items = _applySearch(allItems, _query);

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
                'Inventory',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                'Manage store and supermarket stock levels',
                style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
              ),
              const SizedBox(height: 16),
              _SearchBar(
                controller: _searchController,
                onChanged: (value) => setState(() => _query = value),
              ),
              const SizedBox(height: 16),
              _SectionCard(
                title: 'Inventory',
                count: items.length,
                child: GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: items.length,
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: crossAxisCount,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    // Make tiles taller so the card actions never overflow.
                    childAspectRatio: width >= 1200
                      ? 0.78
                      : width >= 1000
                        ? 0.82
                        : width >= 850
                          ? 0.86
                          : width >= 650
                            ? 0.9
                            : 0.82,
                  ),
                  itemBuilder: (context, index) {
                    final item = items[index];
                    return _InventoryCard(
                      item: item,
                      onEditBarcodes: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const StoreKeeperBarcodeScannerPage(),
                          ),
                        );
                      },
                      onAddImage: () => _toast('Add Image (mock): ${item.name}'),
                      onAddStock: () => _toast('Add Stock (mock): ${item.name}'),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  List<_InventoryItem> _applySearch(List<_InventoryItem> items, String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return items;
    return items
        .where(
          (i) => i.name.toLowerCase().contains(q) || i.category.toLowerCase().contains(q),
        )
        .toList();
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }
}

class _SearchBar extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  const _SearchBar({
    required this.controller,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      height: 54,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          Icon(Icons.search, color: Colors.grey.shade700),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              decoration: const InputDecoration(
                hintText: 'Search by name or barcode...',
                border: InputBorder.none,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final int count;
  final Widget child;

  const _SectionCard({
    required this.title,
    required this.count,
    required this.child,
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Icon(Icons.inventory_2_outlined, color: Colors.grey.shade800),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
              ),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(fontWeight: FontWeight.w700, color: Colors.grey.shade800),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _InventoryCard extends StatelessWidget {
  final _InventoryItem item;
  final VoidCallback onEditBarcodes;
  final VoidCallback onAddImage;
  final VoidCallback onAddStock;

  const _InventoryCard({
    required this.item,
    required this.onEditBarcodes,
    required this.onAddImage,
    required this.onAddStock,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isNarrow = constraints.maxWidth < 420;

          final editBtn = OutlinedButton.icon(
            onPressed: onEditBarcodes,
            icon: const Icon(Icons.qr_code_2, size: 18),
            label: const Text(
              'Edit Barcodes',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          );
          final imageBtn = OutlinedButton.icon(
            onPressed: onAddImage,
            icon: const Icon(Icons.image_outlined, size: 18),
            label: const Text(
              'Add Image',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          );

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _ImageArea(imageUrl: item.imageUrl),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.category,
                          style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'Sold',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade800,
                        ),
                      ),
                      Text(
                        '${item.sold}',
                        style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Remaining',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade800,
                        ),
                      ),
                      Text(
                        '${item.remaining}',
                        style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 14),
              if (isNarrow) ...[
                SizedBox(width: double.infinity, child: editBtn),
                const SizedBox(height: 10),
                SizedBox(width: double.infinity, child: imageBtn),
              ] else ...[
                Row(
                  children: [
                    Expanded(child: editBtn),
                    const SizedBox(width: 10),
                    Expanded(child: imageBtn),
                  ],
                ),
              ],
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onAddStock,
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text(
                    'Add Stock',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ImageArea extends StatelessWidget {
  final String? imageUrl;

  const _ImageArea({required this.imageUrl});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: Container(
        height: 120,
        width: double.infinity,
        color: Colors.grey.shade200,
        child: imageUrl == null || imageUrl!.trim().isEmpty
            ? Center(
                child: Icon(
                  Icons.inventory_2_outlined,
                  size: 34,
                  color: Colors.grey.shade600,
                ),
              )
            : Image.network(
                imageUrl!,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Center(
                    child: Icon(
                      Icons.inventory_2_outlined,
                      size: 34,
                      color: Colors.grey.shade600,
                    ),
                  );
                },
              ),
      ),
    );
  }
}

class _InventoryItem {
  final String name;
  final String category;
  final int sold;
  final int remaining;
  final String? imageUrl;

  const _InventoryItem({
    required this.name,
    required this.category,
    required this.sold,
    required this.remaining,
    this.imageUrl,
  });
}

List<_InventoryItem> _mockItems() {
  return const [
    _InventoryItem(
      name: 'Blue Magic',
      category: 'Personal Care',
      sold: 10,
      remaining: 160,
      imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&auto=format&fit=crop',
    ),
    _InventoryItem(
      name: 'Diva',
      category: 'Household',
      sold: 0,
      remaining: 0,
      imageUrl: 'https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?w=1200&auto=format&fit=crop',
    ),
    _InventoryItem(
      name: 'Fanta',
      category: 'Beverages',
      sold: 10,
      remaining: 11,
      imageUrl: '',
    ),
    _InventoryItem(
      name: 'Coca Cola',
      category: 'Beverages',
      sold: 23,
      remaining: 57,
      imageUrl: '',
    ),
    _InventoryItem(
      name: 'Tissue Roll',
      category: 'Household',
      sold: 7,
      remaining: 41,
      imageUrl: '',
    ),
    _InventoryItem(
      name: 'Rice (5kg)',
      category: 'Groceries',
      sold: 4,
      remaining: 19,
      imageUrl: '',
    ),
    _InventoryItem(
      name: 'Cooking Oil',
      category: 'Groceries',
      sold: 12,
      remaining: 33,
      imageUrl: '',
    ),
    _InventoryItem(
      name: 'Soap',
      category: 'Personal Care',
      sold: 18,
      remaining: 120,
      imageUrl: '',
    ),
  ];
}
