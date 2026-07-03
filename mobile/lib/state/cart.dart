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

  /// Catatan per item (mis. "less sugar", "tanpa es") — khas kebutuhan kafe.
  void setItemNote(CartItem item, String? note) {
    item.notes = (note == null || note.trim().isEmpty) ? null : note.trim();
    notifyListeners();
  }

  /// Simpan isi keranjang untuk fitur "Tahan Pesanan" (open bill).
  Map<String, dynamic> toHeldJson() => {
        'saved_at': DateTime.now().toIso8601String(),
        'order_type': orderType,
        'order_ref': orderRef,
        'discount_percent': discountPercent,
        'customer': customer,
        'total': grandTotal,
        'items': items
            .map((i) => {
                  'product_id': i.productId,
                  'name': i.name,
                  'unit_price': i.unitPrice,
                  'quantity': i.quantity,
                  'discount_amount': i.discountAmount,
                  'notes': i.notes,
                })
            .toList(),
      };

  /// Pulihkan keranjang dari pesanan yang ditahan.
  void restoreHeld(Map<String, dynamic> d) {
    items
      ..clear()
      ..addAll(((d['items'] ?? []) as List).map((raw) {
        final m = Map<String, dynamic>.from(raw);
        return CartItem(
          productId: m['product_id'].toString(),
          name: (m['name'] ?? '').toString(),
          unitPrice: toDouble(m['unit_price']),
          quantity: toInt(m['quantity']) == 0 ? 1 : toInt(m['quantity']),
          discountAmount: toDouble(m['discount_amount']),
          notes: m['notes']?.toString(),
        );
      }));
    orderType = (d['order_type'] ?? 'dine_in').toString();
    orderRef = (d['order_ref'] ?? '').toString();
    discountPercent = toDouble(d['discount_percent']);
    customer = d['customer'] == null ? null : Map<String, dynamic>.from(d['customer']);
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
