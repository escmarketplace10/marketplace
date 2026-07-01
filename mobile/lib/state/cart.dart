import 'package:flutter/foundation.dart';
import '../core/format.dart';

class CartItem {
  final String productId;
  final String name;
  final double unitPrice;
  int quantity;
  double discountAmount;
  String? notes;

  CartItem({
    required this.productId,
    required this.name,
    required this.unitPrice,
    this.quantity = 1,
    this.discountAmount = 0,
    this.notes,
  });

  double get totalPrice => unitPrice * quantity - discountAmount;

  Map<String, dynamic> toItemJson() => {
        'product_id': productId,
        'quantity': quantity,
        'unit_price': unitPrice,
        'discount_amount': discountAmount,
        'notes': notes,
      };
}

/// Keranjang belanja untuk layar Kasir.
class Cart extends ChangeNotifier {
  final List<CartItem> items = [];
  double discountPercent = 0;
  String orderRef = '';
  String orderType = 'dine_in';
  Map<String, dynamic>? customer;

  bool get isEmpty => items.isEmpty;
  int get count => items.fold(0, (s, i) => s + i.quantity);
  double get subtotal => items.fold(0, (s, i) => s + i.totalPrice);
  double get discountValue => subtotal * (discountPercent / 100);
  double get grandTotal => subtotal - discountValue;

  void add(Map<String, dynamic> product) {
    final id = product['id'].toString();
    final existing = items.where((i) => i.productId == id).firstOrNull;
    if (existing != null) {
      existing.quantity++;
    } else {
      items.add(CartItem(
        productId: id,
        name: product['name'].toString(),
        unitPrice: toDouble(product['price']),
      ));
    }
    notifyListeners();
  }

  void changeQty(CartItem item, int delta) {
    item.quantity += delta;
    if (item.quantity <= 0) items.remove(item);
    notifyListeners();
  }

  void remove(CartItem item) {
    items.remove(item);
    notifyListeners();
  }

  void setDiscount(double percent) {
    discountPercent = percent.clamp(0, 100);
    notifyListeners();
  }

  void setOrderRef(String v) {
    orderRef = v;
    notifyListeners();
  }

  void setOrderType(String v) {
    orderType = v;
    notifyListeners();
  }

  void setCustomer(Map<String, dynamic>? c) {
    customer = c;
    notifyListeners();
  }

  void clear() {
    items.clear();
    discountPercent = 0;
    orderRef = '';
    customer = null;
    notifyListeners();
  }
}

extension _FirstOrNull<E> on Iterable<E> {
  E? get firstOrNull => isEmpty ? null : first;
}
