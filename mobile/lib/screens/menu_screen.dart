import 'package:flutter/material.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/api.dart';

/// Lihat daftar menu (read-only). Tambah/edit/hapus hanya bisa dari Admin Web.
class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});
  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  List<dynamic> _categories = [];
  List<dynamic> _products = [];
  String _activeCat = '';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final cats = await Api.categories();
      final prods = await Api.products(params: {'is_active': 1});
      if (mounted) {
        setState(() {
          _categories = cats;
          _products = prods;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        showSnack(context, e.toString(), error: true);
      }
    }
  }

  List<dynamic> get _filtered =>
      _products.where((p) => _activeCat.isEmpty || p['category_id'] == _activeCat).toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: _loading
          ? const Loading()
          : Column(
              children: [
                // Category chips
                SizedBox(
                  height: 52,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    children: [
                      _catChip('Semua', ''),
                      ..._categories.map((c) => _catChip('${c['icon'] ?? ''} ${c['name']}', c['id'].toString())),
                    ],
                  ),
                ),
                // Info banner
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.info_outline, size: 18, color: AppColors.primary),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Untuk menambah atau mengubah menu, gunakan Panel Admin di website.',
                          style: TextStyle(fontSize: 12, color: AppColors.muted),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                // Product list
                Expanded(
                  child: _filtered.isEmpty
                      ? const EmptyState(
                          icon: Icons.restaurant_menu,
                          message: 'Belum ada menu.\nTambahkan lewat Panel Admin di website.',
                        )
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(12, 0, 12, 24),
                            itemCount: _filtered.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 6),
                            itemBuilder: (_, i) {
                              final p = _filtered[i];
                              return Card(
                                child: ListTile(
                                  leading: ClipRRect(
                                    borderRadius: BorderRadius.circular(10),
                                    child: SizedBox(width: 46, height: 46, child: ProductThumb(product: p, iconSize: 22)),
                                  ),
                                  title: Text(p['name'].toString(), style: const TextStyle(fontWeight: FontWeight.w700)),
                                  subtitle: Text('${rupiah(toDouble(p['price']))}'
                                      '${toInt(p['is_track_stock']) == 1 ? ' · stok ${formatStock(toDouble(p['stock']), p['unit']?.toString())} ${p['unit'] ?? ''}' : ''}'
                                      '${p['consignor_id'] != null ? ' · titipan ${p['consignor_name'] ?? ''}' : ''}'),
                                  trailing: p.containsKey('cost_price') && toDouble(p['cost_price']) > 0
                                      ? Text('Modal ${rupiah(toDouble(p['cost_price']))}',
                                          style: const TextStyle(fontSize: 11, color: AppColors.muted))
                                      : null,
                                ),
                              );
                            },
                          ),
                        ),
                ),
              ],
            ),
    );
  }

  Widget _catChip(String label, String id) {
    final active = _activeCat == id;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: active,
        onSelected: (_) => setState(() => _activeCat = id),
        selectedColor: AppColors.primary,
        labelStyle: TextStyle(fontWeight: FontWeight.w700, color: active ? Colors.white : AppColors.ink),
        backgroundColor: Colors.white,
        side: BorderSide(color: Colors.black.withValues(alpha: 0.08)),
      ),
    );
  }
}
