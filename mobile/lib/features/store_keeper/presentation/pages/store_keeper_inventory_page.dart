import 'package:flutter/material.dart';
import 'package:pos_app/features/store_keeper/presentation/pages/store_keeper_barcode_scanner_page.dart';
import 'package:pos_app/features/products/domain/product_repository.dart';
import 'package:pos_app/services/api/api_config.dart';
import 'package:pos_app/services/api/api_client.dart';
import 'package:pos_app/services/api/auth_storage.dart';
import 'package:provider/provider.dart';
import 'package:pos_app/services/get_current_user.dart';

class StoreKeeperInventoryPage extends StatefulWidget {
  const StoreKeeperInventoryPage({super.key});

  @override
  State<StoreKeeperInventoryPage> createState() =>
      _StoreKeeperInventoryPageState();
}

class _StoreKeeperInventoryPageState extends State<StoreKeeperInventoryPage> {
  final TextEditingController _searchController = TextEditingController();

  String _query = '';
  bool _isLoading = false;
  String? _fetchError;
  List<_InventoryItem> _items = [];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _loadInventory();
  }

  Future<void> _loadInventory() async {
    setState(() {
      _isLoading = true;
      _fetchError = null;
    });

    try {
      // Fetch products for the current user's mart
      final repo = ProductRepository();
      final products = await repo.listProducts();

      // Fetch sales to compute sold counts
      final auth = AuthStorage();
      final user = await auth.readUser();
      final martId = user?['martId'];

      final client = ApiClient(baseUrl: ApiConfig.baseUrl, authStorage: auth);
      List<dynamic> sales = [];
      try {
        final res = await client.getJson(
            '${ApiConfig.apiPrefix}/sales${martId != null ? '?martId=$martId' : ''}');
        sales = res['data'] ?? res;
      } catch (e) {
        // ignore sales fetch errors but continue with products
        debugPrint('[inventory] failed to fetch sales: $e');
      }

      final Map<String, int> soldMap = {};
      for (final s in (sales as List<dynamic>? ?? [])) {
        for (final it in (s['items'] as List<dynamic>? ?? [])) {
          final pid = (it['productId'] ??
                  it['product']?['_id'] ??
                  it['product']?['id'] ??
                  it['id'] ??
                  '')
              .toString();
          if (pid.isEmpty) continue;
          soldMap[pid] = (soldMap[pid] ?? 0) +
              (int.tryParse('${it['quantity'] ?? 0}') ?? 0);
        }
      }

      final items = products.map((p) {
        final id = p.id;
        final sold = soldMap[id] ?? 0;
        final available =
            (p.quantity + p.supermarketQuantity + p.storeQuantity) > 0
                ? (p.quantity > 0
                    ? p.quantity
                    : (p.supermarketQuantity > 0
                        ? p.supermarketQuantity
                        : p.storeQuantity))
                : 0;
        final remaining = available - sold;
        return _InventoryItem(
          id: id ?? '',
          name: p.name ?? '',
          category: p.category ?? '',
          sold: sold,
          remaining: remaining < 0 ? 0 : remaining,
          imageUrl: p.imageUrl ?? '',
        );
      }).toList();

      setState(() {
        _items = items;
        _isLoading = false;
      });
    } catch (e, st) {
      debugPrint('[inventory] load failed: $e\n$st');
      setState(() {
        _fetchError = e.toString() ?? 'Failed to load inventory';
        // No mock fallbacks — clear items and show the error to the user
        _items = [];
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final items =
        _applySearch(_isLoading ? <_InventoryItem>[] : _items, _query);

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
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  IconButton(
                    onPressed: _loadInventory,
                    icon: const Icon(Icons.refresh),
                    tooltip: 'Refresh',
                  ),
                ],
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
                                    ? 0.80
                                    : 0.68,
                  ),
                  itemBuilder: (context, index) {
                    final item = items[index];
                    return _InventoryCard(
                      item: item,
                      onEditBarcodes: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                const StoreKeeperBarcodeScannerPage(),
                          ),
                        );
                      },
                      onAddImage: () => _toast('Add Image: ${item.name}'),
                      onAddStock: () => showAddStockDialog(context, item),
                    );
                  },
                ),
              ),
              if (_isLoading) const SizedBox(height: 12),
              if (_fetchError != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12.0),
                  child: Text('Failed to load inventory: $_fetchError',
                      style: TextStyle(color: Colors.red.shade700)),
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
          (i) =>
              i.name.toLowerCase().contains(q) ||
              i.category.toLowerCase().contains(q),
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
                child: Icon(Icons.inventory_2_outlined,
                    color: Colors.grey.shade800),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style:
                    const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
              ),
              const SizedBox(width: 10),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                      fontWeight: FontWeight.w700, color: Colors.grey.shade800),
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

          final content = Column(
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
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.category,
                          style: TextStyle(
                              fontSize: 13, color: Colors.grey.shade700),
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
                        style: TextStyle(
                            fontSize: 14, color: Colors.grey.shade700),
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
                        style: TextStyle(
                            fontSize: 14, color: Colors.grey.shade700),
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

          // If the tile height is tight on smaller phones, allow the card to scroll internally
          if (constraints.hasBoundedHeight && constraints.maxHeight < 380) {
            return ClipRect(
              child: SingleChildScrollView(
                child: content,
              ),
            );
          }

          return content;
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

Future<void> showAddStockDialog(
    BuildContext context, _InventoryItem item) async {
  final warehouseStock =
      item.sold + item.remaining; // total available in warehouse
  final supermarketStock = item.remaining;
  final controller = TextEditingController();

  await showDialog<void>(
    context: context,
    builder: (ctx) {
      return Dialog(
        insetPadding: const EdgeInsets.all(16),
        child: ConstrainedBox(
          constraints: BoxConstraints(
              maxWidth: 520, maxHeight: MediaQuery.of(ctx).size.height * 0.9),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    const Expanded(
                        child: Text('Add Stock',
                            style: TextStyle(
                                fontSize: 20, fontWeight: FontWeight.w700))),
                    IconButton(
                        onPressed: () => Navigator.of(ctx).pop(),
                        icon: const Icon(Icons.close)),
                  ],
                ),
              ),
              const Divider(height: 1),

              Flexible(
                child: SingleChildScrollView(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Product preview
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(12)),
                        child: Row(
                          children: [
                            ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                    height: 56,
                                    width: 56,
                                    color: Colors.grey.shade200,
                                    child: item.imageUrl != null &&
                                            item.imageUrl!.isNotEmpty
                                        ? Image.network(item.imageUrl!,
                                            fit: BoxFit.cover)
                                        : const Icon(Icons.inventory_2_outlined,
                                            size: 30, color: Colors.grey))),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(item.name,
                                        style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w700)),
                                    const SizedBox(height: 4),
                                    Text(item.category,
                                        style: TextStyle(
                                            color: Colors.grey.shade700)),
                                    const SizedBox(height: 6),
                                    // mock barcode display
                                    Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                            color: Colors.white,
                                            borderRadius:
                                                BorderRadius.circular(10),
                                            border: Border.all(
                                                color: Colors.grey.shade300)),
                                        child: const Text('||||'))
                                  ]),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 14),

                      // Stock boxes
                      Row(
                        children: [
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                  color: Colors.orange.shade50,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                      color: Colors.orange.shade100)),
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(children: [
                                      Icon(Icons.warehouse,
                                          color: Colors.orange.shade700),
                                      const SizedBox(width: 8),
                                      Expanded(
                                          child: Text('Warehouse Stock',
                                              style: TextStyle(
                                                  color:
                                                      Colors.orange.shade700),
                                              overflow: TextOverflow.ellipsis))
                                    ]),
                                    const SizedBox(height: 8),
                                    Text('$warehouseStock',
                                        style: TextStyle(
                                            fontSize: 28,
                                            fontWeight: FontWeight.w800,
                                            color: Colors.orange.shade700)),
                                  ]),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                  color: Colors.green.shade50,
                                  borderRadius: BorderRadius.circular(12),
                                  border:
                                      Border.all(color: Colors.green.shade100)),
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(children: [
                                      Icon(Icons.store,
                                          color: Colors.green.shade700),
                                      const SizedBox(width: 8),
                                      Expanded(
                                          child: Text('Supermarket Stock',
                                              style: TextStyle(
                                                  color: Colors.green.shade700),
                                              overflow: TextOverflow.ellipsis))
                                    ]),
                                    const SizedBox(height: 8),
                                    Text('$supermarketStock',
                                        style: TextStyle(
                                            fontSize: 28,
                                            fontWeight: FontWeight.w800,
                                            color: Colors.green.shade700)),
                                  ]),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 14),

                      // Quantity input
                      const Text(
                          'Quantity to Transfer (Warehouse → Supermarket)',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        height: 54,
                        decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.blue.shade200),
                            color: Colors.white),
                        child: Row(children: [
                          Expanded(
                            child: TextField(
                              controller: controller,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                  border: InputBorder.none,
                                  hintText: 'Enter quantity'),
                            ),
                          ),
                          Icon(Icons.arrow_drop_up_outlined,
                              color: Colors.grey.shade600),
                        ]),
                      ),
                      const SizedBox(height: 6),
                      Text('Max available: $warehouseStock units',
                          style: TextStyle(color: Colors.grey.shade600)),
                    ],
                  ),
                ),
              ),

              const Divider(height: 1),

              // Actions
              Padding(
                padding: const EdgeInsets.all(12.0),
                child: LayoutBuilder(
                  builder: (context, c) {
                    final veryNarrow = c.maxWidth < 320;
                    // Compute permission once and reuse in both narrow and wide layouts
                    bool canTransfer = true;
                    try {
                      final userProvider =
                          Provider.of<UserProvider>(context, listen: false);
                      final current = userProvider.user;
                      if (current != null &&
                          (current.role.toLowerCase().contains('store') ||
                              current.role.toLowerCase().contains('keeper'))) {
                        final perms = current.permissions ?? [];
                        if (!perms.contains('transferStock'))
                          canTransfer = false;
                      }
                    } catch (e) {
                      // ignore provider errors and fallback to server enforcement
                    }

                    if (veryNarrow) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          OutlinedButton(
                              onPressed: () => Navigator.of(ctx).pop(),
                              child: const Text('Cancel')),
                          const SizedBox(height: 8),
                          SizedBox(
                            height: 44,
                            child: Tooltip(
                              message: canTransfer
                                  ? ''
                                  : 'Not authorized to transfer stock',
                              child: ElevatedButton.icon(
                                onPressed: canTransfer
                                    ? () async {
                                        final val = int.tryParse(
                                                controller.text.trim()) ??
                                            0;
                                        if (val <= 0) {
                                          ScaffoldMessenger.of(context)
                                              .showSnackBar(const SnackBar(
                                                  content: Text(
                                                      'Enter a valid quantity')));
                                          return;
                                        }
                                        if (val > warehouseStock) {
                                          ScaffoldMessenger.of(context)
                                              .showSnackBar(const SnackBar(
                                                  content: Text(
                                                      'Quantity exceeds warehouse stock')));
                                          return;
                                        }

                                        try {
                                          final auth = AuthStorage();
                                          final client = ApiClient(
                                              baseUrl: ApiConfig.baseUrl,
                                              authStorage: auth);
                                          final res = await client.postJson(
                                              '${ApiConfig.apiPrefix}/stock-transfer-requests',
                                              body: {
                                                'productId': item.id,
                                                'quantity': val
                                              });
                                          Navigator.of(ctx).pop();
                                          ScaffoldMessenger.of(context)
                                              .showSnackBar(SnackBar(
                                                  content: Text(res[
                                                          'message'] ??
                                                      'Transfer request submitted for approval')));
                                        } catch (e) {
                                          final msg = e is ApiException
                                              ? e.message
                                              : e.toString();
                                          ScaffoldMessenger.of(context)
                                              .showSnackBar(SnackBar(
                                                  content: Text(
                                                      'Failed to submit transfer: $msg')));
                                        }
                                      }
                                    : null,
                                icon: const Icon(Icons.add),
                                label: const Text('Transfer Stock'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.blue.shade900,
                                  foregroundColor: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ],
                      );
                    }

                    return Row(
                      children: [
                        Expanded(
                            child: OutlinedButton(
                                onPressed: () => Navigator.of(ctx).pop(),
                                child: const Text('Cancel'))),
                        const SizedBox(width: 12),
                        SizedBox(
                          height: 44,
                          child: Tooltip(
                            message: canTransfer
                                ? ''
                                : 'Not authorized to transfer stock',
                            child: ElevatedButton.icon(
                              onPressed: canTransfer
                                  ? () async {
                                      final val = int.tryParse(
                                              controller.text.trim()) ??
                                          0;
                                      if (val <= 0) {
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(const SnackBar(
                                                content: Text(
                                                    'Enter a valid quantity')));
                                        return;
                                      }
                                      if (val > warehouseStock) {
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(const SnackBar(
                                                content: Text(
                                                    'Quantity exceeds warehouse stock')));
                                        return;
                                      }

                                      try {
                                        final auth = AuthStorage();
                                        final client = ApiClient(
                                            baseUrl: ApiConfig.baseUrl,
                                            authStorage: auth);
                                        final res = await client.postJson(
                                            '${ApiConfig.apiPrefix}/stock-transfer-requests',
                                            body: {
                                              'productId': item.id,
                                              'quantity': val
                                            });
                                        Navigator.of(ctx).pop();
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(SnackBar(
                                                content: Text(res['message'] ??
                                                    'Transfer request submitted for approval')));
                                      } catch (e) {
                                        final msg = e is ApiException
                                            ? e.message
                                            : e.toString();
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(SnackBar(
                                                content: Text(
                                                    'Failed to submit transfer: $msg')));
                                      }
                                    }
                                  : null,
                              icon: const Icon(Icons.add),
                              label: const Text('Transfer Stock'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue.shade900,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              )
            ],
          ),
        ),
      );
    },
  );
}

class _InventoryItem {
  final String id;
  final String name;
  final String category;
  final int sold;
  final int remaining;
  final String? imageUrl;

  const _InventoryItem({
    required this.id,
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
      id: 'mock-1',
      name: 'Blue Magic',
      category: 'Personal Care',
      sold: 10,
      remaining: 160,
      imageUrl:
          'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&auto=format&fit=crop',
    ),
    _InventoryItem(
      id: 'mock-2',
      name: 'Diva',
      category: 'Household',
      sold: 0,
      remaining: 0,
      imageUrl:
          'https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?w=1200&auto=format&fit=crop',
    ),
    _InventoryItem(
      id: 'mock-3',
      name: 'Fanta',
      category: 'Beverages',
      sold: 10,
      remaining: 11,
      imageUrl: '',
    ),
    _InventoryItem(
      id: 'mock-4',
      name: 'Coca Cola',
      category: 'Beverages',
      sold: 23,
      remaining: 57,
      imageUrl: '',
    ),
    _InventoryItem(
      id: 'mock-5',
      name: 'Tissue Roll',
      category: 'Household',
      sold: 7,
      remaining: 41,
      imageUrl: '',
    ),
    _InventoryItem(
      id: 'mock-6',
      name: 'Rice (5kg)',
      category: 'Groceries',
      sold: 4,
      remaining: 19,
      imageUrl: '',
    ),
    _InventoryItem(
      id: 'mock-7',
      name: 'Cooking Oil',
      category: 'Groceries',
      sold: 12,
      remaining: 33,
      imageUrl: '',
    ),
    _InventoryItem(
      id: 'mock-8',
      name: 'Soap',
      category: 'Personal Care',
      sold: 18,
      remaining: 120,
      imageUrl: '',
    ),
  ];
}
