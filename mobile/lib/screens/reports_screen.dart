import 'package:flutter/material.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/api.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});
  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  Map<String, dynamic>? _pl;
  List<dynamic> _payments = [];
  List<dynamic> _peak = [];
  Map<String, dynamic>? _abc;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final pl = await Api.profitLoss();
      final payments = await Api.paymentMethods();
      final peak = await Api.peakHours();
      final abc = await Api.abcAnalysis();
      if (mounted) {
        setState(() {
          _pl = pl;
          _payments = payments;
          _peak = peak;
          _abc = abc;
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
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          const SectionTitle('Laba Rugi (30 hari)'),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _plRow('Pendapatan', toDouble(_pl?['revenue']), AppColors.success),
                  _plRow('HPP (Modal)', -toDouble(_pl?['hpp']), AppColors.muted),
                  const Divider(),
                  _plRow('Laba Kotor', toDouble(_pl?['gross_profit']), AppColors.ink, bold: true),
                  _plRow('Biaya Operasional', -toDouble(_pl?['expenses']), AppColors.danger),
                  const Divider(),
                  _plRow('Laba Bersih', toDouble(_pl?['net_profit']), AppColors.primary, bold: true, big: true),
                  const SizedBox(height: 4),
                  Align(
                    alignment: Alignment.centerRight,
                    child: Text('Margin: ${toDouble(_pl?['margin']).toStringAsFixed(1)}%', style: const TextStyle(color: AppColors.muted, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const SectionTitle('Metode Pembayaran (hari ini)'),
          Card(
            child: _payments.isEmpty
                ? const Padding(padding: EdgeInsets.all(20), child: EmptyState(icon: Icons.pie_chart, message: 'Belum ada data'))
                : Column(
                    children: _payments.map((p) {
                      return ListTile(
                        dense: true,
                        leading: const Icon(Icons.payment, color: AppColors.primary),
                        title: Text((p['payment_method'] ?? '-').toString().toUpperCase()),
                        subtitle: Text('${toInt(p['count'])} transaksi'),
                        trailing: Text(rupiah(toDouble(p['total'])), style: const TextStyle(fontWeight: FontWeight.w700)),
                      );
                    }).toList(),
                  ),
          ),
          const SizedBox(height: 16),
          const SectionTitle('Analisis ABC Produk'),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _abcBadge('A', toInt((_abc?['summary'] ?? {})['A']), AppColors.success),
                  _abcBadge('B', toInt((_abc?['summary'] ?? {})['B']), AppColors.warning),
                  _abcBadge('C', toInt((_abc?['summary'] ?? {})['C']), AppColors.muted),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const SectionTitle('Jam Sibuk (7 hari)'),
          Card(child: Padding(padding: const EdgeInsets.all(16), child: _PeakChart(data: _peak))),
        ],
      ),
    );
  }

  Widget _plRow(String label, double value, Color color, {bool bold = false, bool big = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(label, style: TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w500, fontSize: big ? 16 : 14)),
          Text(rupiah(value), style: TextStyle(fontWeight: FontWeight.w800, fontSize: big ? 18 : 14, color: color)),
        ]),
      );

  Widget _abcBadge(String letter, int count, Color color) => Column(
        children: [
          CircleAvatar(radius: 24, backgroundColor: color.withValues(alpha: 0.15), child: Text(letter, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: color))),
          const SizedBox(height: 6),
          Text('$count produk', style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      );
}

class _PeakChart extends StatelessWidget {
  final List<dynamic> data;
  const _PeakChart({required this.data});
  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const SizedBox(height: 100, child: EmptyState(icon: Icons.access_time, message: 'Belum ada data'));
    final maxCount = data.map((d) => toInt(d['count'])).fold<int>(0, (a, b) => a > b ? a : b);
    return SizedBox(
      height: 140,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: data.map((d) {
          final c = toInt(d['count']);
          final h = maxCount > 0 ? (c / maxCount) * 100 : 0.0;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Container(height: h + 2, decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(3))),
                  const SizedBox(height: 4),
                  Text('${toInt(d['hour'])}', style: const TextStyle(fontSize: 10, color: AppColors.muted)),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
