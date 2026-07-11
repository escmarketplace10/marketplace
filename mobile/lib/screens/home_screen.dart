import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../state/session.dart';
import 'pos_screen.dart';
import 'menu_screen.dart';
import 'inventory_screen.dart';
import 'cashier_opname_screen.dart';
import 'transactions_screen.dart';
import 'customers_screen.dart';
import 'dashboard_screen.dart';
import 'reports_screen.dart';
import 'employees_screen.dart';
import 'suppliers_screen.dart';
import 'consignors_screen.dart';
import 'purchase_orders_screen.dart';
import 'expenses_screen.dart';

class _NavItem {
  final String area;
  final String label;
  final IconData icon;
  final Widget Function() build;
  const _NavItem(this.area, this.label, this.icon, this.build);
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _index = 0;

  final List<_NavItem> _all = [
    _NavItem('pos', 'Kasir', Icons.point_of_sale, () => const PosScreen()),
    _NavItem('dashboard', 'Dashboard', Icons.dashboard_rounded, () => const DashboardScreen()),
    _NavItem('menu', 'Menu', Icons.restaurant_menu, () => const MenuScreen()),
    _NavItem('inventory', 'Stok', Icons.inventory_2_rounded, () => const InventoryScreen()),
    _NavItem('transactions', 'Transaksi', Icons.receipt_long, () => const TransactionsScreen()),
    _NavItem('stock_check', 'Cek Stok', Icons.fact_check_rounded, () => const CashierOpnameScreen()),
    _NavItem('customers', 'Pelanggan', Icons.groups_rounded, () => const CustomersScreen()),
    _NavItem('reports', 'Laporan', Icons.analytics_rounded, () => const ReportsScreen()),
    _NavItem('employees', 'Karyawan', Icons.badge_rounded, () => const EmployeesScreen()),
    _NavItem('suppliers', 'Supplier', Icons.local_shipping_rounded, () => const SuppliersScreen()),
    _NavItem('consignors', 'Penitip', Icons.handshake_rounded, () => const ConsignorsScreen()),
    _NavItem('purchase_orders', 'Pembelian', Icons.shopping_cart_checkout, () => const PurchaseOrdersScreen()),
    _NavItem('expenses', 'Biaya', Icons.payments_rounded, () => const ExpensesScreen()),
  ];

  late List<_NavItem> _items;

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    _items = _all.where((i) => session.can(i.area)).toList();
    if (_index >= _items.length) _index = 0;

    final isWide = MediaQuery.of(context).size.width >= 600;
    final current = _items[_index];

    return Scaffold(
      drawer: isWide ? null : _MobileDrawer(items: _items, index: _index, onSelect: (i) => setState(() => _index = i)),
      body: SafeArea(
        child: Row(
          children: [
            if (isWide) _Sidebar(items: _items, index: _index, onSelect: (i) => setState(() => _index = i)),
            Expanded(
              child: Column(
                children: [
                  _Header(title: current.label, showMenuButton: !isWide),
                  Expanded(child: Container(color: AppColors.bg, child: current.build())),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: isWide
          ? null
          : NavigationBar(
              selectedIndex: _index < 5 ? _index : 0,
              onDestinationSelected: (i) => setState(() => _index = i),
              destinations: _items
                  .take(5)
                  .map((i) => NavigationDestination(icon: Icon(i.icon), label: i.label))
                  .toList(),
            ),
    );
  }
}

class _Sidebar extends StatelessWidget {
  final List<_NavItem> items;
  final int index;
  final ValueChanged<int> onSelect;
  const _Sidebar({required this.items, required this.index, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 84,
      color: AppColors.sidebar,
      child: Column(
        children: [
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.asset('assets/logo.png', width: 44, height: 44),
          ),
          const SizedBox(height: 4),
          const Text('Kantinku', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 4),
              itemCount: items.length,
              itemBuilder: (_, i) {
                final active = i == index;
                return InkWell(
                  onTap: () => onSelect(i),
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    decoration: BoxDecoration(
                      color: active ? AppColors.primary : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        Icon(items[i].icon, size: 22, color: active ? Colors.white : AppColors.sidebarMuted),
                        const SizedBox(height: 4),
                        Text(items[i].label,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                fontSize: 10,
                                height: 1.1,
                                fontWeight: FontWeight.w600,
                                color: active ? Colors.white : AppColors.sidebarMuted)),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String title;
  final bool showMenuButton;
  const _Header({required this.title, required this.showMenuButton});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.line)),
      ),
      child: Row(
        children: [
          if (showMenuButton)
            IconButton(
              icon: const Icon(Icons.menu),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
          Text(title, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: AppColors.ink)),
          const SizedBox(width: 12),
          const Spacer(),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(session.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.ink)),
              Text(session.role, style: const TextStyle(color: AppColors.muted, fontSize: 11)),
            ],
          ),
          const SizedBox(width: 8),
          PopupMenuButton<String>(
            icon: const CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.primary,
              child: Icon(Icons.person, color: Colors.white, size: 20),
            ),
            onSelected: (v) {
              if (v == 'logout') session.logout();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'logout', child: Row(children: [Icon(Icons.logout, size: 18), SizedBox(width: 8), Text('Keluar')])),
            ],
          ),
        ],
      ),
    );
  }
}

class _MobileDrawer extends StatelessWidget {
  final List<_NavItem> items;
  final int index;
  final ValueChanged<int> onSelect;
  const _MobileDrawer({required this.items, required this.index, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: Container(
        color: AppColors.sidebar,
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(children: [
                  ClipRRect(borderRadius: BorderRadius.circular(10), child: Image.asset('assets/logo.png', width: 40, height: 40)),
                  const SizedBox(width: 10),
                  const Text('Kantinku', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                ]),
              ),
              Expanded(
                child: ListView.builder(
                  itemCount: items.length,
                  itemBuilder: (_, i) {
                    final active = i == index;
                    return ListTile(
                      leading: Icon(items[i].icon, color: active ? AppColors.primary : AppColors.sidebarMuted),
                      title: Text(items[i].label, style: TextStyle(color: active ? Colors.white : AppColors.sidebarMuted, fontWeight: FontWeight.w600)),
                      selected: active,
                      onTap: () {
                        onSelect(i);
                        Navigator.pop(context);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
