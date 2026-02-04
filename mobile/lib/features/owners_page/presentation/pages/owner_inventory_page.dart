import 'package:flutter/material.dart';
import 'package:pos_app/features/products/domain/product_repository.dart';
import 'package:pos_app/services/api/api_client.dart';
import 'package:pos_app/services/api/api_config.dart';
import 'package:pos_app/services/api/auth_storage.dart';

class OwnerInventoryPage extends StatefulWidget {
  const OwnerInventoryPage({super.key});

  @override
  State<OwnerInventoryPage> createState() => _OwnerInventoryPageState();
}

class _OwnerInventoryPageState extends State<OwnerInventoryPage> {
  final _searchController = TextEditingController();
  String _query = '';
  bool _isLoading = false;
  String? _fetchError;
  List<_InventoryRow> _items = [];

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
      final repo = ProductRepository();
      final products = await repo.listProducts();

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
        print('[owner-inventory] failed to fetch sales: $e');
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
        final barcode = (p.barcodes.isNotEmpty) ? p.barcodes[0].toString() : '';
        return _InventoryRow(
          name: p.name ?? '',
          category: p.category ?? '',
          sold: sold,
          remain: remaining < 0 ? 0 : remaining,
          barcode: barcode,
        );
      }).toList();

      setState(() {
        _items = items;
        _isLoading = false;
      });
    } catch (e, st) {
      print('[owner-inventory] load failed: $e\n$st');
      setState(() {
        _fetchError = e?.toString() ?? 'Failed to load inventory';
        _items = _mockInventory();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final source = _isLoading ? _mockInventory() : _items;
    final q = _query.trim().toLowerCase();

    final filtered = source.where((p) {
      if (q.isEmpty) return true;
      return p.name.toLowerCase().contains(q) ||
          p.category.toLowerCase().contains(q) ||
          p.barcode.toLowerCase().contains(q);
    }).toList();
    // Show full filtered list on mobile (no server-side paging here)
    final pageItems = filtered.toList();

    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Container(
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
                  Expanded(
                    child: _SearchBar(
                      controller: _searchController,
                      onChanged: (v) => setState(() => _query = v),
                    ),
                  ),
                  const SizedBox(width: 12),
                  IconButton(
                    onPressed: _loadInventory,
                    icon: const Icon(Icons.refresh),
                    tooltip: 'Refresh',
                  ),
                ],
              ),
              const SizedBox(height: 14),
              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Center(child: CircularProgressIndicator()),
                ),
              _InventoryTable(items: pageItems),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.only(bottom: 8.0),
                child: Text(
                    'Showing 1-${pageItems.length} of ${filtered.length} products',
                    style:
                        TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              ),
              if (_fetchError != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text('Failed to load from server: $_fetchError',
                      style: TextStyle(color: Colors.red.shade700)),
                ),
            ],
          ),
        ),
      ),
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
      height: 46,
      padding: const EdgeInsets.symmetric(horizontal: 12),
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
                hintText: 'Search by name, barcode or category...',
                border: InputBorder.none,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InventoryTable extends StatelessWidget {
  final List<_InventoryRow> items;

  const _InventoryTable({required this.items});

  @override
  Widget build(BuildContext context) {
    final headerStyle = TextStyle(
        fontSize: 12, fontWeight: FontWeight.w700, color: Colors.grey.shade700);

    final columns = <DataColumn>[
      DataColumn(label: Text('Img', style: headerStyle)),
      DataColumn(label: Text('Name', style: headerStyle)),
      DataColumn(label: Text('Category', style: headerStyle)),
      DataColumn(label: Text('Sold', style: headerStyle)),
      DataColumn(label: Text('Remain', style: headerStyle)),
    ];

    final rows = items
        .map(
          (p) => DataRow(
            cells: [
              DataCell(_Thumb(imageAsset: p.imageAsset)),
              DataCell(Text(p.name,
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600))),
              DataCell(Text(p.category,
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600))),
              DataCell(Text('${p.sold}',
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600))),
              DataCell(Text('${p.remain}',
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600))),
            ],
          ),
        )
        .toList();

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            headingRowHeight: 44,
            dataRowMinHeight: 54,
            dataRowMaxHeight: 66,
            horizontalMargin: 16,
            columnSpacing: 28,
            dividerThickness: 0.6,
            columns: columns,
            rows: rows,
          ),
        ),
      ),
    );
  }
}

class _Thumb extends StatelessWidget {
  final String? imageAsset;

  const _Thumb({required this.imageAsset});

  @override
  Widget build(BuildContext context) {
    final fallback = Container(
      width: 34,
      height: 34,
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.grey.shade300),
      ),
    );

    if (imageAsset == null) return fallback;

    return ClipRRect(
      borderRadius: BorderRadius.circular(6),
      child: Image.asset(
        imageAsset!,
        width: 34,
        height: 34,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallback,
      ),
    );
  }
}

// Footer pager removed for mobile inventory — list shows full results and a simple count

class _InventoryRow {
  final String name;
  final String category;
  final int sold;
  final int remain;
  final String barcode;
  final String? imageAsset;

  const _InventoryRow({
    required this.name,
    required this.category,
    required this.sold,
    required this.remain,
    required this.barcode,
    this.imageAsset,
  });
}

List<_InventoryRow> _mockInventory() {
  return const [
    _InventoryRow(
      name: 'Blue Magic',
      category: 'Personal Care',
      sold: 7,
      remain: 160,
      barcode: '0001',
    ),
    _InventoryRow(
      name: 'Diva',
      category: 'Household',
      sold: 0,
      remain: 0,
      barcode: '0002',
    ),
    _InventoryRow(
      name: 'Fanta',
      category: 'Beverages',
      sold: 10,
      remain: 11,
      barcode: '0003',
    ),
    _InventoryRow(
      name: 'Fanta 2L',
      category: 'Beverages',
      sold: 4,
      remain: 16,
      barcode: '0004',
    ),
    _InventoryRow(
      name: 'Holand',
      category: 'Dairy',
      sold: 3,
      remain: 40,
      barcode: '0005',
    ),
    _InventoryRow(
      name: 'coca',
      category: 'Beverages',
      sold: 23,
      remain: 78,
      barcode: '0006',
    ),
    _InventoryRow(
      name: 'tab',
      category: 'Household',
      sold: 0,
      remain: 9,
      barcode: '0007',
    ),
    _InventoryRow(
      name: 'Sunlight',
      category: 'Household',
      sold: 2,
      remain: 12,
      barcode: '0008',
    ),
  ];
}
