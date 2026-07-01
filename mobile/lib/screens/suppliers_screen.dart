import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/api.dart';

class SuppliersScreen extends StatefulWidget {
  const SuppliersScreen({super.key});
  @override
  State<SuppliersScreen> createState() => _SuppliersScreenState();
}

class _SuppliersScreenState extends State<SuppliersScreen> {
  List<dynamic> _suppliers = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await Api.suppliers();
      if (mounted) setState(() => _suppliers = res);
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _edit([dynamic existing]) async {
    final nameCtrl = TextEditingController(text: existing?['name']?.toString() ?? '');
    final contactCtrl = TextEditingController(text: existing?['contact_person']?.toString() ?? '');
    final phoneCtrl = TextEditingController(text: existing?['phone']?.toString() ?? '');
    final addrCtrl = TextEditingController(text: existing?['address']?.toString() ?? '');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(existing == null ? 'Supplier Baru' : 'Edit Supplier'),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Nama')),
            const SizedBox(height: 8),
            TextField(controller: contactCtrl, decoration: const InputDecoration(labelText: 'Kontak person')),
            const SizedBox(height: 8),
            TextField(controller: phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Telepon')),
            const SizedBox(height: 8),
            TextField(controller: addrCtrl, decoration: const InputDecoration(labelText: 'Alamat')),
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
        final data = {'name': nameCtrl.text, 'contact_person': contactCtrl.text, 'phone': phoneCtrl.text, 'address': addrCtrl.text};
        if (existing == null) {
          await Api.createSupplier(data);
        } else {
          await Api.updateSupplier(existing['id'].toString(), data);
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
      floatingActionButton: FloatingActionButton.extended(onPressed: () => _edit(), icon: const Icon(Icons.add), label: const Text('Tambah')),
      body: _loading
          ? const Loading()
          : _suppliers.isEmpty
              ? const EmptyState(icon: Icons.local_shipping, message: 'Belum ada supplier')
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: _suppliers.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 6),
                    itemBuilder: (_, i) {
                      final s = _suppliers[i];
                      return Card(
                        child: ListTile(
                          leading: const CircleAvatar(child: Icon(Icons.store)),
                          title: Text(s['name'].toString(), style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text('${s['contact_person'] ?? '-'} · ${s['phone'] ?? '-'}'),
                          trailing: IconButton(icon: const Icon(Icons.edit), onPressed: () => _edit(s)),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
