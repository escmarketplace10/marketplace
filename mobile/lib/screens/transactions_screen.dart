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
                          title: Text(t['receipt_number'].toString(),
                              style: TextStyle(fontWeight: FontWeight.w700, decoration: isVoid ? TextDecoration.lineThrough : null)),
                          subtitle: Text('${formatDateTime(t['created_at'])} · ${t['payment_method'] ?? ''}'),
                          trailing: Text(rupiah(toDouble(t['grand_total'])), style: const TextStyle(fontWeight: FontWeight.w800)),
                          onTap: () => _openDetail(t['id'].toString()),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

class _DetailSheet extends StatelessWidget {
  final Map<String, dynamic> trx;
  final bool canVoid;
  final VoidCallback onVoided;
  const _DetailSheet({required this.trx, required this.canVoid, required this.onVoided});

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
          onVoided();
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
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.8,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(trx['receipt_number'].toString(), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
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
                        trailing: Text(rupiah(toDouble(it['total_price']))),
                      )),
                ],
              ),
            ),
            const Divider(),
            _row('Subtotal', rupiah(toDouble(trx['subtotal']))),
            _row('Diskon', '-${rupiah(toDouble(trx['discount_total']))}'),
            _row('Total', rupiah(toDouble(trx['grand_total'])), big: true),
            _row('Bayar (${trx['payment_method']})', rupiah(toDouble(trx['cash_amount']))),
            _row('Kembalian', rupiah(toDouble(trx['change_amount']))),
            const SizedBox(height: 12),
            if (canVoid && !isVoid)
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
