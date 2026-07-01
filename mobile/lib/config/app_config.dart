import 'package:shared_preferences/shared_preferences.dart';

/// Menyimpan konfigurasi aplikasi (alamat server, sesi login terakhir)
/// secara lokal di device memakai shared_preferences.
class AppConfig {
  static const _kEmployee = 'session_employee';
  static const _kToken = 'session_token';
  static const _kStoreLogin = 'store_login_email';

  static late SharedPreferences _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  /// Base URL server CLOUD atau LOKAL.
  static const String baseUrl = 'https://escmarketplace.vercel.app';

  static bool get isConfigured => true; // Selalu true karena hardcoded

  /// URL endpoint API lengkap.
  static String get apiBase => '$baseUrl/api';

  /// URL lengkap untuk gambar yang disimpan server (mis. /uploads/x.jpg).
  static String imageUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http')) return path;
    return '$baseUrl$path';
  }

  static String? get employeeJson => _prefs.getString(_kEmployee);
  static String? get token => _prefs.getString(_kToken);
  static String? get storeToken => _prefs.getString(_kStoreLogin);

  static Future<void> saveSession(String employeeJson, String token) async {
    await _prefs.setString(_kEmployee, employeeJson);
    await _prefs.setString(_kToken, token);
  }

  static Future<void> clearSession() async {
    await _prefs.remove(_kEmployee);
    await _prefs.remove(_kToken);
  }

  static Future<void> saveStoreToken(String tok) async {
    await _prefs.setString(_kStoreLogin, tok);
  }

  static Future<void> clearStoreToken() async {
    await _prefs.remove(_kStoreLogin);
  }

  // ---- Pecahan uang cepat (untuk Atur Kembalian) ----
  static const _kDenoms = 'cash_denoms';
  static const List<int> _defaultDenoms = [1000, 2000, 5000, 10000, 20000, 50000, 100000];

  static List<int> get cashDenoms {
    final raw = _prefs.getString(_kDenoms);
    if (raw == null || raw.isEmpty) return _defaultDenoms;
    final list = raw.split(',').map((e) => int.tryParse(e.trim()) ?? 0).where((e) => e > 0).toList();
    return list.isEmpty ? _defaultDenoms : list;
  }

  static Future<void> setCashDenoms(List<int> denoms) async {
    final clean = denoms.where((e) => e > 0).toList()..sort();
    await _prefs.setString(_kDenoms, clean.join(','));
  }
}
