import 'package:flutter/foundation.dart';

import '../products/domain/product_model.dart';

class CartItem {
  final Product product;
  int qty;

  CartItem({required this.product, this.qty = 1});

  double get subtotal => product.sellingPrice * qty;
}

class CartProvider extends ChangeNotifier {
  final List<CartItem> _items = [];

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
      if (qty <= 0) _items.removeAt(index);
      else _items[index].qty = qty;
      notifyListeners();
    }
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }

  double get total => _items.fold(0.0, (s, it) => s + it.subtotal);

  bool get isEmpty => _items.isEmpty;
}
