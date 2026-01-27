import 'package:flutter/material.dart';

class ManagerTodaysSalesPage extends StatelessWidget {
  const ManagerTodaysSalesPage({super.key});

  @override
  Widget build(BuildContext context) {
    final sold = _mockSoldItems();
    final totalItems = sold.fold<int>(0, (p, e) => p + e.qty);
    final totalPurchase =
        sold.fold<double>(0.0, (p, e) => p + e.qty * e.purchaseCost);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Today\'s Sales',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text('Items sold today',
              style: TextStyle(fontSize: 14, color: Colors.grey.shade700)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            children: [
              _StatPill(label: 'Total Items Sold', value: '$totalItems'),
              _StatPill(
                  label: 'Total Purchasing Cost',
                  value: totalPurchase.toStringAsFixed(2)),
            ],
          ),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Sold Items',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                if (sold.isEmpty)
                  Text('No items sold today',
                      style: TextStyle(color: Colors.grey.shade700))
                else
                  Column(
                    children: sold
                        .map((s) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(s.name,
                                            style: const TextStyle(
                                                fontWeight: FontWeight.w700)),
                                        const SizedBox(height: 4),
                                        Text(
                                            '${s.qty} pcs sold · ${s.category}',
                                            style: TextStyle(
                                                color: Colors.grey.shade700)),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                      '${(s.qty * s.purchaseCost).toStringAsFixed(2)} ETB',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w700)),
                                ],
                              ),
                            ))
                        .toList(),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  final String label;
  final String value;

  const _StatPill({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade700)),
          const SizedBox(height: 8),
          Text(value,
              style:
                  const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _SoldItem {
  final String name;
  final String category;
  final int qty;
  final double purchaseCost;

  const _SoldItem(
      {required this.name,
      required this.category,
      required this.qty,
      required this.purchaseCost});
}

List<_SoldItem> _mockSoldItems() {
  return const [
    _SoldItem(
        name: 'Blue Magic',
        category: 'Personal Care',
        qty: 2,
        purchaseCost: 350.0),
    _SoldItem(name: 'Fanta', category: 'Beverages', qty: 5, purchaseCost: 30.0),
    _SoldItem(name: 'Holand', category: 'Dairy', qty: 1, purchaseCost: 25.0),
  ];
}
