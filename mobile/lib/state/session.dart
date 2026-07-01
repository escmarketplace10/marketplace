import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../config/app_config.dart';

/// Menyimpan sesi karyawan yang login + shift aktif.
class Session extends ChangeNotifier {
  Map<String, dynamic>? employee;
  String? token;
  String? storeToken;

  bool get isLoggedIn => employee != null;
  bool get isStoreLoggedIn => storeToken != null;
  String get role => (employee?['role'] ?? 'cashier').toString();
  String get name => (employee?['name'] ?? '').toString();
  String? get employeeId => employee?['id']?.toString();

  /// RBAC sederhana: peran apa saja yang boleh mengakses sebuah menu.
  bool can(String area) {
    switch (role) {
      case 'admin':
      case 'super_admin':
      case 'owner':
        return true;
      case 'manager':
      case 'supervisor':
        return true; // manager boleh hampir semua
      case 'cashier':
      default:
        return const {'pos', 'transactions', 'customers', 'inventory'}.contains(area);
    }
  }

  void restoreFromPrefs() {
    final empJson = AppConfig.employeeJson;
    final tok = AppConfig.token;
    final sTok = AppConfig.storeToken;
    if (sTok != null) storeToken = sTok;
    if (empJson != null && tok != null) {
      try {
        employee = Map<String, dynamic>.from(jsonDecode(empJson));
        token = tok;
      } catch (_) {}
    }
  }

  Future<void> setStoreLogin(String tok) async {
    storeToken = tok;
    await AppConfig.saveStoreToken(tok);
    notifyListeners();
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

  Future<void> logoutStore() async {
    storeToken = null;
    await AppConfig.clearStoreToken();
    await logout();
  }
}
