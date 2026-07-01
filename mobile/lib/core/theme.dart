import 'package:flutter/material.dart';

/// Palet brand Kantinku — profesional, oranye + sidebar gelap.
class AppColors {
  static const primary = Color(0xFFF97316); // oranye brand
  static const primaryDark = Color(0xFFEA580C);
  static const accent = Color(0xFF2563EB); // biru sekunder
  static const sidebar = Color(0xFF111827); // gelap (navigasi)
  static const sidebarMuted = Color(0xFF9CA3AF);
  static const success = Color(0xFF16A34A);
  static const warning = Color(0xFFF59E0B);
  static const danger = Color(0xFFDC2626);
  static const bg = Color(0xFFF8FAFC); // slate-50
  static const surface = Colors.white;
  static const ink = Color(0xFF111827); // slate-900
  static const muted = Color(0xFF6B7280); // slate-500
  static const line = Color(0xFFE5E7EB); // border halus
}

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    primary: AppColors.primary,
    secondary: AppColors.accent,
    surface: AppColors.surface,
    brightness: Brightness.light,
  );

  OutlineInputBorder border(Color c, [double w = 1]) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: c, width: w),
      );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: AppColors.bg,
    fontFamily: 'Roboto',
    visualDensity: VisualDensity.standard,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.surface,
      foregroundColor: AppColors.ink,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
      titleTextStyle: TextStyle(color: AppColors.ink, fontSize: 19, fontWeight: FontWeight.w700),
    ),
    cardTheme: CardThemeData(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AppColors.line),
      ),
      margin: EdgeInsets.zero,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        minimumSize: const Size(0, 52),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 0,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        minimumSize: const Size(0, 52),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 52),
        foregroundColor: AppColors.ink,
        side: const BorderSide(color: AppColors.line),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: AppColors.primary),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      border: border(AppColors.line),
      enabledBorder: border(AppColors.line),
      focusedBorder: border(AppColors.primary, 1.6),
      hintStyle: const TextStyle(color: AppColors.muted, fontWeight: FontWeight.w400),
    ),
    chipTheme: ChipThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      side: const BorderSide(color: AppColors.line),
      backgroundColor: AppColors.surface,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AppColors.surface,
      indicatorColor: AppColors.primary.withValues(alpha: 0.14),
      labelTextStyle: WidgetStateProperty.all(const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
      height: 64,
    ),
    dividerTheme: const DividerThemeData(color: AppColors.line, thickness: 1, space: 1),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
    dialogTheme: DialogThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
  );
}

/// Warna & ikon placeholder untuk kartu menu (dipakai bila belum ada foto).
const _menuPalette = [
  (Color(0xFFFFF7ED), Color(0xFFF97316)),
  (Color(0xFFEFF6FF), Color(0xFF2563EB)),
  (Color(0xFFF0FDF4), Color(0xFF16A34A)),
  (Color(0xFFFEF2F2), Color(0xFFDC2626)),
  (Color(0xFFFEFCE8), Color(0xFFCA8A04)),
  (Color(0xFFF5F3FF), Color(0xFF7C3AED)),
  (Color(0xFFFDF2F8), Color(0xFFDB2777)),
  (Color(0xFFECFEFF), Color(0xFF0891B2)),
];

/// Pilih warna placeholder konsisten berdasar teks (nama/kategori).
(Color, Color) menuColors(String key) {
  if (key.isEmpty) return _menuPalette.first;
  final idx = key.codeUnits.fold<int>(0, (a, b) => a + b) % _menuPalette.length;
  return _menuPalette[idx];
}
