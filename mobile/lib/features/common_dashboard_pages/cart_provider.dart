import 'package:flutter/foundation.dart';
import 'mock_products.dart';

class CartItem {
  final POSProduct product;
  int qty;

  CartItem({required this.product, this.qty = 1});

  int get subtotal => product.priceEtb * qty;
}

class CartProvider extends ChangeNotifier {
  final List<CartItem> _items = [];

  List<CartItem> get items => List.unmodifiable(_items);

  void addProduct(POSProduct p) {
    final index = _items.indexWhere((it) => it.product.name == p.name);
    if (index >= 0) {
      _items[index].qty += 1;
    } else {
      _items.add(CartItem(product: p));
    }
    notifyListeners();
  }

  void removeProduct(POSProduct p) {
    _items.removeWhere((it) => it.product.name == p.name);
    notifyListeners();
  }

  void changeQty(POSProduct p, int qty) {
    final index = _items.indexWhere((it) => it.product.name == p.name);
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

  int get total => _items.fold(0, (s, it) => s + it.subtotal);

  bool get isEmpty => _items.isEmpty;
}
