import 'package:flutter/material.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/api.dart';

/// Opname stok kasir: kasir mencocokkan stok yang tercatat di app (stok kasir)
/// dengan stok fisik yang mereka pegang. Selisih ditampilkan & disimpan.
class CashierOpnameScreen extends StatefulWidget {
  const CashierOpnameScreen({super.key});
  @override
  State<CashierOpnameScreen> createState() => _CashierOpnameScreenState();
}

class _CashierOpnameScreenState extends State<CashierOpnameScreen> {
  List<dynamic> _products = [];
  final Map<String, TextEditingController> _ctrls = {};
  String _search = '';
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final c in _ctrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await Api.products(params: {'is_active': 1});
      if (mounted) setState(() => _products = res);
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<dynamic> get _filtered => _products.where((p) {
        if (toInt(p['is_track_stock']) == 0) return false;
        if (_search.isNotEmpty && !p['name'].toString().toLowerCase().contains(_search.toLowerCase())) return false;
        return true;
      }).toList();

  TextEditingController _ctrlFor(dynamic p) =>
      _ctrls.putIfAbsent(p['id'].toString(), () => TextEditingController());

  Future<void> _save() async {
    // Kumpulkan hanya produk yang diisi & berbeda dari stok app.
    final items = <Map<String, dynamic>>[];
    for (final p in _products) {
      if (toInt(p['is_track_stock']) == 0) continue;
      final ctrl = _ctrls[p['id'].toString()];
      final text = ctrl?.text.trim() ?? '';
      if (text.isEmpty) continue;
      final actual = double.tryParse(text);
      if (actual == null) continue;
      if (actual == toDouble(p['cashier_stock'])) continue;
      items.add({'product_id': p['id'], 'actual_stock': actual});
    }

    if (items.isEmpty) {
      showSnack(context, 'Tidak ada perubahan untuk disimpan.');
      return;
    }

    setState(() => _saving = true);
    try {
      final res = await Api.cashierOpname(items);
      final adjustments = (res['adjustments'] as List?) ?? [];
      if (!mounted) return;
      showSnack(context, 'Opname tersimpan: ${adjustments.length} produk disesuaikan.', error: false);
      for (final c in _ctrls.values) {
        c.clear();
      }
      _load();
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              decoration: const InputDecoration(hintText: 'Cari produk...', prefixIcon: Icon(Icons.search), isDense: true),
              onChanged: (v) => setState(() => _search = v),
            ),
          ),
          Expanded(
            child: _loading
                ? const Loading()
                : _filtered.isEmpty
                    ? const EmptyState(icon: Icons.inventory_2, message: 'Tidak ada produk')
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(12, 0, 12, 90),
                          itemCount: _filtered.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 6),
                          itemBuilder: (_, i) {
                            final p = _filtered[i];
                            final appStock = toDouble(p['cashier_stock']);
                            final unit = p['unit']?.toString() ?? '';
                            final ctrl = _ctrlFor(p);
                            final typed = double.tryParse(ctrl.text.trim());
                            final diff = typed == null ? null : typed - appStock;
                            return Card(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(p['name'].toString(), style: const TextStyle(fontWeight: FontWeight.w700)),
                                          const SizedBox(height: 2),
                                          Text('Stok app: ${formatStock(appStock, unit)} $unit',
                                              style: const TextStyle(fontSize: 12, color: AppColors.muted)),
                                          if (diff != null && diff != 0)
                                            Text(
                                                diff < 0
                                                    ? 'Balik ke gudang: ${formatStock(-diff, unit)} $unit'
                                                    : 'Selisih: +${formatStock(diff, unit)} $unit',
                                                style: TextStyle(
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.w700,
                                                    color: diff < 0 ? AppColors.primary : AppColors.success)),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    SizedBox(
                                      width: 96,
                                      child: TextField(
                                        controller: ctrl,
                                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(fontWeight: FontWeight.w800),
                                        decoration: const InputDecoration(labelText: 'Fisik', isDense: true),
                                        onChanged: (_) => setState(() {}),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _saving ? null : _save,
        icon: _saving
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : const Icon(Icons.save),
        label: Text(_saving ? 'Menyimpan...' : 'Simpan Opname'),
      ),
    );
  }
}
