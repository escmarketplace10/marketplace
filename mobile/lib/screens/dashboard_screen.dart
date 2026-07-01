import 'package:flutter/material.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/api.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _summary;
  List<dynamic> _chart = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final summary = await Api.dashboardSummary();
      final chart = await Api.salesChart(period: 'week');
      if (mounted) {
        setState(() {
          _summary = summary;
          _chart = chart;
        });
      }
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Loading();
    final sales = (_summary?['sales'] ?? {}) as Map;
    final alerts = (_summary?['alerts'] ?? {}) as Map;
    final counts = (_summary?['counts'] ?? {}) as Map;
    final topProducts = (_summary?['topProducts'] ?? []) as List;
    final width = MediaQuery.of(context).size.width;
    final cols = width >= 900 ? 4 : 2;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          const SectionTitle('Ringkasan Hari Ini'),
          GridView.count(
            crossAxisCount: cols,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.25,
            children: [
              StatCard(label: 'Omzet', value: rupiah(toDouble(sales['total_sales'])), icon: Icons.payments, color: AppColors.success),
              StatCard(label: 'Transaksi', value: '${toInt(sales['transaction_count'])}', icon: Icons.receipt_long, color: AppColors.primary),
              StatCard(label: 'Rata-rata/struk', value: rupiah(toDouble(sales['avg_basket'])), icon: Icons.shopping_basket, color: AppColors.accent),
              StatCard(label: 'Stok menipis', value: '${toInt(alerts['low_stock'])}', icon: Icons.warning_amber, color: AppColors.danger),
            ],
          ),
          const SizedBox(height: 16),
          const SectionTitle('Penjualan 7 Hari'),
          Card(child: Padding(padding: const EdgeInsets.all(16), child: _MiniBarChart(data: _chart))),
          const SizedBox(height: 16),
          const SectionTitle('Produk Terlaris Hari Ini'),
          Card(
            child: topProducts.isEmpty
                ? const Padding(padding: EdgeInsets.all(24), child: EmptyState(icon: Icons.bar_chart, message: 'Belum ada penjualan'))
                : Column(
                    children: topProducts.take(8).map((p) {
                      return ListTile(
                        dense: true,
                        leading: CircleAvatar(radius: 14, backgroundColor: AppColors.primary.withValues(alpha: 0.12), child: Text('${toInt(p['qty'])}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.primary))),
                        title: Text(p['product_name'].toString()),
                        trailing: Text(rupiah(toDouble(p['total'])), style: const TextStyle(fontWeight: FontWeight.w700)),
                      );
                    }).toList(),
                  ),
          ),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: StatCard(label: 'Karyawan', value: '${toInt(counts['employees'])}', icon: Icons.badge, color: AppColors.primary)),
            const SizedBox(width: 10),
            Expanded(child: StatCard(label: 'Pelanggan', value: '${toInt(counts['customers'])}', icon: Icons.groups, color: AppColors.accent)),
          ]),
        ],
      ),
    );
  }
}

class _MiniBarChart extends StatelessWidget {
  final List<dynamic> data;
  const _MiniBarChart({required this.data});
  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const SizedBox(height: 120, child: EmptyState(icon: Icons.show_chart, message: 'Belum ada data'));
    final maxVal = data.map((d) => toDouble(d['total'])).fold<double>(0, (a, b) => a > b ? a : b);
    return SizedBox(
      height: 160,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: data.map((d) {
          final v = toDouble(d['total']);
          final h = maxVal > 0 ? (v / maxVal) * 120 : 0.0;
          final date = d['date'].toString();
          final label = date.length >= 10 ? date.substring(8, 10) : date;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(compactNumber(v), style: const TextStyle(fontSize: 9, color: AppColors.muted)),
                  const SizedBox(height: 2),
                  Container(height: h + 4, decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(4))),
                  const SizedBox(height: 4),
                  Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
