import 'package:flutter/foundation.dart';

import 'package:pos_app/features/products/domain/product_model.dart';

class CartItem {
  final Product product;
  int qty;

  CartItem({required this.product, this.qty = 1});

  double get subtotal => product.sellingPrice * qty;
}

class CartProvider extends ChangeNotifier {
  final List<CartItem> _items = [];

  // Adjustments captured in the POS UI
  String? _discountType; // 'percentage' | 'value'
  double _discountValue = 0.0;

  final List<Map<String, dynamic>> _extraCharges = [];

  List<CartItem> get items => List.unmodifiable(_items);

  void addProduct(Product p) {
    final index = _items.indexWhere((it) => it.product.id == p.id);
    if (index >= 0) {
      _items[index].qty += 1;
    } else {
      _items.add(CartItem(product: p));
    }
    notifyListeners();
  }

  void removeProduct(Product p) {
    _items.removeWhere((it) => it.product.id == p.id);
    notifyListeners();
  }

  void changeQty(Product p, int qty) {
    final index = _items.indexWhere((it) => it.product.id == p.id);
    if (index >= 0) {
      if (qty <= 0) {
        _items.removeAt(index);
      } else {
        _items[index].qty = qty;
      }
      notifyListeners();
    }
  }

  void clear() {
    _items.clear();
    _discountType = null;
    _discountValue = 0.0;
    _extraCharges.clear();
    notifyListeners();
  }

  /// Sum of cart items at selling price.
  double get subtotal => _items.fold(0.0, (s, it) => s + it.subtotal);

  /// Backwards-compat alias (some UI uses `total` to mean items subtotal).
  double get total => subtotal;

  double get discountAmount {
    if (_discountType == null || _discountValue <= 0) return 0.0;
    final raw = (_discountType == 'percentage')
        ? (subtotal * (_discountValue / 100.0))
        : _discountValue;
    if (raw <= 0) return 0.0;
    // Never discount below 0 taxable base.
    return raw > subtotal ? subtotal : raw;
  }

  double get extraChargesTotal => _extraCharges.fold<double>(
      0.0, (s, e) => s + ((e['amount'] as num?)?.toDouble() ?? 0.0));

  /// Total after applying discount and extra charges (before VAT/tax).
  double get adjustedTotal => subtotal - discountAmount + extraChargesTotal;

  Map<String, dynamic>? get discountJson {
    if (_discountType == null || _discountValue <= 0 || subtotal <= 0) {
      return null;
    }
    final amt = discountAmount;
    if (amt <= 0) return null;
    return {
      'type': _discountType,
      'value': _discountValue,
      'amount': amt,
    };
  }

  List<Map<String, dynamic>> get extraChargesJson =>
      List.unmodifiable(_extraCharges);

  void setDiscount({required String type, required double value}) {
    final normalized = type.toLowerCase().trim();
    if (normalized != 'percentage' && normalized != 'value') {
      _discountType = null;
      _discountValue = 0.0;
      notifyListeners();
      return;
    }
    _discountType = normalized;
    _discountValue = value.isFinite && value > 0 ? value : 0.0;
    notifyListeners();
  }

  void clearDiscount() {
    _discountType = null;
    _discountValue = 0.0;
    notifyListeners();
  }

  void addExtraCharge({required String type, required double amount}) {
    final amt = amount.isFinite && amount > 0 ? amount : 0.0;
    if (amt <= 0) return;
    final label = type.trim().isEmpty ? 'extra_charge' : type.trim();
    _extraCharges.add({'type': label, 'amount': amt});
    notifyListeners();
  }

  void removeExtraChargeAt(int index) {
    if (index < 0 || index >= _extraCharges.length) return;
    _extraCharges.removeAt(index);
    notifyListeners();
  }

  void clearExtraCharges() {
    _extraCharges.clear();
    notifyListeners();
  }

  bool get isEmpty => _items.isEmpty;
}
