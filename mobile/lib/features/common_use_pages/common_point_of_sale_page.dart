import 'package:flutter/material.dart';
import 'dart:math';
import 'package:pos_app/features/common_use_pages/reusable_qr_scanner_page.dart';
import 'cart_provider.dart';
import 'receipt_preview.dart';
import 'package:provider/provider.dart';
import 'package:pos_app/services/get_current_user.dart';
import 'package:pos_app/utils/permission_notifier.dart';

import 'package:pos_app/features/products/domain/product_model.dart';
import 'package:pos_app/features/products/domain/product_repository.dart';
import 'package:pos_app/features/sales/domain/sale_repository.dart';
import 'package:pos_app/features/marts/domain/mart_repository.dart';
import 'package:pos_app/services/api/api_client.dart';
import 'package:pos_app/services/api/auth_storage.dart';

class CommonPointOfSale extends StatefulWidget {
  const CommonPointOfSale({super.key});

  @override
  State<CommonPointOfSale> createState() => _CommonPointOfSaleState();
}

class _CommonPointOfSaleState extends State<CommonPointOfSale> {
  final TextEditingController _searchController = TextEditingController();

  final _PaymentMethod _payment = _PaymentMethod.cash;

  final String _discountType = 'Percentage';
  final TextEditingController _discountValueController =
      TextEditingController();

  final String _extraChargeType = 'Service Charge';
  final TextEditingController _extraChargeAmountController =
      TextEditingController();
  final ProductRepository _productRepository = ProductRepository();

  List<Product> _products = const [];
  bool _isLoadingProducts = true;
  String? _productsError;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    setState(() {
      _isLoadingProducts = true;
      _productsError = null;
    });

    try {
      final list = await _productRepository.listProducts();
      if (!mounted) return;
      setState(() {
        _products = list;
        _isLoadingProducts = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _productsError =
            e is ApiException ? e.message : 'Failed to load products';
        _isLoadingProducts = false;
      });
    }
  }

  Future<void> _handleScannedCode(String code) async {
    final cleaned = code.trim();
    if (cleaned.isEmpty) return;

    // Try backend barcode lookup first.
    final found = await _productRepository.findByBarcode(cleaned);
    if (found != null) {
      if (!mounted) return;
      Provider.of<CartProvider>(context, listen: false).addProduct(found);
      setState(() => _searchController.clear());
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Added ${found.name} to cart')),
      );
      return;
    }

    // Fallback: populate the search box so user can pick a product.
    if (!mounted) return;
    setState(() {
      _searchController.text = cleaned;
    });
  }

  void _onSaleFinalized() {
    _searchController.clear();
    if (!mounted) return;
    setState(() {});
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
                  onScan: _handleScannedCode,
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
                  final q = _searchController.text.trim().toLowerCase();

                  if (_isLoadingProducts) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Row(
                        children: const [
                          SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                          SizedBox(width: 10),
                          Text('Loading products...'),
                        ],
                      ),
                    );
                  }

                  if (_productsError != null) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              _productsError!,
                              style: const TextStyle(
                                color: Colors.red,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          OutlinedButton(
                            onPressed: _loadProducts,
                            child: const Text('Retry'),
                          )
                        ],
                      ),
                    );
                  }

                  final results = q.isEmpty
                      ? <Product>[]
                      : _products.where((p) {
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
                                    Text(
                                        '${p.sellingPrice.toStringAsFixed(2)} ETB',
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
                    children: [
                      const _CartCard(),
                      const SizedBox(width: 16),
                      Expanded(
                          child:
                              _PaymentCard(onSaleFinalized: _onSaleFinalized)),
                    ],
                  )
                else ...[
                  const _CartCard(),
                  const SizedBox(height: 16),
                  _PaymentCard(
                    onPaymentChanged: null,
                    onSaleFinalized: _onSaleFinalized,
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
  final Future<void> Function(String code) onScan;

  const _SearchRow({
    required this.controller,
    required this.onChanged,
    required this.onScan,
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
                await widget.onScan(result.toString());
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
                            Text('${it.subtotal.toStringAsFixed(2)} ETB',
                                style: TextStyle(fontWeight: FontWeight.w800)),
                          ],
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text('Subtotal',
                          style: TextStyle(
                              fontSize: 13, fontWeight: FontWeight.w700)),
                      const Spacer(),
                      Text('${cart.subtotal.toStringAsFixed(2)} ETB',
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: Colors.grey.shade900)),
                    ],
                  ),
                  if (cart.discountAmount > 0) ...[
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Text('Discount',
                            style: TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w700)),
                        const Spacer(),
                        Text('-${cart.discountAmount.toStringAsFixed(2)} ETB',
                            style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: Colors.red.shade700)),
                      ],
                    ),
                  ],
                  if (cart.extraChargesTotal > 0) ...[
                    const SizedBox(height: 6),
                    ...List.generate(cart.extraChargesJson.length, (i) {
                      final e = cart.extraChargesJson[i];
                      final label =
                          (e['type']?.toString().trim().isNotEmpty ?? false)
                              ? e['type'].toString()
                              : 'extra_charge';
                      final amount = (e['amount'] as num?)?.toDouble() ??
                          double.tryParse(e['amount']?.toString() ?? '') ??
                          0.0;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${label.toLowerCase().replaceAll(' ', '_')}:',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.grey.shade900,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(
                              '+${amount.toStringAsFixed(2)} ETB',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: Colors.grey.shade900,
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text('Total',
                          style: TextStyle(
                              fontSize: 13, fontWeight: FontWeight.w700)),
                      const Spacer(),
                      Text('${cart.adjustedTotal.toStringAsFixed(2)} ETB',
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

enum _PaymentMethod {
  cash,
  telebirr,
  cbeBank,
  card,
  wallet,
  other,
}

class _PaymentMethodItem {
  final String label;
  final IconData icon;
  final _PaymentMethod value;

  const _PaymentMethodItem(this.label, this.icon, this.value);
}

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
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Container(
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

class _PaymentCard extends StatefulWidget {
  final ValueChanged<_PaymentMethod>? onPaymentChanged;
  final VoidCallback? onSaleFinalized;

  const _PaymentCard({this.onPaymentChanged, this.onSaleFinalized});

  @override
  State<_PaymentCard> createState() => _PaymentCardState();
}

class _PaymentCardState extends State<_PaymentCard> {
  _PaymentMethod _payment = _PaymentMethod.cash;

  final MartRepository _martRepository = MartRepository();
  final AuthStorage _authStorage = AuthStorage();
  bool _isLoadingSavedAccounts = true;
  List<MapEntry<String, String>> _savedAccounts = const [];

  bool _isSubmitting = false;

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
    PermissionNotifier.instance.removeListener(_onPermissionNotification);
    super.dispose();
  }

  void _syncDiscountToCart() {
    final user = Provider.of<UserProvider>(context, listen: false).user;
    final canApply = user != null &&
        (user.role == 'owner' || (user.permissions ?? []).contains('discount'));
    if (!canApply) return;

    final cart = Provider.of<CartProvider>(context, listen: false);
    final raw = double.tryParse(_discountValueController.text) ?? 0.0;
    if (raw <= 0) {
      cart.clearDiscount();
      return;
    }
    cart.setDiscount(
      type: _discountType == 'Percentage' ? 'percentage' : 'value',
      value: raw,
    );
  }

  void _onPermissionNotification() {
    final msg = PermissionNotifier.instance.consume();
    if (msg == null) return;
    if (!mounted) return;

    // If discount permission was removed, clear any applied discount
    final user = Provider.of<UserProvider>(context, listen: false).user;
    final canApply = user != null &&
        (user.role == 'owner' || (user.permissions ?? []).contains('discount'));
    if (!canApply) {
      final cart = Provider.of<CartProvider>(context, listen: false);
      cart.clearDiscount();
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    });
  }

  void _syncExtraChargeToCart() {
    // Intentionally no-op now. Extra charges are added via the + button
    // (supports multiple charges).
  }

  void _addExtraChargeToCart() {
    final cart = Provider.of<CartProvider>(context, listen: false);
    final raw = double.tryParse(_extraChargeAmountController.text) ?? 0.0;
    if (raw <= 0) return;
    cart.addExtraCharge(type: _extraChargeType, amount: raw);
    _extraChargeAmountController.clear();
  }

  void _setPayment(_PaymentMethod method) {
    setState(() => _payment = method);
    widget.onPaymentChanged?.call(method);
  }

  String _randomString(int length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    final r = Random();
    return List.generate(length, (index) => chars[r.nextInt(chars.length)])
        .join();
  }

  String _paymentMethodString(_PaymentMethod m) {
    switch (m) {
      case _PaymentMethod.cash:
        return 'cash';
      case _PaymentMethod.telebirr:
        return 'telebirr';
      case _PaymentMethod.cbeBank:
        return 'cbe_bank';
      case _PaymentMethod.card:
        return 'card';
      case _PaymentMethod.wallet:
        return 'wallet';
      case _PaymentMethod.other:
        return 'other';
    }
  }

  Future<void> _completeSale(BuildContext context, CartProvider cart) async {
    if (_isSubmitting) return;
    if (cart.isEmpty) return;

    setState(() => _isSubmitting = true);

    try {
      final items = cart.items
          .map((it) => {
                'productId': it.product.id,
                'name': it.product.name,
                'price': it.product.sellingPrice,
                'quantity': it.qty,
                'total': (it.product.sellingPrice * it.qty),
              })
          .toList();

      final subtotal = items.fold<double>(
          0.0, (s, it) => s + ((it['total'] as num?)?.toDouble() ?? 0.0));

      // Ensure cart adjustments are synced before creating the sale.
      _syncDiscountToCart();

      // Discount/extra charges are sent to backend; backend will enforce permissions.
      final discount = cart.discountJson;
      final extraCharges = cart.extraChargesJson;

      final receiptId = 'RCP-${_randomString(8)}';

      final sale = await SaleRepository().createSale(
        items: items,
        subtotal: subtotal,
        discount: discount,
        extraCharges: extraCharges.isEmpty ? null : extraCharges,
        receiptId: receiptId,
        paymentMethod: _paymentMethodString(_payment),
      );
      if (!context.mounted) return;

      final didFinish = await showReceiptPreviewDialog(context, sale: sale);
      if (!mounted) return;

      if (didFinish) {
        cart.clear();

        _discountType = 'Percentage';
        _discountValueController.clear();
        _extraChargeType = 'Service Charge';
        _extraChargeAmountController.clear();

        widget.onSaleFinalized?.call();

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content:
                  Text('Sale completed: ${sale.total.toStringAsFixed(2)} ETB')),
        );
      }
    } catch (e) {
      final msg = e is ApiException ? e.message : 'Failed to complete sale';
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    } finally {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
    }
  }

  @override
  void initState() {
    super.initState();
    _loadSavedAccounts();
    PermissionNotifier.instance.addListener(_onPermissionNotification);
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _onPermissionNotification());
  }

  String _normalizePaymentKey(String raw) {
    return raw
        .toLowerCase()
        .trim()
        .replaceAll(RegExp(r'\s+'), '_')
        .replaceAll(RegExp(r'[^a-z0-9_]+'), '');
  }

  _PaymentMethod _methodFromKey(String key) {
    final k = _normalizePaymentKey(key);
    if (k == 'cash') return _PaymentMethod.cash;
    if (k.contains('tele')) return _PaymentMethod.telebirr;
    if (k == 'cbe' || k.contains('cbe')) return _PaymentMethod.cbeBank;
    if (k == 'card') return _PaymentMethod.card;
    if (k == 'wallet') return _PaymentMethod.wallet;
    return _PaymentMethod.other;
  }

  Future<void> _loadSavedAccounts() async {
    setState(() => _isLoadingSavedAccounts = true);
    try {
      final user = await _authStorage.readUser();
      final martId = user?['martId']?.toString();
      if (martId == null || martId.isEmpty) {
        if (!mounted) return;
        setState(() {
          _savedAccounts = const [];
          _isLoadingSavedAccounts = false;
        });
        return;
      }

      final mart = await _martRepository.getMart(martId);

      final accounts = <MapEntry<String, String>>[];
      final cpf = mart['customPaymentFields'];
      if (cpf is List) {
        for (final e in cpf) {
          if (e is Map) {
            final k = e['key']?.toString() ?? '';
            final v = e['value']?.toString() ?? '';
            if (k.trim().isEmpty || v.trim().isEmpty) continue;
            accounts.add(MapEntry(_normalizePaymentKey(k), v.trim()));
          }
        }
      }

      final rawPaymentSystem = mart['paymentSystem']?.toString();
      final defaultKey = rawPaymentSystem == null
          ? ''
          : _normalizePaymentKey(rawPaymentSystem);

      if (!mounted) return;
      setState(() {
        _savedAccounts = accounts;
        _isLoadingSavedAccounts = false;
        if (defaultKey.isNotEmpty) {
          _payment = _methodFromKey(defaultKey);
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoadingSavedAccounts = false);
    }
  }

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
                    'Tele Birr', Icons.phone_iphone, _PaymentMethod.telebirr),
                _PaymentMethodItem('CBE Bank', Icons.account_balance_outlined,
                    _PaymentMethod.cbeBank),
                _PaymentMethodItem(
                    'Card', Icons.credit_card, _PaymentMethod.card),
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
            child: _isLoadingSavedAccounts
                ? const Text('Loading...')
                : (_savedAccounts.isEmpty
                    ? Text('No saved accounts',
                        style: TextStyle(color: Colors.grey.shade700))
                    : Column(
                        children: _savedAccounts
                            .map((e) => Padding(
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 6),
                                  child: InkWell(
                                    onTap: () {
                                      _setPayment(_methodFromKey(e.key));
                                    },
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            e.key,
                                            style: TextStyle(
                                              fontSize: 14,
                                              color: Colors.grey.shade800,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                        Text(
                                          e.value,
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: Colors.grey.shade800,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ))
                            .toList(),
                      )),
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

              final user =
                  Provider.of<UserProvider>(context, listen: false).user;
              final canApplyDiscount = user != null &&
                  (user.role == 'owner' ||
                      (user.permissions ?? []).contains('discount'));

              final type = _Dropdown(
                value: _discountType,
                items: const ['Percentage', 'Value'],
                onChanged: (v) {
                  setState(() => _discountType = v);
                  _syncDiscountToCart();
                },
                icon: Icons.percent,
              );

              final value = _InputBox(
                controller: _discountValueController,
                hintText: 'Value',
                keyboardType: TextInputType.number,
                enabled: canApplyDiscount,
                onChanged: (_) => _syncDiscountToCart(),
              );

              final add = _SquareButton(
                icon: Icons.add,
                onTap: canApplyDiscount
                    ? () {
                        _syncDiscountToCart();
                        ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text('Discount applied to cart')));
                      }
                    : () {
                        ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content:
                                    Text('Not authorized to apply discounts')));
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
                onChanged: (v) {
                  setState(() => _extraChargeType = v);
                },
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
                  _addExtraChargeToCart();
                  ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Extra charge added')));
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
          const SizedBox(height: 10),
          Consumer<CartProvider>(
            builder: (context, cart, child) {
              if (cart.extraChargesJson.isEmpty) return const SizedBox.shrink();
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: List.generate(cart.extraChargesJson.length, (i) {
                  final e = cart.extraChargesJson[i];
                  final label =
                      (e['type']?.toString().trim().isNotEmpty ?? false)
                          ? e['type'].toString()
                          : 'extra_charge';
                  final amount = (e['amount'] as num?)?.toDouble() ??
                      double.tryParse(e['amount']?.toString() ?? '') ??
                      0.0;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${label.toLowerCase().replaceAll(' ', '_')}  +${amount.toStringAsFixed(2)} ETB',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: Colors.grey.shade800,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        IconButton(
                          onPressed: () => cart.removeExtraChargeAt(i),
                          icon: const Icon(Icons.close, size: 18),
                          tooltip: 'Remove',
                        ),
                      ],
                    ),
                  );
                }),
              );
            },
          ),
          const SizedBox(height: 16),
          Consumer<CartProvider>(
            builder: (context, cart, child) {
              final total = cart.adjustedTotal;
              return Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton.icon(
                      onPressed: (cart.isEmpty || _isSubmitting)
                          ? null
                          : () => _completeSale(context, cart),
                      icon: _isSubmitting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.payment),
                      label: Text(
                        _isSubmitting
                            ? 'Processing...'
                            : 'Complete Sale - ${total.toStringAsFixed(2)} ETB',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: cart.isEmpty
                            ? Colors.blueGrey.shade300
                            : Colors.blue.shade900,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
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
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: Text(
                        'Clear Cart',
                        style: TextStyle(
                          color: cart.isEmpty
                              ? Colors.grey.shade400
                              : Colors.grey.shade700,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
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
  final ValueChanged<String>? onChanged;
  final bool enabled;

  const _InputBox({
    required this.controller,
    required this.hintText,
    required this.keyboardType,
    this.onChanged,
    this.enabled = true,
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
          onChanged: onChanged,
          enabled: enabled,
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
