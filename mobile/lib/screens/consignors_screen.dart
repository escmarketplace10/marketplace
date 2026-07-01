import 'package:flutter/material.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/api.dart';

/// Penitip / Barang Titipan (Konsinyasi): kelola penitip & lihat komisi yang harus disetor.
class ConsignorsScreen extends StatefulWidget {
  const ConsignorsScreen({super.key});
  @override
  State<ConsignorsScreen> createState() => _ConsignorsScreenState();
}

class _ConsignorsScreenState extends State<ConsignorsScreen> {
  List<dynamic> _consignors = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await Api.consignors();
      if (mounted) setState(() => _consignors = res);
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _edit([dynamic existing]) async {
    final nameCtrl = TextEditingController(text: existing?['name']?.toString() ?? '');
    final phoneCtrl = TextEditingController(text: existing?['phone']?.toString() ?? '');
    final notesCtrl = TextEditingController(text: existing?['notes']?.toString() ?? '');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(existing == null ? 'Penitip Baru' : 'Edit Penitip'),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Nama penitip')),
            const SizedBox(height: 8),
            TextField(controller: phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Telepon')),
            const SizedBox(height: 8),
            TextField(controller: notesCtrl, decoration: const InputDecoration(labelText: 'Catatan (opsional)')),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Simpan')),
        ],
      ),
    );
    if (ok == true && nameCtrl.text.isNotEmpty) {
      try {
        final data = {'name': nameCtrl.text, 'phone': phoneCtrl.text, 'notes': notesCtrl.text};
        if (existing == null) {
          await Api.createConsignor(data);
        } else {
          await Api.updateConsignor(existing['id'].toString(), data);
        }
        _load();
      } catch (e) {
        if (mounted) showSnack(context, e.toString(), error: true);
      }
    }
  }

  Future<void> _delete(dynamic c) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi'),
        content: Text('Hapus penitip "${c['name']}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(style: FilledButton.styleFrom(backgroundColor: AppColors.danger), onPressed: () => Navigator.pop(ctx, true), child: const Text('Hapus')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await Api.deleteConsignor(c['id'].toString());
      _load();
    } catch (e) {
      if (mounted) showSnack(context, 'Tidak bisa hapus: masih ada produk titipan penitip ini.', error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      floatingActionButton: FloatingActionButton.extended(onPressed: () => _edit(), icon: const Icon(Icons.add), label: const Text('Tambah')),
      body: _loading
          ? const Loading()
          : _consignors.isEmpty
              ? const EmptyState(icon: Icons.handshake_rounded, message: 'Belum ada penitip barang titipan')
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: _consignors.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 6),
                    itemBuilder: (_, i) {
                      final c = _consignors[i];
                      final payable = toDouble(c['payable_amount']);
                      return Card(
                        child: ListTile(
                          leading: const CircleAvatar(child: Icon(Icons.handshake_rounded)),
                          title: Text(c['name'].toString(), style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text('${c['phone'] ?? '-'} · Belum disetor: ${rupiah(payable)}'),
                          trailing: PopupMenuButton<String>(
                            onSelected: (v) {
                              if (v == 'edit') _edit(c);
                              if (v == 'delete') _delete(c);
                            },
                            itemBuilder: (_) => const [
                              PopupMenuItem(value: 'edit', child: Text('Edit')),
                              PopupMenuItem(value: 'delete', child: Text('Hapus')),
                            ],
                          ),
                          onTap: () async {
                            await Navigator.push(context, MaterialPageRoute(builder: (_) => ConsignorDetailScreen(consignor: c)));
                            _load();
                          },
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

/// Detail penitip: rincian penjualan belum disetor + tombol setor + riwayat setoran.
class ConsignorDetailScreen extends StatefulWidget {
  final dynamic consignor;
  const ConsignorDetailScreen({super.key, required this.consignor});
  @override
  State<ConsignorDetailScreen> createState() => _ConsignorDetailScreenState();
}

class _ConsignorDetailScreenState extends State<ConsignorDetailScreen> {
  Map<String, dynamic>? _report;
  List<dynamic> _settlements = [];
  bool _loading = true;
  bool _settling = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final id = widget.consignor['id'].toString();
      final report = await Api.consignorReport(id);
      final settlements = await Api.consignorSettlements(id);
      if (mounted) setState(() { _report = report; _settlements = settlements; });
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _settle() async {
    final payable = toDouble(_report?['payable_amount']);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Setor ke Penitip'),
        content: Text('Tandai ${rupiah(payable)} sebagai sudah disetor ke ${widget.consignor['name']}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Setor')),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _settling = true);
    try {
      await Api.settleConsignor(widget.consignor['id'].toString());
      if (mounted) showSnack(context, 'Setoran tercatat');
      _load();
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _settling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalSales = toDouble(_report?['total_sales']);
    final commission = toDouble(_report?['commission_amount']);
    final payable = toDouble(_report?['payable_amount']);
    final items = (_report?['items'] as List?) ?? [];

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(title: Text(widget.consignor['name'].toString())),
      body: _loading
          ? const Loading()
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Text('Belum Disetor', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 4),
                        Text(rupiah(payable), style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.ink)),
                        const SizedBox(height: 8),
                        Text('Total penjualan: ${rupiah(totalSales)} · Komisi toko: ${rupiah(commission)}',
                            style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            onPressed: (payable <= 0 || _settling) ? null : _settle,
                            icon: const Icon(Icons.check_circle_outline),
                            label: Text(_settling ? 'Memproses...' : 'Tandai Sudah Disetor'),
                          ),
                        ),
                      ]),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const SectionTitle('Penjualan Belum Disetor'),
                  if (items.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Center(child: Text('Tidak ada penjualan baru', style: TextStyle(color: AppColors.muted))),
                    )
                  else
                    ...items.map((it) => Card(
                          child: ListTile(
                            title: Text('${it['product_name']} x${toDouble(it['quantity']).toStringAsFixed(0)}'),
                            subtitle: Text('${it['receipt_number']} · ${formatDateTime(it['created_at']?.toString())}'),
                            trailing: Text(rupiah(toDouble(it['payable_amount'])), style: const TextStyle(fontWeight: FontWeight.w700)),
                          ),
                        )),
                  const SizedBox(height: 16),
                  const SectionTitle('Riwayat Setoran'),
                  if (_settlements.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Center(child: Text('Belum ada riwayat setoran', style: TextStyle(color: AppColors.muted))),
                    )
                  else
                    ..._settlements.map((s) => Card(
                          child: ListTile(
                            leading: const Icon(Icons.receipt_long),
                            title: Text(rupiah(toDouble(s['payable_amount']))),
                            subtitle: Text('Disetor ${formatDateTime(s['created_at']?.toString())} · komisi toko ${rupiah(toDouble(s['commission_amount']))}'),
                          ),
                        )),
                ],
              ),
            ),
    );
  }
}
