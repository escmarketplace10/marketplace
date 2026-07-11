import 'package:flutter/material.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/api.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});
  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  List<dynamic> _products = [];
  String _search = '';
  bool _loading = true;
  bool _onlyLow = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = _onlyLow ? await Api.lowStock() : await Api.products(params: {'is_active': 1});
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

  Future<void> _adjust(dynamic product) async {
    final qtyCtrl = TextEditingController();
    String type = 'in';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => AlertDialog(
          title: Text('Sesuaikan Stok — ${product['name']}'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('Stok sekarang: ${formatStock(toDouble(product['stock']), product['unit']?.toString())} ${product['unit'] ?? ''}'),
            const SizedBox(height: 12),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'in', label: Text('Masuk'), icon: Icon(Icons.add)),
                ButtonSegment(value: 'out', label: Text('Keluar'), icon: Icon(Icons.remove)),
                ButtonSegment(value: 'set', label: Text('Set'), icon: Icon(Icons.edit)),
              ],
              selected: {type},
              onSelectionChanged: (s) => setS(() => type = s.first),
            ),
            const SizedBox(height: 12),
            TextField(controller: qtyCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Jumlah')),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Simpan')),
          ],
        ),
      ),
    );
    if (ok == true) {
      try {
        await Api.adjustStock({'product_id': product['id'], 'quantity': double.tryParse(qtyCtrl.text) ?? 0, 'type': type});
        _load();
      } catch (e) {
        if (mounted) showSnack(context, e.toString(), error: true);
      }
    }
  }

  Future<void> _transfer(dynamic product) async {
    final qtyCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Keluarkan ke Kasir — ${product['name']}'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text('Stok gudang: ${formatStock(toDouble(product['stock']), product['unit']?.toString())} ${product['unit'] ?? ''}'),
          Text('Stok kasir: ${formatStock(toDouble(product['cashier_stock']), product['unit']?.toString())} ${product['unit'] ?? ''}'),
          const SizedBox(height: 12),
          TextField(controller: qtyCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Jumlah dipindahkan')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Pindahkan')),
        ],
      ),
    );
    if (ok == true) {
      final qty = double.tryParse(qtyCtrl.text) ?? 0;
      if (qty <= 0) return;
      try {
        await Api.transferStock(product['id'].toString(), qty);
        if (mounted) showSnack(context, 'Stok dipindahkan ke kasir.');
        _load();
      } catch (e) {
        if (mounted) showSnack(context, e.toString(), error: true);
      }
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
            child: Row(children: [
              Expanded(
                child: TextField(
                  decoration: const InputDecoration(hintText: 'Cari produk...', prefixIcon: Icon(Icons.search), isDense: true),
                  onChanged: (v) => setState(() => _search = v),
                ),
              ),
              const SizedBox(width: 8),
              FilterChip(
                label: const Text('Stok menipis'),
                selected: _onlyLow,
                onSelected: (v) {
                  setState(() => _onlyLow = v);
                  _load();
                },
              ),
            ]),
          ),
          Expanded(
            child: _loading
                ? const Loading()
                : _filtered.isEmpty
                    ? const EmptyState(icon: Icons.inventory_2, message: 'Tidak ada produk')
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          itemCount: _filtered.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 6),
                          itemBuilder: (_, i) {
                            final p = _filtered[i];
                            final stock = toDouble(p['stock']);
                            final low = stock <= toDouble(p['min_stock']);
                            final unit = p['unit']?.toString();
                            return Card(
                              child: ListTile(
                                title: Text(p['name'].toString(), style: const TextStyle(fontWeight: FontWeight.w700)),
                                subtitle: Text('Kasir: ${formatStock(toDouble(p['cashier_stock']), unit)} ${p['unit'] ?? ''} · min ${formatStock(toDouble(p['min_stock']), unit)}'),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text('${formatStock(stock, unit)} ${p['unit'] ?? ''}',
                                            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: low ? AppColors.danger : AppColors.ink)),
                                        const Text('gudang', style: TextStyle(color: AppColors.muted, fontSize: 10)),
                                      ],
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.local_shipping_outlined),
                                      tooltip: 'Keluarkan ke kasir',
                                      onPressed: () => _transfer(p),
                                    ),
                                  ],
                                ),
                                onTap: () => _adjust(p),
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
}
