import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';

class ApiException implements Exception {
  final String message;
  final int? status;
  ApiException(this.message, [this.status]);
  @override
  String toString() => message;
}

/// Klien HTTP untuk seluruh endpoint backend POS.
/// Base URL diambil dari AppConfig (di-set di layar "Setup Server").
class Api {
  static Duration timeout = const Duration(seconds: 15);

  static Uri _uri(String path, [Map<String, dynamic>? query]) {
    final base = AppConfig.apiBase; // contoh: http://192.168.1.17:3001/api
    final qp = <String, String>{};
    query?.forEach((k, v) {
      if (v != null) qp[k] = v.toString();
    });
    return Uri.parse('$base$path').replace(
      queryParameters: qp.isEmpty ? null : qp,
    );
  }

  static Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (AppConfig.token != null) 'Authorization': 'Bearer ${AppConfig.token}',
      };

  static dynamic _decode(http.Response res) {
    final body = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) return body;
    // Token kedaluwarsa/tidak valid — bersihkan sesi supaya app kembali ke login
    if (res.statusCode == 401 && AppConfig.token != null) AppConfig.clearSession();
    final msg = (body is Map && body['error'] != null)
        ? body['error'].toString()
        : 'Gagal (${res.statusCode})';
    throw ApiException(msg, res.statusCode);
  }

  static Future<dynamic> _get(String path, [Map<String, dynamic>? q]) async {
    try {
      final res = await http.get(_uri(path, q), headers: _headers).timeout(timeout);
      return _decode(res);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Tidak bisa terhubung ke server. Cek WiFi & alamat server.');
    }
  }

  static Future<dynamic> _send(String method, String path, [Object? body]) async {
    try {
      final req = http.Request(method, _uri(path))..headers.addAll(_headers);
      if (body != null) req.body = jsonEncode(body);
      final streamed = await req.send().timeout(timeout);
      final res = await http.Response.fromStream(streamed);
      return _decode(res);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Tidak bisa terhubung ke server. Cek WiFi & alamat server.');
    }
  }

  // ---- Health / koneksi ----
  static Future<bool> ping() async {
    final res = await _get('/health');
    return res is Map && res['status'] == 'ok';
  }

  // ---- Auth ----
  // Login hanya PIN karyawan (kasir / petugas stok). Admin login lewat Website.
  static Future<Map<String, dynamic>> login(String pin) async =>
      Map<String, dynamic>.from(await _send('POST', '/auth/login', {'pin': pin}));

  // ---- Categories ----
  static Future<List<dynamic>> categories() async => List.from(await _get('/categories'));
  static Future<dynamic> createCategory(Map<String, dynamic> d) => _send('POST', '/categories', d);
  static Future<dynamic> updateCategory(String id, Map<String, dynamic> d) => _send('PUT', '/categories/$id', d);
  static Future<dynamic> deleteCategory(String id) => _send('DELETE', '/categories/$id');

  // ---- Products ----
  static Future<List<dynamic>> products({Map<String, dynamic>? params}) async =>
      List.from(await _get('/products', params));
  static Future<Map<String, dynamic>> product(String id) async =>
      Map<String, dynamic>.from(await _get('/products/$id'));
  static Future<dynamic> createProduct(Map<String, dynamic> d) => _send('POST', '/products', d);
  static Future<dynamic> updateProduct(String id, Map<String, dynamic> d) => _send('PUT', '/products/$id', d);
  static Future<dynamic> deleteProduct(String id) => _send('DELETE', '/products/$id');

  // ---- Transactions ----
  static Future<List<dynamic>> transactions({Map<String, dynamic>? params}) async =>
      List.from(await _get('/transactions', params));
  static Future<Map<String, dynamic>> transaction(String id) async =>
      Map<String, dynamic>.from(await _get('/transactions/$id'));
  static Future<Map<String, dynamic>> createTransaction(Map<String, dynamic> d) async =>
      Map<String, dynamic>.from(await _send('POST', '/transactions', d));
  static Future<dynamic> voidTransaction(String id, Map<String, dynamic> d) =>
      _send('POST', '/transactions/$id/void', d);

  // ---- Customers ----
  static Future<List<dynamic>> customers({String? search}) async =>
      List.from(await _get('/customers', {'search': search}));
  static Future<dynamic> createCustomer(Map<String, dynamic> d) => _send('POST', '/customers', d);
  static Future<dynamic> updateCustomer(String id, Map<String, dynamic> d) => _send('PUT', '/customers/$id', d);
  static Future<dynamic> addDeposit(String id, num amount) =>
      _send('POST', '/customers/$id/deposit', {'amount': amount});

  // ---- Employees ----
  static Future<List<dynamic>> employees({String? role}) async =>
      List.from(await _get('/employees', {'role': role}));
  static Future<dynamic> createEmployee(Map<String, dynamic> d) => _send('POST', '/employees', d);
  static Future<dynamic> updateEmployee(String id, Map<String, dynamic> d) => _send('PUT', '/employees/$id', d);
  static Future<dynamic> deleteEmployee(String id) => _send('DELETE', '/employees/$id');

  // ---- Inventory ----
  static Future<List<dynamic>> movements({Map<String, dynamic>? params}) async =>
      List.from(await _get('/inventory/movements', params));
  static Future<dynamic> adjustStock(Map<String, dynamic> d) => _send('POST', '/inventory/adjust', d);
  static Future<List<dynamic>> lowStock() async => List.from(await _get('/inventory/low-stock'));
  static Future<dynamic> stockOpname(List<Map<String, dynamic>> items) =>
      _send('POST', '/inventory/stock-opname', {'items': items});

  // ---- Suppliers ----
  static Future<List<dynamic>> suppliers({String? search}) async =>
      List.from(await _get('/suppliers', {'search': search}));
  static Future<dynamic> createSupplier(Map<String, dynamic> d) => _send('POST', '/suppliers', d);
  static Future<dynamic> updateSupplier(String id, Map<String, dynamic> d) => _send('PUT', '/suppliers/$id', d);
  static Future<dynamic> deleteSupplier(String id) => _send('DELETE', '/suppliers/$id');

  // ---- Consignors (Penitip / Barang Titipan) ----
  static Future<List<dynamic>> consignors({String? search}) async =>
      List.from(await _get('/consignors', {'search': search}));
  static Future<Map<String, dynamic>> consignorReport(String id) async =>
      Map<String, dynamic>.from(await _get('/consignors/$id/report'));
  static Future<List<dynamic>> consignorSettlements(String id) async =>
      List.from(await _get('/consignors/$id/settlements'));
  static Future<dynamic> createConsignor(Map<String, dynamic> d) => _send('POST', '/consignors', d);
  static Future<dynamic> updateConsignor(String id, Map<String, dynamic> d) => _send('PUT', '/consignors/$id', d);
  static Future<dynamic> deleteConsignor(String id) => _send('DELETE', '/consignors/$id');
  static Future<Map<String, dynamic>> settleConsignor(String id, {String? notes}) async =>
      Map<String, dynamic>.from(await _send('POST', '/consignors/$id/settle', {'notes': notes}));

  // ---- Purchase Orders ----
  static Future<List<dynamic>> purchaseOrders({String? status}) async =>
      List.from(await _get('/purchase-orders', {'status': status}));
  static Future<Map<String, dynamic>> purchaseOrder(String id) async =>
      Map<String, dynamic>.from(await _get('/purchase-orders/$id'));
  static Future<dynamic> createPurchaseOrder(Map<String, dynamic> d) => _send('POST', '/purchase-orders', d);
  static Future<dynamic> receivePurchaseOrder(String id) => _send('POST', '/purchase-orders/$id/receive');
  static Future<dynamic> deletePurchaseOrder(String id) => _send('DELETE', '/purchase-orders/$id');

  // ---- Expenses ----
  static Future<List<dynamic>> expenses({Map<String, dynamic>? params}) async =>
      List.from(await _get('/expenses', params));
  static Future<dynamic> createExpense(Map<String, dynamic> d) => _send('POST', '/expenses', d);
  static Future<dynamic> deleteExpense(String id) => _send('DELETE', '/expenses/$id');

  // ---- Dashboard ----
  static Future<Map<String, dynamic>> dashboardSummary() async =>
      Map<String, dynamic>.from(await _get('/dashboard/summary'));
  static Future<List<dynamic>> salesChart({String? period}) async =>
      List.from(await _get('/dashboard/sales-chart', {'period': period}));
  static Future<List<dynamic>> paymentMethods() async =>
      List.from(await _get('/dashboard/payment-methods'));
  static Future<List<dynamic>> peakHours() async =>
      List.from(await _get('/dashboard/peak-hours'));
  static Future<Map<String, dynamic>> profitLoss({String? startDate, String? endDate}) async =>
      Map<String, dynamic>.from(await _get('/dashboard/profit-loss', {'start_date': startDate, 'end_date': endDate}));
  static Future<Map<String, dynamic>> abcAnalysis() async =>
      Map<String, dynamic>.from(await _get('/dashboard/abc-analysis'));

  // ---- CRM ----
  static Future<List<dynamic>> pointsHistory(String customerId) async =>
      List.from(await _get('/crm/points-history/$customerId'));
  static Future<dynamic> redeemPoints(String customerId, num points, {String? transactionId}) =>
      _send('POST', '/crm/redeem-points', {'customer_id': customerId, 'points': points, 'transaction_id': transactionId});
  static Future<List<dynamic>> membershipTiers() async =>
      List.from(await _get('/crm/membership-tiers'));
}
