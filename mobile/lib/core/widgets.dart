import 'package:flutter/material.dart';
import '../config/app_config.dart';
import 'theme.dart';

/// Thumbnail menu: foto bila ada, jika tidak pakai ikon berwarna placeholder.
class ProductThumb extends StatelessWidget {
  final dynamic product;
  final double iconSize;
  const ProductThumb({super.key, required this.product, this.iconSize = 26});
  @override
  Widget build(BuildContext context) {
    final img = AppConfig.imageUrl(product['image']?.toString());
    final (bg, fg) = menuColors((product['category_name'] ?? product['name'] ?? '').toString());
    if (img.isNotEmpty) {
      return Image.network(
        img,
        width: double.infinity,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => _placeholder(bg, fg),
      );
    }
    return _placeholder(bg, fg);
  }

  Widget _placeholder(Color bg, Color fg) => Container(
        width: double.infinity,
        color: bg,
        alignment: Alignment.center,
        child: Icon(Icons.restaurant, color: fg, size: iconSize),
      );
}

/// Tampilan loading sederhana di tengah.
class Loading extends StatelessWidget {
  final String? label;
  const Loading({super.key, this.label});
  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            if (label != null) ...[
              const SizedBox(height: 12),
              Text(label!, style: const TextStyle(color: AppColors.muted)),
            ],
          ],
        ),
      );
}

/// Tampilan keadaan kosong / error dengan ikon.
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  final Widget? action;
  const EmptyState({super.key, required this.icon, required this.message, this.action});
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 56, color: AppColors.muted.withValues(alpha: 0.5)),
              const SizedBox(height: 12),
              Text(message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.muted, fontSize: 15, fontWeight: FontWeight.w600)),
              if (action != null) ...[const SizedBox(height: 16), action!],
            ],
          ),
        ),
      );
}

/// Kartu statistik untuk dashboard.
class StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const StatCard({super.key, required this.label, required this.value, required this.icon, this.color = AppColors.primary});
  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(height: 12),
              Text(value,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.ink)),
              const SizedBox(height: 2),
              Text(label, style: const TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      );
}

/// Menampilkan pesan SnackBar.
void showSnack(BuildContext context, String message, {bool error = false}) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
    content: Text(message),
    backgroundColor: error ? AppColors.danger : AppColors.ink,
  ));
}

/// Judul bagian.
class SectionTitle extends StatelessWidget {
  final String text;
  final Widget? trailing;
  const SectionTitle(this.text, {super.key, this.trailing});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8, top: 4),
        child: Row(
          children: [
            Expanded(
                child: Text(text,
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.ink))),
            if (trailing != null) trailing!,
          ],
        ),
      );
}
