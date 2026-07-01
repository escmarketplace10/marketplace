import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/api.dart';
import '../state/session.dart';

class ExpensesScreen extends StatefulWidget {
  const ExpensesScreen({super.key});
  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> {
  List<dynamic> _expenses = [];
  bool _loading = true;

  static const _categories = ['Listrik', 'Air', 'Sewa', 'Gaji', 'Bahan', 'Transportasi', 'Lainnya'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await Api.expenses();
      if (mounted) setState(() => _expenses = res);
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  double get _total => _expenses.fold(0, (s, e) => s + toDouble(e['amount']));

  Future<void> _add() async {
    final employeeId = context.read<Session>().employeeId;
    final descCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    String category = _categories.first;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => AlertDialog(
          title: const Text('Catat Biaya'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            DropdownButtonFormField<String>(
              initialValue: category,
              decoration: const InputDecoration(labelText: 'Kategori'),
              items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) => setS(() => category = v ?? _categories.first),
            ),
            const SizedBox(height: 8),
            TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Keterangan')),
            const SizedBox(height: 8),
            TextField(controller: amountCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Jumlah')),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Simpan')),
          ],
        ),
      ),
    );
    if (ok == true && amountCtrl.text.isNotEmpty) {
      try {
        await Api.createExpense({
          'category': category,
          'description': descCtrl.text,
          'amount': double.tryParse(amountCtrl.text) ?? 0,
          'created_by': employeeId,
        });
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
      floatingActionButton: FloatingActionButton.extended(onPressed: _add, icon: const Icon(Icons.add), label: const Text('Catat Biaya')),
      body: _loading
          ? const Loading()
          : Column(
              children: [
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.all(12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AppColors.danger.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(14)),
                  child: Column(children: [
                    const Text('Total Biaya', style: TextStyle(color: AppColors.muted, fontWeight: FontWeight.w600)),
                    Text(rupiah(_total), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.danger)),
                  ]),
                ),
                Expanded(
                  child: _expenses.isEmpty
                      ? const EmptyState(icon: Icons.payments, message: 'Belum ada biaya')
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            itemCount: _expenses.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 6),
                            itemBuilder: (_, i) {
                              final e = _expenses[i];
                              return Card(
                                child: ListTile(
                                  leading: const CircleAvatar(child: Icon(Icons.receipt)),
                                  title: Text(e['category'].toString(), style: const TextStyle(fontWeight: FontWeight.w700)),
                                  subtitle: Text('${e['description'] ?? '-'}\n${formatDateTime(e['created_at'])}'),
                                  isThreeLine: true,
                                  trailing: Text(rupiah(toDouble(e['amount'])), style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.danger)),
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
