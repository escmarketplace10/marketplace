import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/api.dart';
import '../state/cart.dart';
import '../state/session.dart';

class PosScreen extends StatefulWidget {
  const PosScreen({super.key});
  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  List<dynamic> _categories = [];
  List<dynamic> _products = [];
  String _activeCat = '';
  String _search = '';
  bool _loading = true;
  String? _error;

  late final Cart _cart;

  @override
  void initState() {
    super.initState();
    _cart = Cart();
    _load();
  }

  @override
  void dispose() {
    _cart.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final cats = await Api.categories();
      final prods = await Api.products(params: {'is_active': 1});
      setState(() {
        _categories = cats;
        _products = prods;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  List<dynamic> get _filtered => _products.where((p) {
        if (toInt(p['is_active']) == 0) return false;
        if (_activeCat.isNotEmpty && p['category_id'] != _activeCat) return false;
        if (_search.isNotEmpty && !p['name'].toString().toLowerCase().contains(_search.toLowerCase())) {
          return false;
        }
        return true;
      }).toList();

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Loading(label: 'Memuat produk...');
    if (_error != null) {
      return EmptyState(
        icon: Icons.wifi_off,
        message: _error!,
        action: FilledButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('Coba lagi')),
      );
    }

    return ChangeNotifierProvider.value(
      value: _cart,
      child: LayoutBuilder(
        builder: (context, c) {
          // Dua panel (produk + keranjang) untuk tablet; satu kolom untuk HP.
          final twoPane = c.maxWidth >= 720;
          final cartW = c.maxWidth >= 1040 ? 380.0 : 320.0;
          if (twoPane) {
            return Row(children: [
              Expanded(child: _productPanel()),
              SizedBox(width: cartW, child: _CartPanel(onPaid: _load)),
            ]);
          }
          return Stack(children: [
            _productPanel(),
            Positioned(left: 0, right: 0, bottom: 0, child: _MobileCartBar(onPaid: _load)),
          ]);
        },
      ),
    );
  }

  Widget _productPanel() {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            decoration: const InputDecoration(hintText: 'Cari produk...', prefixIcon: Icon(Icons.search)),
            onChanged: (v) => setState(() => _search = v),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                const _HeldOrdersChip(),
                _catChip('Semua', '', '🗂'),
                ..._categories.map((c) => _catChip(c['name'].toString(), c['id'].toString(), (c['icon'] ?? '📦').toString())),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Expanded(
            child: _filtered.isEmpty
                ? const EmptyState(icon: Icons.inbox, message: 'Tidak ada produk')
                : GridView.builder(
                    padding: const EdgeInsets.only(bottom: 80),
                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 155,
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                      childAspectRatio: 0.74,
                    ),
                    itemCount: _filtered.length,
                    itemBuilder: (_, i) => _ProductCard(product: _filtered[i], onTap: () => _cart.add(_filtered[i])),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _catChip(String label, String id, String icon) {
    final active = _activeCat == id;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text('$icon $label'),
        selected: active,
        onSelected: (_) => setState(() => _activeCat = id),
        labelStyle: TextStyle(fontWeight: FontWeight.w700, color: active ? Colors.white : AppColors.ink),
        selectedColor: AppColors.primary,
        backgroundColor: Colors.white,
        side: BorderSide(color: Colors.black.withValues(alpha: 0.08)),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  final dynamic product;
  final VoidCallback onTap;
  const _ProductCard({required this.product, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final track = toInt(product['is_track_stock']) == 1;
    // Kasir jual dari stok kasir, bukan stok gudang.
    final stock = toDouble(product['cashier_stock']);
    final minStock = toDouble(product['min_stock']);
    final habis = track && stock <= 0;
    final low = track && stock <= minStock;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          if (habis) {
            showSnack(context, 'Stok kasir habis. Minta petugas stok keluarkan dari gudang.', error: true);
          } else {
            onTap();
          }
        },
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: ProductThumb(product: product)),
              Padding(
                padding: const EdgeInsets.fromLTRB(9, 7, 9, 9),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(product['name'].toString(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
                    const SizedBox(height: 2),
                    Text(rupiah(toDouble(product['price'])),
                        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 13)),
                    if (track)
                      Text(habis ? 'Stok kasir habis' : 'Stok kasir ${formatStock(stock, product['unit']?.toString())} ${product['unit'] ?? ''}',
                          style: TextStyle(fontSize: 10.5, color: low ? AppColors.danger : AppColors.muted, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


/// Panel keranjang (layar lebar).
class _CartPanel extends StatelessWidget {
  final VoidCallback onPaid;
  const _CartPanel({required this.onPaid});
  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(children: [Icon(Icons.shopping_cart_outlined), SizedBox(width: 8), Text('Keranjang', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800))]),
          ),
          const Expanded(child: _CartBody()),
          _CartFooter(onPaid: onPaid),
        ],
      ),
    );
  }
}

class _CartBody extends StatelessWidget {
  const _CartBody();
  @override
  Widget build(BuildContext context) {
    final cart = context.watch<Cart>();
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: ['dine_in', 'take_away', 'delivery'].map((t) {
              final active = cart.orderType == t;
              final label = t == 'dine_in' ? 'Dine In' : t == 'take_away' ? 'Take Away' : 'Delivery';
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  child: ChoiceChip(
                    label: SizedBox(width: double.infinity, child: Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12))),
                    selected: active,
                    onSelected: (_) => cart.setOrderType(t),
                    selectedColor: AppColors.primary.withValues(alpha: 0.15),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
          child: TextField(
            decoration: const InputDecoration(hintText: 'No. Meja / Nama / Plat...', prefixIcon: Icon(Icons.edit_note), isDense: true),
            onChanged: cart.setOrderRef,
          ),
        ),
        Expanded(
          child: cart.isEmpty
              ? const EmptyState(icon: Icons.remove_shopping_cart, message: 'Keranjang kosong.\nPilih produk untuk menambah.')
              : ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: cart.items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 6),
                  itemBuilder: (_, i) {
                    final item = cart.items[i];
                    return InkWell(
                      onTap: () => _editCartItem(context, cart, item),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: AppColors.bg, borderRadius: BorderRadius.circular(12)),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                                  if (item.notes != null)
                                    Text('📝 ${item.notes}',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontSize: 11, color: AppColors.muted, fontStyle: FontStyle.italic)),
                                  Text(rupiah(item.totalPrice), style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700)),
                                ],
                              ),
                            ),
                            _QtyBtn(icon: Icons.remove, onTap: () => cart.changeQty(item, -1)),
                            SizedBox(width: 28, child: Text('${item.quantity}', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800))),
                            _QtyBtn(icon: Icons.add, onTap: () => cart.changeQty(item, 1)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _QtyBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _QtyBtn({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.black12)),
          child: Icon(icon, size: 18),
        ),
      );
}

class _CartFooter extends StatelessWidget {
  final VoidCallback onPaid;
  const _CartFooter({required this.onPaid});
  @override
  Widget build(BuildContext context) {
    final cart = context.watch<Cart>();
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, -2))]),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Diskon %', isDense: true),
                  onChanged: (v) => cart.setDiscount(double.tryParse(v) ?? 0),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _pickCustomer(context, cart),
                  icon: const Icon(Icons.person_outline, size: 18),
                  label: Text(cart.customer != null ? cart.customer!['name'].toString() : 'Pelanggan',
                      overflow: TextOverflow.ellipsis),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.bg, borderRadius: BorderRadius.circular(12)),
            child: Column(
              children: [
                _totalRow('Subtotal', rupiah(cart.subtotal)),
                if (cart.discountPercent > 0)
                  _totalRow('Diskon (${cart.discountPercent.toStringAsFixed(0)}%)', '-${rupiah(cart.discountValue)}', color: AppColors.danger),
                const Padding(padding: EdgeInsets.symmetric(vertical: 6), child: Divider(height: 1)),
                _totalRow('Total', rupiah(cart.grandTotal), big: true),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: cart.isEmpty ? null : () => _holdOrder(context, cart),
                icon: const Icon(Icons.pause_circle_outline, size: 18),
                label: const Text('Tahan'),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: AppColors.success),
                  onPressed: cart.isEmpty ? null : () => _pay(context, cart, onPaid),
                  icon: const Icon(Icons.payments),
                  label: Text('BAYAR ${rupiah(cart.grandTotal)}'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _totalRow(String label, String value, {bool big = false, Color? color}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(fontWeight: big ? FontWeight.w800 : FontWeight.w600, fontSize: big ? 17 : 14, color: color)),
            Text(value, style: TextStyle(fontWeight: FontWeight.w800, fontSize: big ? 18 : 14, color: color ?? (big ? AppColors.primary : AppColors.ink))),
          ],
        ),
      );
}

Future<void> _pickCustomer(BuildContext context, Cart cart) async {
  final selected = await showModalBottomSheet<Map<String, dynamic>?>(
    context: context,
    isScrollControlled: true,
    builder: (_) => const _CustomerPicker(),
  );
  if (selected != null) cart.setCustomer(selected.isEmpty ? null : selected);
}

Future<void> _pay(BuildContext context, Cart cart, VoidCallback onPaid) async {
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (_) => ChangeNotifierProvider.value(value: cart, child: _PaymentSheet(onPaid: onPaid)),
  );
}

/// Edit catatan item (mis. "less sugar", "tanpa es") atau hapus item dari keranjang.
Future<void> _editCartItem(BuildContext context, Cart cart, CartItem item) async {
  final ctrl = TextEditingController(text: item.notes ?? '');
  final action = await showDialog<String>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(item.name),
      content: TextField(
        controller: ctrl,
        autofocus: true,
        maxLines: 2,
        decoration: const InputDecoration(
          labelText: 'Catatan pesanan',
          hintText: 'mis. less sugar, tanpa es, extra shot',
        ),
      ),
      actions: [
        TextButton(
          style: TextButton.styleFrom(foregroundColor: AppColors.danger),
          onPressed: () => Navigator.pop(ctx, 'remove'),
          child: const Text('Hapus Item'),
        ),
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
        FilledButton(onPressed: () => Navigator.pop(ctx, 'save'), child: const Text('Simpan')),
      ],
    ),
  );
  if (action == 'remove') {
    cart.remove(item);
  } else if (action == 'save') {
    cart.setItemNote(item, ctrl.text);
  }
}

/// Tahan pesanan (open bill) — simpan keranjang, kosongkan, lanjut layani pembeli lain.
Future<void> _holdOrder(BuildContext context, Cart cart) async {
  final held = AppConfig.heldOrders..add(cart.toHeldJson());
  await AppConfig.setHeldOrders(held);
  cart.clear();
  if (!context.mounted) return;
  showSnack(context, 'Pesanan ditahan. Buka lagi lewat tombol "Ditahan".');
  Navigator.of(context).maybePop(); // tutup sheet keranjang di layar HP
}

/// Daftar pesanan yang ditahan: lanjutkan atau hapus.
Future<void> _showHeldOrders(BuildContext context, Cart cart) async {
  await showModalBottomSheet(
    context: context,
    builder: (_) => StatefulBuilder(
      builder: (ctx, setS) {
        final held = AppConfig.heldOrders;
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Text('Pesanan Ditahan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              ),
              if (held.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('Tidak ada pesanan ditahan.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.muted)),
                ),
              ...held.asMap().entries.map((e) {
                final d = e.value;
                final itemCount = ((d['items'] ?? []) as List).length;
                final savedAt = (d['saved_at'] ?? '').toString();
                final time = savedAt.length >= 16 ? savedAt.substring(11, 16) : '';
                final ref = (d['order_ref'] ?? '').toString();
                final customerName = d['customer'] is Map ? (d['customer']['name'] ?? '').toString() : '';
                final label = ref.isNotEmpty ? ref : (customerName.isNotEmpty ? customerName : 'Pesanan ${e.key + 1}');
                return ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.receipt_long)),
                  title: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text('$itemCount item · ${rupiah(toDouble(d['total']))}${time.isEmpty ? '' : ' · $time'}'),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                    tooltip: 'Hapus',
                    onPressed: () async {
                      final list = AppConfig.heldOrders..removeAt(e.key);
                      await AppConfig.setHeldOrders(list);
                      setS(() {});
                    },
                  ),
                  onTap: () async {
                    if (!cart.isEmpty) {
                      showSnack(ctx, 'Keranjang masih berisi. Tahan atau selesaikan dulu.', error: true);
                      return;
                    }
                    final list = AppConfig.heldOrders..removeAt(e.key);
                    await AppConfig.setHeldOrders(list);
                    cart.restoreHeld(d);
                    if (ctx.mounted) Navigator.pop(ctx);
                  },
                );
              }),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    ),
  );
  // Sentuh cart supaya chip "Ditahan (n)" ikut ter-update setelah sheet ditutup
  cart.setOrderType(cart.orderType);
}

/// Chip pembuka daftar pesanan ditahan — ikut rebuild tiap keranjang berubah.
class _HeldOrdersChip extends StatelessWidget {
  const _HeldOrdersChip();
  @override
  Widget build(BuildContext context) {
    final cart = context.watch<Cart>();
    final count = AppConfig.heldOrders.length;
    if (count == 0) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ActionChip(
        avatar: const Icon(Icons.pause_circle_filled, size: 18, color: AppColors.warning),
        label: Text('Ditahan ($count)', style: const TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.white,
        side: BorderSide(color: Colors.black.withValues(alpha: 0.08)),
        onPressed: () => _showHeldOrders(context, cart),
      ),
    );
  }
}

class _PaymentSheet extends StatefulWidget {
  final VoidCallback onPaid;
  const _PaymentSheet({required this.onPaid});
  @override
  State<_PaymentSheet> createState() => _PaymentSheetState();
}

class _PaymentSheetState extends State<_PaymentSheet> {
  String _method = 'cash';
  final _cashCtrl = TextEditingController();
  bool _processing = false;
  bool _keepChange = false; // pelanggan tidak ambil kembalian (uang lebih masuk kas)

  @override
  void dispose() {
    _cashCtrl.dispose();
    super.dispose();
  }

  Future<void> _process(Cart cart) async {
    final session = context.read<Session>();
    setState(() => _processing = true);
    try {
      final cash = double.tryParse(_cashCtrl.text) ?? cart.grandTotal;
      final res = await Api.createTransaction({
        'employee_id': session.employeeId,
        'customer_id': cart.customer?['id'],
        'order_type': cart.orderType,
        'order_reference': cart.orderRef.isEmpty ? null : cart.orderRef,
        'items': cart.items.map((e) => e.toItemJson()).toList(),
        'payment_method': _method,
        'cash_amount': cash,
        'discount_total': cart.discountValue,
        'keep_change': _method == 'cash' && _keepChange && cash > cart.grandTotal,
      });
      final trx = Map<String, dynamic>.from(res['transaction']);
      cart.clear();
      if (!mounted) return;
      Navigator.pop(context);
      widget.onPaid();
      _showSuccess(context, trx);
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  void _addCash(double v) {
    final cur = double.tryParse(_cashCtrl.text) ?? 0;
    setState(() => _cashCtrl.text = (cur + v).toStringAsFixed(0));
  }

  Future<void> _editDenoms() async {
    final ctrl = TextEditingController(text: AppConfig.cashDenoms.join(', '));
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Atur Pecahan Cepat'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Pisahkan dengan koma. Contoh: 2000, 5000, 10000, 50000',
              style: TextStyle(fontSize: 12, color: AppColors.muted)),
          const SizedBox(height: 8),
          TextField(controller: ctrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Nilai pecahan')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Simpan')),
        ],
      ),
    );
    if (ok == true) {
      final denoms = ctrl.text.split(',').map((e) => int.tryParse(e.trim()) ?? 0).where((e) => e > 0).toList();
      await AppConfig.setCashDenoms(denoms);
      if (mounted) setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<Cart>();
    final cash = double.tryParse(_cashCtrl.text) ?? 0;
    final change = cash - cart.grandTotal;
    final methods = {'cash': 'Tunai', 'qris': 'QRIS', 'card': 'Kartu', 'ewallet': 'E-Wallet'};
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Center(child: Text('Pembayaran', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800))),
            const SizedBox(height: 8),
            Center(child: Text(rupiah(cart.grandTotal), style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: AppColors.primary))),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: methods.entries.map((m) {
                final active = _method == m.key;
                return ChoiceChip(
                  label: Text(m.value),
                  selected: active,
                  onSelected: (_) => setState(() => _method = m.key),
                  selectedColor: AppColors.primary.withValues(alpha: 0.15),
                );
              }).toList(),
            ),
            if (_method == 'cash') ...[
              const SizedBox(height: 16),
              Row(children: [
                const Expanded(child: Text('Uang diterima', style: TextStyle(fontWeight: FontWeight.w700))),
                TextButton.icon(
                  onPressed: _editDenoms,
                  icon: const Icon(Icons.tune, size: 16),
                  label: const Text('Atur pecahan'),
                  style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                ),
              ]),
              const SizedBox(height: 4),
              TextField(
                controller: _cashCtrl,
                keyboardType: TextInputType.number,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                decoration: InputDecoration(
                  prefixText: 'Rp ',
                  hintText: '0',
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.backspace_outlined),
                    tooltip: 'Kosongkan',
                    onPressed: () => setState(() => _cashCtrl.clear()),
                  ),
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ActionChip(
                    avatar: const Icon(Icons.check, size: 16, color: AppColors.success),
                    label: const Text('Uang pas'),
                    onPressed: () => setState(() => _cashCtrl.text = cart.grandTotal.toStringAsFixed(0)),
                  ),
                  ...AppConfig.cashDenoms.map((amt) => ActionChip(
                        label: Text('+ ${compactRupiah(amt)}'),
                        onPressed: () => _addCash(amt.toDouble()),
                      )),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: (cash <= 0
                          ? AppColors.muted
                          : change < 0
                              ? AppColors.danger
                              : AppColors.success)
                      .withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Text(
                      cash <= 0
                          ? 'Kembalian'
                          : change < 0
                              ? 'Uang kurang'
                              : (_keepChange ? 'Uang lebih (masuk kas)' : 'Kembalian'),
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: change < 0 && cash > 0 ? AppColors.danger : AppColors.muted,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      rupiah(change.abs()),
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        color: cash <= 0
                            ? AppColors.ink
                            : change < 0
                                ? AppColors.danger
                                : AppColors.success,
                      ),
                    ),
                  ],
                ),
              ),
              if (change > 0)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    value: _keepChange,
                    onChanged: (v) => setState(() => _keepChange = v),
                    title: const Text('Pelanggan tidak ambil kembalian',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                    subtitle: const Text('Uang lebih dicatat sebagai pemasukan (bukan kembalian)',
                        style: TextStyle(fontSize: 11.5, color: AppColors.muted)),
                  ),
                ),
            ],
            const SizedBox(height: 20),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppColors.success),
              onPressed: _processing ? null : () => _process(cart),
              child: _processing
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Konfirmasi Bayar'),
            ),
          ],
        ),
      ),
    );
  }
}

void _showSuccess(BuildContext context, Map<String, dynamic> trx) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.check_circle, color: AppColors.success, size: 64),
          const SizedBox(height: 12),
          const Text('Pembayaran Berhasil', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(trx['receipt_number'].toString(), style: const TextStyle(color: AppColors.muted)),
          const SizedBox(height: 8),
          Text(rupiah(toDouble(trx['grand_total'])), style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: AppColors.primary)),
          if (toDouble(trx['change_amount']) > 0)
            Text('Kembalian: ${rupiah(toDouble(trx['change_amount']))}', style: const TextStyle(fontWeight: FontWeight.w600)),
          if (toDouble(trx['overpay_amount']) > 0)
            Text('Uang lebih (masuk kas): ${rupiah(toDouble(trx['overpay_amount']))}', style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
      actions: [FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('Selesai'))],
    ),
  );
}

/// Mobile: bar keranjang ringkas yang membuka sheet penuh.
class _MobileCartBar extends StatelessWidget {
  final VoidCallback onPaid;
  const _MobileCartBar({required this.onPaid});
  @override
  Widget build(BuildContext context) {
    final cart = context.watch<Cart>();
    return Material(
      elevation: 12,
      color: AppColors.primary,
      child: InkWell(
        onTap: cart.isEmpty
            ? null
            : () => showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  backgroundColor: Colors.white,
                  builder: (_) => ChangeNotifierProvider.value(
                    value: cart,
                    child: SizedBox(height: MediaQuery.of(context).size.height * 0.85, child: Column(children: [const Expanded(child: _CartBody()), _CartFooter(onPaid: onPaid)])),
                  ),
                ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              const Icon(Icons.shopping_cart, color: Colors.white),
              const SizedBox(width: 8),
              Text('${cart.count} item', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
              const Spacer(),
              Text(rupiah(cart.grandTotal), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
              const SizedBox(width: 8),
              const Icon(Icons.keyboard_arrow_up, color: Colors.white),
            ],
          ),
        ),
      ),
    );
  }
}

class _CustomerPicker extends StatefulWidget {
  const _CustomerPicker();
  @override
  State<_CustomerPicker> createState() => _CustomerPickerState();
}

class _CustomerPickerState extends State<_CustomerPicker> {
  List<dynamic> _results = [];
  String _query = '';
  bool _loading = false;

  Future<void> _search(String q) async {
    setState(() {
      _query = q;
      _loading = true;
    });
    try {
      final res = q.isEmpty ? await Api.customers() : await Api.customers(search: q);
      if (mounted) setState(() => _results = res);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _addNew() async {
    final nameCtrl = TextEditingController(text: _query);
    final phoneCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Pelanggan Baru'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Nama')),
          const SizedBox(height: 8),
          TextField(controller: phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'No. Telepon')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Simpan')),
        ],
      ),
    );
    if (ok == true && nameCtrl.text.isNotEmpty) {
      final res = await Api.createCustomer({'name': nameCtrl.text, 'phone': phoneCtrl.text});
      final id = res is Map ? (res['id'] ?? res['id']) : null;
      if (mounted) Navigator.pop(context, {'id': id, 'name': nameCtrl.text, 'phone': phoneCtrl.text});
    }
  }

  @override
  void initState() {
    super.initState();
    _search('');
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.7,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Row(children: [
                const Text('Pilih Pelanggan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                const Spacer(),
                TextButton.icon(onPressed: () => Navigator.pop(context, <String, dynamic>{}), icon: const Icon(Icons.clear), label: const Text('Tanpa pelanggan')),
              ]),
              TextField(
                decoration: const InputDecoration(hintText: 'Cari nama / telepon', prefixIcon: Icon(Icons.search)),
                onChanged: _search,
              ),
              const SizedBox(height: 8),
              Expanded(
                child: _loading
                    ? const Loading()
                    : ListView(
                        children: [
                          ..._results.map((c) => ListTile(
                                leading: const CircleAvatar(child: Icon(Icons.person)),
                                title: Text(c['name'].toString()),
                                subtitle: Text('${c['phone'] ?? '-'} · ${toInt(c['points'])} poin'),
                                onTap: () => Navigator.pop(context, Map<String, dynamic>.from(c)),
                              )),
                          ListTile(
                            leading: const Icon(Icons.person_add, color: AppColors.primary),
                            title: const Text('Tambah pelanggan baru'),
                            onTap: _addNew,
                          ),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
