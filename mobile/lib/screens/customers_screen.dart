import 'package:flutter/material.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/api.dart';

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});
  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  List<dynamic> _customers = [];
  String _search = '';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = _search.isEmpty ? await Api.customers() : await Api.customers(search: _search);
      if (mounted) setState(() => _customers = res);
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _edit([dynamic existing]) async {
    final nameCtrl = TextEditingController(text: existing?['name']?.toString() ?? '');
    final phoneCtrl = TextEditingController(text: existing?['phone']?.toString() ?? '');
    final emailCtrl = TextEditingController(text: existing?['email']?.toString() ?? '');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(existing == null ? 'Pelanggan Baru' : 'Edit Pelanggan'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Nama')),
          const SizedBox(height: 8),
          TextField(controller: phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Telepon')),
          const SizedBox(height: 8),
          TextField(controller: emailCtrl, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Simpan')),
        ],
      ),
    );
    if (ok == true && nameCtrl.text.isNotEmpty) {
      try {
        final data = {'name': nameCtrl.text, 'phone': phoneCtrl.text, 'email': emailCtrl.text};
        if (existing == null) {
          await Api.createCustomer(data);
        } else {
          await Api.updateCustomer(existing['id'].toString(), data);
        }
        _load();
      } catch (e) {
        if (mounted) showSnack(context, e.toString(), error: true);
      }
    }
  }

  Future<void> _deposit(dynamic c) async {
    final ctrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Tambah Deposit — ${c['name']}'),
        content: TextField(controller: ctrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Jumlah deposit')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Tambah')),
        ],
      ),
    );
    if (ok == true) {
      try {
        await Api.addDeposit(c['id'].toString(), double.tryParse(ctrl.text) ?? 0);
        _load();
      } catch (e) {
        if (mounted) showSnack(context, e.toString(), error: true);
      }
    }
  }

  Color _tierColor(String tier) {
    switch (tier.toLowerCase()) {
      case 'gold':
        return AppColors.warning;
      case 'platinum':
        return AppColors.primary;
      default:
        return AppColors.muted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      floatingActionButton: FloatingActionButton.extended(onPressed: () => _edit(), icon: const Icon(Icons.person_add), label: const Text('Tambah')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              decoration: const InputDecoration(hintText: 'Cari nama / telepon...', prefixIcon: Icon(Icons.search), isDense: true),
              onChanged: (v) {
                _search = v;
                _load();
              },
            ),
          ),
          Expanded(
            child: _loading
                ? const Loading()
                : _customers.isEmpty
                    ? const EmptyState(icon: Icons.groups, message: 'Belum ada pelanggan')
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          itemCount: _customers.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 6),
                          itemBuilder: (_, i) {
                            final c = _customers[i];
                            final tier = (c['membership_tier'] ?? 'Silver').toString();
                            return Card(
                              child: ListTile(
                                leading: CircleAvatar(backgroundColor: _tierColor(tier).withValues(alpha: 0.15), child: Icon(Icons.person, color: _tierColor(tier))),
                                title: Text(c['name'].toString(), style: const TextStyle(fontWeight: FontWeight.w700)),
                                subtitle: Text('${c['phone'] ?? '-'} · ${toInt(c['points'])} poin · Deposit ${rupiah(toDouble(c['deposit_balance']))}'),
                                trailing: PopupMenuButton<String>(
                                  onSelected: (v) {
                                    if (v == 'edit') _edit(c);
                                    if (v == 'deposit') _deposit(c);
                                  },
                                  itemBuilder: (_) => const [
                                    PopupMenuItem(value: 'edit', child: Text('Edit')),
                                    PopupMenuItem(value: 'deposit', child: Text('Tambah Deposit')),
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
}
