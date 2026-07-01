import 'package:flutter/material.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/api.dart';

class PurchaseOrdersScreen extends StatefulWidget {
  const PurchaseOrdersScreen({super.key});
  @override
  State<PurchaseOrdersScreen> createState() => _PurchaseOrdersScreenState();
}

class _PurchaseOrdersScreenState extends State<PurchaseOrdersScreen> {
  List<dynamic> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await Api.purchaseOrders();
      if (mounted) setState(() => _orders = res);
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _receive(String id) async {
    try {
      await Api.receivePurchaseOrder(id);
      if (mounted) showSnack(context, 'Barang diterima, stok ditambahkan');
      _load();
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    }
  }

  Future<void> _create() async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const _CreatePoPage()),
    );
    if (result == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      floatingActionButton: FloatingActionButton.extended(onPressed: _create, icon: const Icon(Icons.add), label: const Text('Buat PO')),
      body: _loading
          ? const Loading()
          : _orders.isEmpty
              ? const EmptyState(icon: Icons.shopping_cart_checkout, message: 'Belum ada pembelian')
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: _orders.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 6),
                    itemBuilder: (_, i) {
                      final po = _orders[i];
                      final received = po['status'] == 'received';
                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: (received ? AppColors.success : AppColors.warning).withValues(alpha: 0.15),
                            child: Icon(received ? Icons.check : Icons.pending, color: received ? AppColors.success : AppColors.warning),
                          ),
                          title: Text(po['po_number'].toString(), style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text('${po['supplier_name'] ?? '-'} · ${rupiah(toDouble(po['total_amount']))}\n${po['status']}'),
                          isThreeLine: true,
                          trailing: received
                              ? null
                              : FilledButton(
                                  style: FilledButton.styleFrom(backgroundColor: AppColors.success, minimumSize: const Size(0, 40)),
                                  onPressed: () => _receive(po['id'].toString()),
                                  child: const Text('Terima'),
                                ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

class _CreatePoPage extends StatefulWidget {
  const _CreatePoPage();
  @override
  State<_CreatePoPage> createState() => _CreatePoPageState();
}

class _CreatePoPageState extends State<_CreatePoPage> {
  List<dynamic> _suppliers = [];
  List<dynamic> _products = [];
  String? _supplierId;
  final Map<String, Map<String, dynamic>> _lines = {}; // productId -> {qty, cost, name}
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final s = await Api.suppliers();
      final p = await Api.products(params: {'is_active': 1});
      if (mounted) {
        setState(() {
          _suppliers = s;
          _products = p;
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

  double get _total => _lines.values.fold(0, (s, l) => s + toDouble(l['qty']) * toDouble(l['cost']));

  Future<void> _save() async {
    if (_supplierId == null) {
      showSnack(context, 'Pilih supplier dulu', error: true);
      return;
    }
    final items = _lines.entries
        .where((e) => toDouble(e.value['qty']) > 0)
        .map((e) => {'product_id': e.key, 'quantity': toDouble(e.value['qty']), 'unit_cost': toDouble(e.value['cost'])})
        .toList();
    if (items.isEmpty) {
      showSnack(context, 'Tambahkan minimal 1 produk', error: true);
      return;
    }
    try {
      await Api.createPurchaseOrder({'supplier_id': _supplierId, 'items': items});
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Buat Purchase Order')),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(children: [
            Expanded(child: Text('Total: ${rupiah(_total)}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
            FilledButton.icon(onPressed: _save, icon: const Icon(Icons.save), label: const Text('Simpan PO')),
          ]),
        ),
      ),
      body: _loading
          ? const Loading()
          : ListView(
              padding: const EdgeInsets.all(12),
              children: [
                DropdownButtonFormField<String>(
                  initialValue: _supplierId,
                  decoration: const InputDecoration(labelText: 'Supplier'),
                  items: _suppliers.map((s) => DropdownMenuItem(value: s['id'].toString(), child: Text(s['name'].toString()))).toList(),
                  onChanged: (v) => setState(() => _supplierId = v),
                ),
                const SizedBox(height: 12),
                const SectionTitle('Produk'),
                ..._products.map((p) {
                  final id = p['id'].toString();
                  final line = _lines[id];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 6),
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: Row(children: [
                        Expanded(child: Text(p['name'].toString(), style: const TextStyle(fontWeight: FontWeight.w600))),
                        SizedBox(
                          width: 60,
                          child: TextField(
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'Qty', isDense: true),
                            onChanged: (v) => setState(() => _lines.putIfAbsent(id, () => {'qty': 0, 'cost': toDouble(p['cost_price']), 'name': p['name']})['qty'] = double.tryParse(v) ?? 0),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          width: 90,
                          child: TextField(
                            keyboardType: TextInputType.number,
                            controller: TextEditingController(text: (line?['cost'] ?? toDouble(p['cost_price'])).toStringAsFixed(0)),
                            decoration: const InputDecoration(labelText: 'Modal', isDense: true),
                            onChanged: (v) => setState(() => _lines.putIfAbsent(id, () => {'qty': 0, 'cost': 0, 'name': p['name']})['cost'] = double.tryParse(v) ?? 0),
                          ),
                        ),
                      ]),
                    ),
                  );
                }),
              ],
            ),
    );
  }
}
