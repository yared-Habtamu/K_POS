import 'package:flutter/material.dart';

class ManagerAssetsPage extends StatefulWidget {
  const ManagerAssetsPage({super.key});

  @override
  State<ManagerAssetsPage> createState() => _ManagerAssetsPageState();
}

class _ManagerAssetsPageState extends State<ManagerAssetsPage> {
  final _nameController = TextEditingController();
  final _qtyController = TextEditingController();

  final List<_AssetItem> _items = const [
    _AssetItem(name: 'chair', qty: 2),
    _AssetItem(name: 'Table', qty: 1),
    _AssetItem(name: 'Scanner', qty: 1),
    _AssetItem(name: 'Computer', qty: 1),
    _AssetItem(name: 'Cash Register', qty: 2),
  ].toList();

  @override
  void dispose() {
    _nameController.dispose();
    _qtyController.dispose();
    super.dispose();
  }

  void _add() {
    final name = _nameController.text.trim();
    final qty = int.tryParse(_qtyController.text.trim()) ?? 0;
    if (name.isEmpty || qty <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Provide valid name and quantity')));
      return;
    }
    setState(() {
      _items.add(_AssetItem(name: name, qty: qty));
      _nameController.clear();
      _qtyController.clear();
    });
  }

  void _remove(int idx) {
    setState(() => _items.removeAt(idx));
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Removed (mock)')));
  }

  void _exportCsv() {
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Exported CSV (mock)')));
  }

  void _print() {
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Print (mock)')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 6),
                      Text('Register company assets quickly',
                          style: TextStyle(
                              fontSize: 14, color: Colors.grey.shade700)),
                    ],
                  ),
                ),
                Row(
                  children: [
                    ElevatedButton(
                        onPressed: _exportCsv,
                        style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue.shade900),
                        child: const Text('Export CSV')),
                    const SizedBox(width: 8),
                    OutlinedButton(onPressed: _print, child: const Text('Print')),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _nameController,
                          decoration: InputDecoration(
                              hintText: 'Asset name',
                              border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide:
                                      BorderSide(color: Colors.grey.shade200))),
                        ),
                      ),
                      const SizedBox(width: 10),
                      SizedBox(
                        width: 140,
                        child: TextField(
                          controller: _qtyController,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                              hintText: 'Quantity',
                              border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide:
                                      BorderSide(color: Colors.grey.shade200))),
                        ),
                      ),
                      const SizedBox(width: 10),
                      SizedBox(
                        height: 46,
                        child: ElevatedButton(
                            onPressed: _add,
                            style: ElevatedButton.styleFrom(
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10))),
                            child: const Text('Add')),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const SizedBox(height: 4),
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _items.length,
                    itemBuilder: (context, idx) {
                      final item = _items[idx];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(item.name,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700)),
                                    const SizedBox(height: 4),
                                    Text('Qty: ${item.qty}',
                                        style: TextStyle(
                                            color: Colors.grey.shade700)),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              SizedBox(
                                height: 36,
                                child: OutlinedButton(
                                  onPressed: () => _remove(idx),
                                  style: OutlinedButton.styleFrom(
                                      side:
                                          BorderSide(color: Colors.red.shade300),
                                      foregroundColor: Colors.red.shade700,
                                      shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(8))),
                                  child: const Text('Remove'),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AssetItem {
  final String name;
  final int qty;

  const _AssetItem({required this.name, required this.qty});
}
