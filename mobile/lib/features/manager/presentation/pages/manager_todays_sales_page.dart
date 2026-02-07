import 'package:flutter/material.dart';

import 'package:pos_app/features/products/domain/product_model.dart';
import 'package:pos_app/features/products/domain/product_repository.dart';
import 'package:pos_app/features/sales/domain/sale_model.dart';
import 'package:pos_app/features/sales/domain/sale_repository.dart';

class ManagerTodaysSalesPage extends StatefulWidget {
  const ManagerTodaysSalesPage({super.key});

  @override
  State<ManagerTodaysSalesPage> createState() => _ManagerTodaysSalesPageState();
}

class _ManagerTodaysSalesPageState extends State<ManagerTodaysSalesPage> {
  late Future<_TodaysSalesVm> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  String _ymdUtc(DateTime dt) {
    final d = dt.toUtc();
    final y = d.year.toString().padLeft(4, '0');
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '$y-$m-$day';
  }

  Future<_TodaysSalesVm> _load() async {
    final today = _ymdUtc(DateTime.now());

    final salesRepo = SaleRepository();
    final productRepo = ProductRepository();

    final results = await Future.wait([
      salesRepo.listSales(date: today),
      productRepo.listProducts(),
    ]);

    final sales = (results[0] as List<Sale>);
    final products = (results[1] as List<Product>);
    final productById = <String, Product>{
      for (final p in products) p.id: p,
    };

    final agg = <String, _SoldItem>{};
    for (final sale in sales) {
      for (final it in sale.items) {
        final key = (it.productId != null && it.productId!.isNotEmpty)
            ? it.productId!
            : it.name;

        final product = (it.productId != null && it.productId!.isNotEmpty)
            ? productById[it.productId!]
            : null;

        final name = (product?.name.isNotEmpty ?? false) ? product!.name : it.name;
        final category = (product?.category.isNotEmpty ?? false)
            ? product!.category
            : 'Uncategorized';
        final purchaseCost = product?.purchasePrice ?? 0.0;

        final existing = agg[key];
        if (existing == null) {
          agg[key] = _SoldItem(
            name: name,
            category: category,
            qty: it.quantity,
            purchaseCost: purchaseCost,
          );
        } else {
          agg[key] = existing.copyWith(
            name: name,
            category: category,
            qty: existing.qty + it.quantity,
            purchaseCost: purchaseCost,
          );
        }
      }
    }

    final sold = agg.values.toList()
      ..sort((a, b) => b.qty.compareTo(a.qty));

    final totalItems = sold.fold<int>(0, (p, e) => p + e.qty);
    final totalPurchase =
        sold.fold<double>(0.0, (p, e) => p + e.qty * e.purchaseCost);
    final totalSalesAmount =
        sales.fold<double>(0.0, (p, s) => p + (s.total));

    return _TodaysSalesVm(
      date: today,
      sold: sold,
      totalItems: totalItems,
      totalPurchase: totalPurchase,
      transactions: sales.length,
      totalSalesAmount: totalSalesAmount,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: FutureBuilder<_TodaysSalesVm>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Failed to load today\'s sales',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.grey.shade900,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      snapshot.error.toString(),
                      style: TextStyle(color: Colors.grey.shade700),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: () {
                        setState(() {
                          _future = _load();
                        });
                      },
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          final vm = snapshot.data ??
              const _TodaysSalesVm(
                date: '',
                sold: <_SoldItem>[],
                totalItems: 0,
                totalPurchase: 0,
                transactions: 0,
                totalSalesAmount: 0,
              );

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 6),
                Text(
                  'Items sold today (${vm.date})',
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    _StatPill(label: 'Total Items Sold', value: '${vm.totalItems}'),
                    _StatPill(
                      label: 'Total Purchasing Cost',
                      value: vm.totalPurchase.toStringAsFixed(2),
                    ),
                    _StatPill(
                      label: 'Total Sales',
                      value: vm.totalSalesAmount.toStringAsFixed(2),
                    ),
                    _StatPill(label: 'Transactions', value: '${vm.transactions}'),
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
                      const Text(
                        'Sold Items',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (vm.sold.isEmpty)
                        Text(
                          'No items sold today',
                          style: TextStyle(color: Colors.grey.shade700),
                        )
                      else
                        Column(
                          children: vm.sold
                              .map(
                                (s) => Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              s.name,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              '${s.qty} pcs sold · ${s.category}',
                                              style: TextStyle(
                                                color: Colors.grey.shade700,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        '${(s.qty * s.purchaseCost).toStringAsFixed(2)} ETB',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
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

  _SoldItem copyWith({
    String? name,
    String? category,
    int? qty,
    double? purchaseCost,
  }) {
    return _SoldItem(
      name: name ?? this.name,
      category: category ?? this.category,
      qty: qty ?? this.qty,
      purchaseCost: purchaseCost ?? this.purchaseCost,
    );
  }
}

class _TodaysSalesVm {
  final String date;
  final List<_SoldItem> sold;
  final int totalItems;
  final double totalPurchase;
  final int transactions;
  final double totalSalesAmount;

  const _TodaysSalesVm({
    required this.date,
    required this.sold,
    required this.totalItems,
    required this.totalPurchase,
    required this.transactions,
    required this.totalSalesAmount,
  });
}
