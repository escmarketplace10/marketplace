import 'package:intl/intl.dart';

final _rupiah = NumberFormat.currency(
  locale: 'id_ID',
  symbol: 'Rp ',
  decimalDigits: 0,
);

/// Format angka menjadi Rupiah, contoh: 15000 -> "Rp 15.000".
String rupiah(num? value) => _rupiah.format(value ?? 0);

/// Format pecahan uang ringkas, contoh: 1000 -> "1rb", 50000 -> "50rb", 1000000 -> "1jt".
String compactRupiah(int v) {
  if (v >= 1000000) {
    final jt = v / 1000000;
    return '${jt == jt.roundToDouble() ? jt.toStringAsFixed(0) : jt.toStringAsFixed(1)}jt';
  }
  if (v >= 1000) return '${v ~/ 1000}rb';
  return '$v';
}

/// Format angka ringkas, contoh: 1500000 -> "1,5 jt".
String compactNumber(num? value) {
  final v = value ?? 0;
  if (v >= 1000000000) return '${(v / 1000000000).toStringAsFixed(1)} M';
  if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)} jt';
  if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)} rb';
  return v.toStringAsFixed(0);
}

final _dateFmt = DateFormat('dd MMM yyyy', 'id_ID');
final _timeFmt = DateFormat('dd MMM yyyy, HH:mm', 'id_ID');

DateTime? _parse(String? iso) {
  if (iso == null || iso.isEmpty) return null;
  // Backend menyimpan UTC (datetime('now')). Tambah Z bila perlu lalu ke lokal.
  final raw = iso.contains('T') ? iso : iso.replaceFirst(' ', 'T');
  final withZone = raw.endsWith('Z') || raw.contains('+') ? raw : '${raw}Z';
  return DateTime.tryParse(withZone)?.toLocal();
}

String formatDate(String? iso) {
  final d = _parse(iso);
  return d == null ? '-' : _dateFmt.format(d);
}

String formatDateTime(String? iso) {
  final d = _parse(iso);
  return d == null ? '-' : _timeFmt.format(d);
}

/// Helper konversi aman dari JSON (backend kadang mengirim int/double/string).
double toDouble(dynamic v) {
  if (v == null) return 0;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString()) ?? 0;
}

int toInt(dynamic v) {
  if (v == null) return 0;
  if (v is num) return v.toInt();
  return int.tryParse(v.toString()) ?? 0;
}
