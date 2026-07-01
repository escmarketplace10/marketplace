import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/api.dart';

/// Kelola Menu: tambah / ubah / hapus kategori &amp; produk.
class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});
  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  List<dynamic> _categories = [];
  List<dynamic> _products = [];
  List<dynamic> _consignors = [];
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
      final consignors = await Api.consignors();
      if (mounted) {
        setState(() {
          _categories = cats;
          _products = prods;
          _consignors = consignors;
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

  // ---------- Kategori ----------
  Future<void> _addCategory() async {
    final nameCtrl = TextEditingController();
    final iconCtrl = TextEditingController(text: '📦');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Kategori Baru'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Nama kategori')),
          const SizedBox(height: 8),
          TextField(controller: iconCtrl, decoration: const InputDecoration(labelText: 'Ikon (emoji, opsional)')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Simpan')),
        ],
      ),
    );
    if (ok == true && nameCtrl.text.isNotEmpty) {
      try {
        await Api.createCategory({'name': nameCtrl.text, 'icon': iconCtrl.text.isEmpty ? '📦' : iconCtrl.text});
        _load();
      } catch (e) {
        if (mounted) showSnack(context, e.toString(), error: true);
      }
    }
  }

  Future<void> _deleteCategory(dynamic cat) async {
    final ok = await _confirm('Hapus kategori "${cat['name']}"?');
    if (ok != true) return;
    try {
      await Api.deleteCategory(cat['id'].toString());
      if (_activeCat == cat['id']) _activeCat = '';
      _load();
    } catch (e) {
      if (mounted) showSnack(context, 'Tidak bisa hapus: masih ada produk di kategori ini.', error: true);
    }
  }

  // ---------- Produk ----------
  Future<void> _editProduct([dynamic existing]) async {
    if (_categories.isEmpty) {
      showSnack(context, 'Buat kategori dulu sebelum menambah menu.', error: true);
      return;
    }
    final nameCtrl = TextEditingController(text: existing?['name']?.toString() ?? '');
    final priceCtrl = TextEditingController(text: existing != null ? toDouble(existing['price']).toStringAsFixed(0) : '');
    final costCtrl = TextEditingController(text: existing != null ? toDouble(existing['cost_price']).toStringAsFixed(0) : '');
    final stockCtrl = TextEditingController(text: existing != null ? toDouble(existing['stock']).toStringAsFixed(0) : '0');
    final minStockCtrl = TextEditingController(text: existing != null ? toDouble(existing['min_stock']).toStringAsFixed(0) : '0');
    final unitCtrl = TextEditingController(text: existing?['unit']?.toString() ?? 'pcs');
    String catId = existing?['category_id']?.toString() ?? (_activeCat.isNotEmpty ? _activeCat : _categories.first['id'].toString());
    bool trackStock = existing == null ? true : toInt(existing['is_track_stock']) == 1;
    bool isConsignment = existing?['consignor_id'] != null;
    String? consignorId = existing?['consignor_id']?.toString();
    final commissionCtrl = TextEditingController(
        text: existing != null && existing['commission_percent'] != null ? toDouble(existing['commission_percent']).toStringAsFixed(0) : '');
    String? imageBase64;
    Uint8List? previewBytes;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) {
          Future<void> pickPhoto() async {
            final x = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 900, imageQuality: 70);
            if (x != null) {
              final bytes = await x.readAsBytes();
              setS(() {
                previewBytes = bytes;
                imageBase64 = 'data:image/jpeg;base64,${base64Encode(bytes)}';
              });
            }
          }

          return AlertDialog(
          title: Text(existing == null ? 'Menu Baru' : 'Edit Menu'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Center(
                child: GestureDetector(
                  onTap: pickPhoto,
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Container(
                      width: 96,
                      height: 96,
                      clipBehavior: Clip.antiAlias,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.line),
                        color: AppColors.bg,
                      ),
                      child: previewBytes != null
                          ? Image.memory(previewBytes!, fit: BoxFit.cover)
                          : (existing != null && (existing['image']?.toString().isNotEmpty ?? false))
                              ? ProductThumb(product: existing, iconSize: 32)
                              : const Icon(Icons.add_a_photo_outlined, color: AppColors.muted, size: 30),
                    ),
                    const SizedBox(height: 4),
                    const Text('Ketuk untuk pilih foto', style: TextStyle(fontSize: 11, color: AppColors.muted)),
                  ]),
                ),
              ),
              const SizedBox(height: 12),
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Nama menu')),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: catId,
                decoration: const InputDecoration(labelText: 'Kategori'),
                items: _categories.map((c) => DropdownMenuItem(value: c['id'].toString(), child: Text(c['name'].toString()))).toList(),
                onChanged: (v) => catId = v ?? catId,
              ),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(child: TextField(controller: priceCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Harga jual'))),
                const SizedBox(width: 8),
                Expanded(child: TextField(controller: costCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Modal (HPP)'))),
              ]),
              const SizedBox(height: 8),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Lacak stok'),
                value: trackStock,
                onChanged: (v) => setS(() => trackStock = v),
              ),
              if (trackStock)
                Row(children: [
                  Expanded(child: TextField(controller: stockCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Stok'))),
                  const SizedBox(width: 8),
                  Expanded(child: TextField(controller: minStockCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Stok min'))),
                  const SizedBox(width: 8),
                  SizedBox(width: 70, child: TextField(controller: unitCtrl, decoration: const InputDecoration(labelText: 'Satuan'))),
                ]),
              const SizedBox(height: 8),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Barang Titipan (Konsinyasi)'),
                subtitle: const Text('Produk milik penitip, toko ambil komisi per item terjual', style: TextStyle(fontSize: 11)),
                value: isConsignment,
                onChanged: _consignors.isEmpty
                    ? null
                    : (v) => setS(() {
                          isConsignment = v;
                          if (v && consignorId == null) consignorId = _consignors.first['id'].toString();
                        }),
              ),
              if (_consignors.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(bottom: 4),
                  child: Text('Belum ada penitip. Tambah dulu di menu "Penitip".', style: TextStyle(fontSize: 11, color: AppColors.muted)),
                ),
              if (isConsignment) ...[
                DropdownButtonFormField<String>(
                  initialValue: consignorId,
                  decoration: const InputDecoration(labelText: 'Penitip'),
                  items: _consignors.map((c) => DropdownMenuItem(value: c['id'].toString(), child: Text(c['name'].toString()))).toList(),
                  onChanged: (v) => setS(() => consignorId = v),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: commissionCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Komisi Toko (%)', helperText: 'Persentase dari harga jual untuk toko'),
                ),
              ],
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Simpan')),
          ],
          );
        },
      ),
    );
    if (ok == true && nameCtrl.text.isNotEmpty) {
      try {
        final data = <String, dynamic>{
          'category_id': catId,
          'name': nameCtrl.text,
          'price': double.tryParse(priceCtrl.text) ?? 0,
          'cost_price': double.tryParse(costCtrl.text) ?? 0,
          'unit': unitCtrl.text.isEmpty ? 'pcs' : unitCtrl.text,
          'stock': double.tryParse(stockCtrl.text) ?? 0,
          'min_stock': double.tryParse(minStockCtrl.text) ?? 0,
          'is_track_stock': trackStock ? 1 : 0,
          'consignor_id': isConsignment ? consignorId : null,
          'commission_percent': isConsignment ? (double.tryParse(commissionCtrl.text) ?? 0) : null,
        };
        if (imageBase64 != null) data['image_base64'] = imageBase64;
        if (existing == null) {
          await Api.createProduct(data);
        } else {
          await Api.updateProduct(existing['id'].toString(), data);
        }
        _load();
      } catch (e) {
        if (mounted) showSnack(context, e.toString(), error: true);
      }
    }
  }

  Future<void> _deleteProduct(dynamic p) async {
    final ok = await _confirm('Hapus menu "${p['name']}"? Menu akan hilang dari kasir.');
    if (ok != true) return;
    try {
      await Api.deleteProduct(p['id'].toString());
      _load();
      if (mounted) showSnack(context, 'Menu dihapus');
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    }
  }

  Future<bool?> _confirm(String message) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi'),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(style: FilledButton.styleFrom(backgroundColor: AppColors.danger), onPressed: () => Navigator.pop(ctx, true), child: const Text('Hapus')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _editProduct(),
        icon: const Icon(Icons.add),
        label: const Text('Tambah Menu'),
      ),
      body: _loading
          ? const Loading()
          : Column(
              children: [
                SizedBox(
                  height: 52,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    children: [
                      _catChip('Semua', '', null),
                      ..._categories.map((c) => _catChip('${c['icon'] ?? ''} ${c['name']}', c['id'].toString(), c)),
                      Padding(
                        padding: const EdgeInsets.only(left: 4),
                        child: ActionChip(
                          avatar: const Icon(Icons.add, size: 18),
                          label: const Text('Kategori'),
                          onPressed: _addCategory,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: _filtered.isEmpty
                      ? EmptyState(
                          icon: Icons.restaurant_menu,
                          message: _categories.isEmpty
                              ? 'Belum ada menu.\nBuat kategori dulu, lalu tambah menu.'
                              : 'Belum ada menu di kategori ini.',
                          action: FilledButton.icon(onPressed: () => _editProduct(), icon: const Icon(Icons.add), label: const Text('Tambah Menu')),
                        )
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(12, 0, 12, 88),
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
                                      '${toInt(p['is_track_stock']) == 1 ? ' · stok ${toDouble(p['stock']).toStringAsFixed(0)} ${p['unit'] ?? ''}' : ''}'
                                      '${p['consignor_id'] != null ? ' · titipan ${p['consignor_name'] ?? ''}' : ''}'),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.edit_outlined),
                                        tooltip: 'Edit',
                                        onPressed: () => _editProduct(p),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                                        tooltip: 'Hapus',
                                        onPressed: () => _deleteProduct(p),
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
    );
  }

  Widget _catChip(String label, String id, dynamic cat) {
    final active = _activeCat == id;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onLongPress: cat == null ? null : () => _deleteCategory(cat),
        child: ChoiceChip(
          label: Text(label),
          selected: active,
          onSelected: (_) => setState(() => _activeCat = id),
          selectedColor: AppColors.primary,
          labelStyle: TextStyle(fontWeight: FontWeight.w700, color: active ? Colors.white : AppColors.ink),
          backgroundColor: Colors.white,
          side: BorderSide(color: Colors.black.withValues(alpha: 0.08)),
        ),
      ),
    );
  }
}
