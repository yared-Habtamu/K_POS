import 'package:flutter/material.dart';
import 'package:pos_app/features/common_use_pages/reusable_qr_scanner_page.dart';
import 'mock_products.dart';
import 'cart_provider.dart';
import 'receipt_preview.dart';
import 'package:provider/provider.dart';

class CommonPointOfSale extends StatefulWidget {
  const CommonPointOfSale({super.key});

  @override
  State<CommonPointOfSale> createState() => _CommonPointOfSaleState();
}

class _CommonPointOfSaleState extends State<CommonPointOfSale> {
  final TextEditingController _searchController = TextEditingController();

  _PaymentMethod _payment = _PaymentMethod.cash;

  String _discountType = 'Percentage';
  final TextEditingController _discountValueController =
      TextEditingController();

  String _extraChargeType = 'Service Charge';
  final TextEditingController _extraChargeAmountController =
      TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    _discountValueController.dispose();
    _extraChargeAmountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          final isWide = width >= 1100;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SearchRow(
                  controller: _searchController,
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: const [
                    _InfoChip(
                      icon: Icons.warning_amber_rounded,
                      text: '2 Low Stock',
                      bg: Color(0xFFFFF3E0),
                      fg: Color(0xFFF57C00),
                    ),
                    _InfoChip(
                      icon: Icons.schedule,
                      text: '1 Expiring Soon',
                      bg: Color(0xFFFFEBEE),
                      fg: Color(0xFFD32F2F),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                // Search results (mock) — show when user types something
                Builder(builder: (context) {
                  final all = mockProducts();
                  final q = _searchController.text.trim().toLowerCase();
                  final results = q.isEmpty
                      ? <POSProduct>[]
                      : all.where((p) {
                          final lo = p.name.toLowerCase();
                          return lo.contains(q) ||
                              p.category.toLowerCase().contains(q) ||
                              p.barcodes.any((b) => b.contains(q));
                        }).toList();

                  if (results.isEmpty) return const SizedBox.shrink();

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 6),
                      Text('Search results',
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Colors.grey.shade800)),
                      const SizedBox(height: 8),
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: results.length,
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: isWide ? 3 : (width < 360 ? 1 : 2),
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          childAspectRatio:
                              isWide ? 3.6 : (width < 360 ? 1.2 : 2.0),
                        ),
                        itemBuilder: (context, index) {
                          final p = results[index];
                          return InkWell(
                            borderRadius: BorderRadius.circular(10),
                            onTap: () {
                              final cart = Provider.of<CartProvider>(context,
                                  listen: false);
                              cart.addProduct(p);
                              ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                      content:
                                          Text('Added ${p.name} to cart')));
                            },
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              constraints: const BoxConstraints(minHeight: 64),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: Colors.grey.shade300),
                              ),
                              child: ClipRect(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(p.name,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis),
                                    const SizedBox(height: 6),
                                    Text('${p.priceEtb} ETB',
                                        style: TextStyle(
                                            color: Colors.blue.shade900,
                                            fontWeight: FontWeight.w800),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis),
                                    const SizedBox(height: 4),
                                    Text(p.category,
                                        style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey.shade600),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 12),
                    ],
                  );
                }),

                if (isWide)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      _CartCard(),
                      SizedBox(width: 16),
                      Expanded(child: _PaymentCard()),
                    ],
                  )
                else ...[
                  const _CartCard(),
                  const SizedBox(height: 16),
                  _PaymentCard(
                    onPaymentChanged: null,
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SearchRow extends StatefulWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  const _SearchRow({
    required this.controller,
    required this.onChanged,
  });

  @override
  State<_SearchRow> createState() => _SearchRowState();
}

class _SearchRowState extends State<_SearchRow> {
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
              controller: widget.controller,
              onChanged: widget.onChanged,
              decoration: const InputDecoration(
                hintText: 'Scan barcode or search product',
                hintStyle: TextStyle(
                  fontSize: 13,
                ),
                border: InputBorder.none,
              ),
            ),
          ),
          InkWell(
            onTap: () async {
              // Navigate to scanner
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) => const BarcodeScannerPage()),
              );

              // Handle result if it exists
              if (result != null) {
                setState(() {
                  widget.controller.text = result;
                });
                print("Scanned Code: $result");
                // Do something with 'result'
              }
            },
            child: Icon(
              Icons.qr_code_2,
              size: 20,
              color: Colors.black54,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color bg;
  final Color fg;

  const _InfoChip({
    required this.icon,
    required this.text,
    required this.bg,
    required this.fg,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: bg.withOpacity(0.6)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: fg),
          const SizedBox(width: 6),
          Text(
            text,
            style: TextStyle(fontWeight: FontWeight.w700, color: fg),
          ),
        ],
      ),
    );
  }
}

class _CartCard extends StatelessWidget {
  const _CartCard();

  @override
  Widget build(BuildContext context) {
    return Consumer<CartProvider>(
      builder: (context, cart, child) {
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minWidth: 150.0,
              minHeight: 200.0,
              maxHeight: 300,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.shopping_cart_outlined,
                        color: Colors.grey.shade800),
                    const SizedBox(width: 10),
                    Text('Cart',
                        style: TextStyle(
                            fontSize: 22, fontWeight: FontWeight.w800)),
                    const Spacer(),
                    Text('${cart.items.length} items',
                        style: TextStyle(color: Colors.grey.shade600)),
                  ],
                ),
                const SizedBox(height: 12),
                if (cart.isEmpty)
                  SizedBox(
                    height: 220,
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.shopping_cart_outlined,
                              size: 56, color: Colors.grey.shade400),
                          const SizedBox(height: 12),
                          Text('Cart is empty',
                              style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.grey.shade800)),
                          const SizedBox(height: 6),
                          Text('Scan or search products to add',
                              style: TextStyle(
                                  fontSize: 13, color: Colors.grey.shade700)),
                        ],
                      ),
                    ),
                  )
                else ...[
                  Flexible(
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: cart.items.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final it = cart.items[index];
                        return Row(
                          children: [
                            Expanded(
                                child: Text(it.product.name,
                                    style: TextStyle(
                                        fontWeight: FontWeight.w700))),
                            IconButton(
                                onPressed: () =>
                                    cart.changeQty(it.product, it.qty - 1),
                                icon: const Icon(Icons.remove_circle)),
                            Text('${it.qty}'),
                            IconButton(
                                onPressed: () =>
                                    cart.changeQty(it.product, it.qty + 1),
                                icon: const Icon(Icons.add_circle)),
                            const SizedBox(width: 8),
                            Text('${it.subtotal} ETB',
                                style: TextStyle(fontWeight: FontWeight.w800)),
                          ],
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text('Total',
                          style: TextStyle(
                              fontSize: 13, fontWeight: FontWeight.w700)),
                      const Spacer(),
                      Text('${cart.total} ETB',
                          style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: Colors.blue.shade900)),
                    ],
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _PaymentCard extends StatefulWidget {
  final ValueChanged<_PaymentMethod>? onPaymentChanged;

  const _PaymentCard({this.onPaymentChanged});

  @override
  State<_PaymentCard> createState() => _PaymentCardState();
}

class _PaymentCardState extends State<_PaymentCard> {
  _PaymentMethod _payment = _PaymentMethod.cash;

  String _discountType = 'Percentage';
  final TextEditingController _discountValueController =
      TextEditingController();

  String _extraChargeType = 'Service Charge';
  final TextEditingController _extraChargeAmountController =
      TextEditingController();

  @override
  void dispose() {
    _discountValueController.dispose();
    _extraChargeAmountController.dispose();
    super.dispose();
  }

  void _setPayment(_PaymentMethod method) {
    setState(() => _payment = method);
    widget.onPaymentChanged?.call(method);
  }

  @override
  Widget build(BuildContext context) {
    final primary = Colors.blue.shade900;

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
              Icon(Icons.inventory_2_outlined, color: Colors.grey.shade800),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Payment Method',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text('Payment Method',
              style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade700,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 10),
          LayoutBuilder(
            builder: (context, constraints) {
              final isNarrow = constraints.maxWidth < 480;
              final cols = isNarrow ? 2 : 3;

              final methods = [
                _PaymentMethodItem(
                    'Cash', Icons.payments_outlined, _PaymentMethod.cash),
                _PaymentMethodItem(
                    'Card', Icons.credit_card, _PaymentMethod.card),
                _PaymentMethodItem(
                    'Tele Birr', Icons.phone_iphone, _PaymentMethod.telebirr),
                _PaymentMethodItem('CBE Bank', Icons.account_balance_outlined,
                    _PaymentMethod.cbe),
                _PaymentMethodItem(
                    'Wallet',
                    Icons.account_balance_wallet_outlined,
                    _PaymentMethod.wallet),
                _PaymentMethodItem(
                    'other', Icons.receipt_long, _PaymentMethod.other),
              ];

              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: methods.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: cols,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  childAspectRatio: 2.3,
                ),
                itemBuilder: (context, index) {
                  final m = methods[index];
                  final selected = _payment == m.value;
                  return _PaymentMethodButton(
                    label: m.label,
                    icon: m.icon,
                    selected: selected,
                    primary: primary,
                    onTap: () => _setPayment(m.value),
                  );
                },
              );
            },
          ),
          const SizedBox(height: 14),
          Text('saved_accounts',
              style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade700,
                  fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final isNarrow = constraints.maxWidth < 420;
                final left = Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('TELEBIRR',
                        style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade700,
                            fontWeight: FontWeight.w700)),
                    const SizedBox(height: 6),
                    Text('0936092577',
                        style: TextStyle(
                            fontSize: 15,
                            color: Colors.grey.shade900,
                            fontWeight: FontWeight.w800)),
                  ],
                );

                final copy = OutlinedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Copied (mock)')));
                  },
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Copy'),
                );

                if (isNarrow) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      left,
                      const SizedBox(height: 10),
                      SizedBox(width: double.infinity, child: copy),
                    ],
                  );
                }

                return Row(
                  children: [
                    Expanded(child: left),
                    copy,
                  ],
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          Text('Discount',
              style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade700,
                  fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          LayoutBuilder(
            builder: (context, constraints) {
              final isNarrow = constraints.maxWidth < 520;

              final type = _Dropdown(
                value: _discountType,
                items: const ['Percentage', 'Value'],
                onChanged: (v) => setState(() => _discountType = v),
                icon: Icons.percent,
              );

              final value = _InputBox(
                controller: _discountValueController,
                hintText: 'Value',
                keyboardType: TextInputType.number,
              );

              final add = _SquareButton(
                icon: Icons.add,
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Discount added (mock)')));
                },
                color: primary,
              );

              if (isNarrow) {
                return Column(
                  children: [
                    Row(children: [
                      Expanded(child: type),
                      const SizedBox(width: 10),
                      add
                    ]),
                    const SizedBox(height: 10),
                    value,
                  ],
                );
              }

              return Row(
                children: [
                  SizedBox(width: 160, child: type),
                  const SizedBox(width: 10),
                  Expanded(child: value),
                  const SizedBox(width: 10),
                  add,
                ],
              );
            },
          ),
          const SizedBox(height: 16),
          Text('Extra Charges',
              style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade700,
                  fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          LayoutBuilder(
            builder: (context, constraints) {
              final isNarrow = constraints.maxWidth < 520;

              final type = _Dropdown(
                value: _extraChargeType,
                items: const ['Service Charge', 'Delivery', 'Other'],
                onChanged: (v) => setState(() => _extraChargeType = v),
                icon: Icons.receipt_long,
              );

              final amount = _InputBox(
                controller: _extraChargeAmountController,
                hintText: 'Amount',
                keyboardType: TextInputType.number,
              );

              final add = _SquareButton(
                icon: Icons.add,
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content: Text('Extra charge added (mock)')));
                },
                color: primary,
              );

              if (isNarrow) {
                return Column(
                  children: [
                    Row(children: [
                      Expanded(child: type),
                      const SizedBox(width: 10),
                      add
                    ]),
                    const SizedBox(height: 10),
                    amount,
                  ],
                );
              }

              return Row(
                children: [
                  Expanded(child: type),
                  const SizedBox(width: 10),
                  Expanded(child: amount),
                  const SizedBox(width: 10),
                  add,
                ],
              );
            },
          ),
          const SizedBox(height: 16),
          Consumer<CartProvider>(
            builder: (context, cart, child) {
              final total = cart.total;
              return Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton.icon(
                      onPressed: cart.isEmpty
                          ? null
                          : () async {
                              try {
                                debugPrint(
                                    'Complete pressed — opening receipt preview directly');
                                await showReceiptPreviewDialog(context, cart);
                              } catch (e, st) {
                                debugPrint(
                                    'Failed to show receipt preview: $e\n$st');
                                showDialog(
                                  context: context,
                                  builder: (ctx) => AlertDialog(
                                    title: const Text('Receipt'),
                                    content: SingleChildScrollView(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text('Total: $total ETB'),
                                          const SizedBox(height: 8),
                                          ...cart.items.map((it) => Text(
                                              '${it.product.name} x${it.qty} - ${it.subtotal} ETB')),
                                          const SizedBox(height: 8),
                                          Text('Error showing full receipt: $e',
                                              style: const TextStyle(
                                                  fontSize: 12,
                                                  color: Colors.red)),
                                        ],
                                      ),
                                    ),
                                    actions: [
                                      TextButton(
                                          onPressed: () =>
                                              Navigator.of(ctx).pop(),
                                          child: const Text('Close'))
                                    ],
                                  ),
                                );
                              }
                            },
                      icon: const Icon(Icons.payment),
                      label: Text('Complete Sale - $total ETB',
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: cart.isEmpty
                            ? Colors.blueGrey.shade300
                            : Colors.blue.shade900,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    height: 42,
                    child: OutlinedButton(
                      onPressed: cart.isEmpty ? null : () => cart.clear(),
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                      ),
                      child: Text('Clear Cart',
                          style: TextStyle(
                              color: cart.isEmpty
                                  ? Colors.grey.shade400
                                  : Colors.grey.shade700,
                              fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _PaymentMethodItem {
  final String label;
  final IconData icon;
  final _PaymentMethod value;

  _PaymentMethodItem(this.label, this.icon, this.value);
}

enum _PaymentMethod { cash, card, telebirr, cbe, wallet, other }

class _PaymentMethodButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final Color primary;
  final VoidCallback onTap;

  const _PaymentMethodButton({
    required this.label,
    required this.icon,
    required this.selected,
    required this.primary,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? primary : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? primary : Colors.grey.shade300),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon,
                size: 18,
                color: selected ? Colors.white : Colors.grey.shade700),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  color: selected ? Colors.white : Colors.grey.shade800,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Dropdown extends StatelessWidget {
  final String value;
  final List<String> items;
  final ValueChanged<String> onChanged;
  final IconData icon;

  const _Dropdown({
    required this.value,
    required this.items,
    required this.onChanged,
    required this.icon,
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
          Icon(icon, size: 18, color: Colors.grey.shade700),
          const SizedBox(width: 8),
          Expanded(
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                isExpanded: true,
                value: value,
                items: items
                    .map(
                      (e) => DropdownMenuItem<String>(
                        value: e,
                        child: Text(
                          e,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade800,
                              fontWeight: FontWeight.w700),
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (v) {
                  if (v != null) onChanged(v);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InputBox extends StatelessWidget {
  final TextEditingController controller;
  final String hintText;
  final TextInputType keyboardType;

  const _InputBox({
    required this.controller,
    required this.hintText,
    required this.keyboardType,
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
      child: Center(
        child: TextField(
          controller: controller,
          keyboardType: keyboardType,
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: TextStyle(
                color: Colors.grey.shade500, fontWeight: FontWeight.w700),
            border: InputBorder.none,
          ),
        ),
      ),
    );
  }
}

class _SquareButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final Color color;

  const _SquareButton({
    required this.icon,
    required this.onTap,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 46,
      height: 46,
      child: ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          padding: EdgeInsets.zero,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        child: Icon(
          icon,
          size: 20,
          color: Colors.white,
        ),
      ),
    );
  }
}
