import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/api.dart';
import '../state/session.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});
  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  List<dynamic> _trx = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await Api.transactions(params: {'limit': 100});
      if (mounted) setState(() => _trx = res);
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openDetail(String id) async {
    try {
      final trx = await Api.transaction(id);
      if (!mounted) return;
      final canVoid = context.read<Session>().can('reports');
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (_) => _DetailSheet(trx: trx, canVoid: canVoid, onVoided: _load),
      );
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: _loading
          ? const Loading()
          : _trx.isEmpty
              ? const EmptyState(icon: Icons.receipt_long, message: 'Belum ada transaksi')
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: _trx.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 6),
                    itemBuilder: (_, i) {
                      final t = _trx[i];
                      final isVoid = toInt(t['is_void']) == 1;
                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: (isVoid ? AppColors.danger : AppColors.primary).withValues(alpha: 0.12),
                            child: Icon(isVoid ? Icons.cancel : Icons.receipt, color: isVoid ? AppColors.danger : AppColors.primary),
                          ),
                          title: Text('${t['transaction_name'] ?? t['receipt_number']} · ${t['employee_name'] ?? '-'}',
                              style: TextStyle(fontWeight: FontWeight.w700, decoration: isVoid ? TextDecoration.lineThrough : null)),
                          subtitle: Text('${formatDateTime(t['created_at'])} · ${t['payment_method'] ?? ''}'),
                          trailing: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.end, children: [
                            Text(rupiah(toDouble(t['grand_total'])), style: const TextStyle(fontWeight: FontWeight.w800)),
                            Text(t['payment_status'] == 'completed' ? 'Lunas' : 'Belum dibayar',
                                style: const TextStyle(fontSize: 11, color: AppColors.muted)),
                          ]),
                          onTap: () => _openDetail(t['id'].toString()),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

class _DetailSheet extends StatefulWidget {
  final Map<String, dynamic> trx;
  final bool canVoid;
  final VoidCallback onVoided;
  const _DetailSheet({required this.trx, required this.canVoid, required this.onVoided});

  @override
  State<_DetailSheet> createState() => _DetailSheetState();
}

class _DetailSheetState extends State<_DetailSheet> {
  late Map<String, dynamic> trx;
  bool _working = false;

  @override
  void initState() {
    super.initState();
    trx = widget.trx;
  }

  Future<void> _mark(Map<String, dynamic> item, bool delivered) async {
    setState(() => _working = true);
    try {
      await Api.markDelivered(trx['id'].toString(), item['id'].toString(), delivered ? toDouble(item['quantity']) : 0);
      final updated = await Api.transaction(trx['id'].toString());
      if (mounted) setState(() => trx = updated);
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  Future<void> _pay() async {
    final cashCtrl = TextEditingController(text: toDouble(trx['grand_total']).toStringAsFixed(0));
    String method = 'cash';
    bool keepChange = false;
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setDialog) => AlertDialog(
        title: const Text('Konfirmasi pembayaran'),
        content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text((trx['transaction_name'] ?? '').toString(), style: const TextStyle(fontWeight: FontWeight.w700)),
          Text(rupiah(toDouble(trx['grand_total']))),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: method,
            decoration: const InputDecoration(labelText: 'Metode pembayaran'),
            items: const [
              DropdownMenuItem(value: 'cash', child: Text('Tunai')),
              DropdownMenuItem(value: 'qris', child: Text('QRIS')),
              DropdownMenuItem(value: 'card', child: Text('Kartu')),
              DropdownMenuItem(value: 'ewallet', child: Text('E-Wallet')),
            ],
            onChanged: (v) => setDialog(() => method = v ?? 'cash'),
          ),
          if (method == 'cash') ...[
            TextField(controller: cashCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Uang diterima')),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: keepChange,
              title: const Text('Uang lebih masuk kas'),
              onChanged: (v) => setDialog(() => keepChange = v ?? false),
            ),
          ],
        ])),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, {
            'payment_method': method,
            'cash_amount': double.tryParse(cashCtrl.text),
            'keep_change': keepChange,
          }), child: const Text('Konfirmasi Lunas')),
        ],
      )),
    );
    cashCtrl.dispose();
    if (result == null || !mounted) return;
    setState(() => _working = true);
    try {
      final response = await Api.payTransaction(trx['id'].toString(), result);
      if (!mounted) return;
      widget.onVoided();
      final navigator = Navigator.of(context);
      final dialogContext = navigator.context;
      navigator.pop();
      final paid = Map<String, dynamic>.from(response['transaction']);
      if (!dialogContext.mounted) return;
      showDialog(context: dialogContext, builder: (ctx) => AlertDialog(
        title: const Text('Transaksi Lunas'),
        content: Text('${paid['transaction_name']}\n${paid['receipt_number']}\n${rupiah(toDouble(paid['grand_total']))}'),
        actions: [FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('Selesai'))],
      ));
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  Future<void> _void(BuildContext context) async {
    final voidBy = context.read<Session>().employeeId;
    final reasonCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Batalkan Transaksi (Void)'),
        content: TextField(controller: reasonCtrl, decoration: const InputDecoration(labelText: 'Alasan void')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(style: FilledButton.styleFrom(backgroundColor: AppColors.danger), onPressed: () => Navigator.pop(ctx, true), child: const Text('Void')),
        ],
      ),
    );
    if (ok == true) {
      try {
        await Api.voidTransaction(trx['id'].toString(), {'reason': reasonCtrl.text, 'void_by': voidBy});
        if (context.mounted) {
          Navigator.pop(context);
          widget.onVoided();
          showSnack(context, 'Transaksi dibatalkan & stok dikembalikan');
        }
      } catch (e) {
        if (context.mounted) showSnack(context, e.toString(), error: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = (trx['items'] as List?) ?? [];
    final isVoid = toInt(trx['is_void']) == 1;
    final isOpen = trx['payment_status'] == 'pending' && !isVoid;
    final role = context.read<Session>().role;
    final complete = items.isNotEmpty && items.every((it) => toDouble(it['delivered_quantity']) >= toDouble(it['quantity']));
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.8,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text((trx['transaction_name'] ?? trx['receipt_number']).toString(), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            Text(trx['receipt_number'].toString()),
            Text('${formatDateTime(trx['created_at'])} · ${trx['employee_name'] ?? ''}', style: const TextStyle(color: AppColors.muted)),
            if (isVoid) Text('DIBATALKAN: ${trx['void_reason'] ?? ''}', style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700)),
            const Divider(),
            Expanded(
              child: ListView(
                children: [
                  ...items.map((it) => ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: Text('${toInt(it['quantity'])}x ${it['product_name']}'),
                        subtitle: Text('${toInt(it['delivered_quantity'])}/${toInt(it['quantity'])} terantar'),
                        trailing: isOpen && role == 'cashier'
                            ? Checkbox(
                                value: toDouble(it['delivered_quantity']) >= toDouble(it['quantity']),
                                onChanged: _working ? null : (v) => _mark(Map<String, dynamic>.from(it), v ?? false),
                              )
                            : Text(rupiah(toDouble(it['total_price']))),
                      )),
                ],
              ),
            ),
            const Divider(),
            _row('Subtotal', rupiah(toDouble(trx['subtotal']))),
            _row('Diskon', '-${rupiah(toDouble(trx['discount_total']))}'),
            _row('Total', rupiah(toDouble(trx['grand_total'])), big: true),
            if (!isOpen) _row('Bayar (${trx['payment_method']})', rupiah(toDouble(trx['cash_amount']))),
            if (!isOpen) _row('Kembalian', rupiah(toDouble(trx['change_amount']))),
            const SizedBox(height: 12),
            if (isOpen && role == 'cashier') FilledButton(
              onPressed: _working || !complete ? null : _pay,
              child: Text(complete ? 'Periksa dan Tutup Bill' : 'Tandai Semua Item Terantar'),
            ),
            if (widget.canVoid && !isVoid)
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger),
                onPressed: () => _void(context),
                icon: const Icon(Icons.cancel),
                label: const Text('Batalkan (Void)'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _row(String l, String v, {bool big = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(l, style: TextStyle(fontWeight: big ? FontWeight.w800 : FontWeight.w500, fontSize: big ? 16 : 14)),
          Text(v, style: TextStyle(fontWeight: FontWeight.w800, fontSize: big ? 16 : 14, color: big ? AppColors.primary : AppColors.ink)),
        ]),
      );
}
