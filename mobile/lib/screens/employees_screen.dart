import 'package:flutter/material.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/api.dart';

class EmployeesScreen extends StatefulWidget {
  const EmployeesScreen({super.key});
  @override
  State<EmployeesScreen> createState() => _EmployeesScreenState();
}

class _EmployeesScreenState extends State<EmployeesScreen> {
  List<dynamic> _employees = [];
  bool _loading = true;

  static const _roles = ['cashier', 'stocking'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await Api.employees();
      if (mounted) setState(() => _employees = res);
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _edit([dynamic existing]) async {
    final nameCtrl = TextEditingController(text: existing?['name']?.toString() ?? '');
    final pinCtrl = TextEditingController();
    final phoneCtrl = TextEditingController(text: existing?['phone']?.toString() ?? '');
    final commCtrl = TextEditingController(text: (existing?['commission_rate'] ?? 0).toString());
    String role = existing?['role']?.toString() ?? 'cashier';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => AlertDialog(
          title: Text(existing == null ? 'Karyawan Baru' : 'Edit Karyawan'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Nama')),
              const SizedBox(height: 8),
              TextField(controller: pinCtrl, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: existing == null ? 'PIN (4-6 digit)' : 'PIN baru (kosongkan jika tetap)')),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: role,
                decoration: const InputDecoration(labelText: 'Peran'),
                items: _roles.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                onChanged: (v) => setS(() => role = v ?? 'cashier'),
              ),
              const SizedBox(height: 8),
              TextField(controller: phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Telepon')),
              const SizedBox(height: 8),
              TextField(controller: commCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Komisi (%)')),
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Simpan')),
          ],
        ),
      ),
    );
    if (ok == true && nameCtrl.text.isNotEmpty) {
      try {
        final data = <String, dynamic>{
          'name': nameCtrl.text,
          'role': role,
          'phone': phoneCtrl.text,
          'commission_rate': double.tryParse(commCtrl.text) ?? 0,
        };
        if (pinCtrl.text.isNotEmpty) data['pin'] = pinCtrl.text;
        if (existing == null) {
          if (pinCtrl.text.isEmpty) {
            if (mounted) showSnack(context, 'PIN wajib untuk karyawan baru', error: true);
            return;
          }
          await Api.createEmployee(data);
        } else {
          await Api.updateEmployee(existing['id'].toString(), data);
        }
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
      floatingActionButton: FloatingActionButton.extended(onPressed: () => _edit(), icon: const Icon(Icons.person_add), label: const Text('Tambah')),
      body: _loading
          ? const Loading()
          : _employees.isEmpty
              ? const EmptyState(icon: Icons.badge, message: 'Belum ada karyawan')
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: _employees.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 6),
                    itemBuilder: (_, i) {
                      final e = _employees[i];
                      return Card(
                        child: ListTile(
                          leading: const CircleAvatar(child: Icon(Icons.person)),
                          title: Text(e['name'].toString(), style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text('${e['role']} · komisi ${toDouble(e['commission_rate']).toStringAsFixed(0)}%'),
                          trailing: IconButton(icon: const Icon(Icons.edit), onPressed: () => _edit(e)),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
