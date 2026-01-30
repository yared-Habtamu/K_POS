import 'package:flutter/material.dart';

class OwnerInventoryPage extends StatefulWidget {
  const OwnerInventoryPage({super.key});

  @override
  State<OwnerInventoryPage> createState() => _OwnerInventoryPageState();
}

class _OwnerInventoryPageState extends State<OwnerInventoryPage> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final all = _mockInventory();
    final q = _query.trim().toLowerCase();

    final filtered = all.where((p) {
      if (q.isEmpty) return true;
      return p.name.toLowerCase().contains(q) ||
          p.category.toLowerCase().contains(q) ||
          p.barcode.toLowerCase().contains(q);
    }).toList();

    // Match screenshot footer: showing 1-7 of 8
    final pageItems = filtered.take(7).toList();

    return SingleChildScrollView(
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
            const SizedBox(height: 12),
            _SearchBar(
              controller: _searchController,
              onChanged: (v) => setState(() => _query = v),
            ),
            const SizedBox(height: 14),
            _InventoryTable(items: pageItems),
            const SizedBox(height: 12),
            _FooterPager(showing: pageItems.length, total: filtered.length),
          ],
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
    final headerStyle = TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.grey.shade700);

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
              DataCell(Text(p.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
              DataCell(Text(p.category, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
              DataCell(Text('${p.sold}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
              DataCell(Text('${p.remain}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
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

class _FooterPager extends StatelessWidget {
  final int showing;
  final int total;

  const _FooterPager({required this.showing, required this.total});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 650;

        final left = Text(
          'Showing 1-$showing of $total products',
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        );

        final pager = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _PagerButton(
              label: 'Prev',
              enabled: false,
              onPressed: () {},
            ),
            const SizedBox(width: 6),
            _PagePill(
              label: '1',
              selected: true,
              onTap: () {},
            ),
            const SizedBox(width: 6),
            _PagePill(
              label: '2',
              selected: false,
              onTap: () {},
            ),
            const SizedBox(width: 6),
            _PagerButton(
              label: 'Next',
              enabled: true,
              onPressed: () {},
            ),
          ],
        );

        if (isNarrow) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              left,
              const SizedBox(height: 10),
              pager,
            ],
          );
        }

        return Row(
          children: [
            Expanded(child: left),
            pager,
          ],
        );
      },
    );
  }
}

class _PagerButton extends StatelessWidget {
  final String label;
  final bool enabled;
  final VoidCallback onPressed;

  const _PagerButton({
    required this.label,
    required this.enabled,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: enabled ? onPressed : null,
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        side: BorderSide(color: Colors.grey.shade300),
        foregroundColor: Colors.grey.shade800,
      ),
      child: Text(label),
    );
  }
}

class _PagePill extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _PagePill({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final fg = selected ? Colors.white : Colors.grey.shade800;
    final bg = selected ? Colors.blue.shade900 : Colors.white;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 34,
        height: 34,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Text(label, style: TextStyle(color: fg, fontWeight: FontWeight.w800)),
      ),
    );
  }
}

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
