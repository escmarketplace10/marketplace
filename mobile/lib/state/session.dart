import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../config/app_config.dart';

/// Menyimpan sesi karyawan yang login (kasir / petugas stok).
class Session extends ChangeNotifier {
  Map<String, dynamic>? employee;
  String? token;

  bool get isLoggedIn => employee != null;
  String get role => (employee?['role'] ?? 'cashier').toString();
  String get name => (employee?['name'] ?? '').toString();
  String? get employeeId => employee?['id']?.toString();

  /// RBAC sederhana: peran apa saja yang boleh mengakses sebuah menu.
  /// Aplikasi hanya untuk 2 peran: Kasir & Petugas Stok. Admin lewat Website.
  bool can(String area) {
    switch (role) {
      // Peran admin lama (kalau ada) tetap lihat semua — tapi login admin
      // lewat aplikasi sudah ditolak server, jadi ini praktis tidak terpakai.
      case 'admin':
      case 'super_admin':
      case 'owner':
        return true;
      // Petugas Stok: kelola menu, stok, supplier, pembelian, penitip.
      case 'stocking':
        return const {'menu', 'inventory', 'suppliers', 'purchase_orders', 'consignors'}
            .contains(area);
      // Kasir: hanya transaksi & pelanggan — TIDAK boleh mengatur stok.
      case 'cashier':
      default:
        return const {'pos', 'transactions', 'customers'}.contains(area);
    }
  }

  void restoreFromPrefs() {
    final empJson = AppConfig.employeeJson;
    final tok = AppConfig.token;
    if (empJson != null && tok != null) {
      try {
        employee = Map<String, dynamic>.from(jsonDecode(empJson));
        token = tok;
      } catch (_) {}
    }
  }

  Future<void> setLogin(Map<String, dynamic> emp, String tok) async {
    employee = emp;
    token = tok;
    await AppConfig.saveSession(jsonEncode(emp), tok);
    notifyListeners();
  }

  Future<void> logout() async {
    employee = null;
    token = null;
    await AppConfig.clearSession();
    notifyListeners();
  }
}
