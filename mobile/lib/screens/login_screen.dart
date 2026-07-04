import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../services/api.dart';
import '../state/session.dart';

/// Login dengan PIN 4-6 digit (keypad sentuh).
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String _pin = '';
  String? _error;
  bool _loading = false;

  void _digit(String d) {
    if (_pin.length >= 6) return;
    setState(() {
      _pin += d;
      _error = null;
    });
  }

  void _backspace() {
    if (_pin.isEmpty) return;
    setState(() => _pin = _pin.substring(0, _pin.length - 1));
  }

  Future<void> _submit() async {
    if (_pin.length < 4) {
      setState(() => _error = 'PIN minimal 4 digit');
      return;
    }
    setState(() => _loading = true);
    try {
      final res = await Api.login(_pin);
      final emp = Map<String, dynamic>.from(res['employee']);
      if (!mounted) return;
      await context.read<Session>().setLogin(emp, res['token'].toString());
    } catch (e) {
      setState(() {
        _error = e.toString();
        _pin = '';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 380),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(22),
                  child: Image.asset('assets/logo.png', width: 88, height: 88),
                ),
                const SizedBox(height: 14),
                const Text('Kantinku', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
                const Text('Masukkan PIN Kasir / Petugas Stok',
                    style: TextStyle(color: AppColors.muted, fontSize: 14)),
                const SizedBox(height: 24),
                // Indikator PIN
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(6, (i) {
                    final filled = _pin.length > i;
                    return Container(
                      margin: const EdgeInsets.symmetric(horizontal: 6),
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: filled ? AppColors.primary : Colors.transparent,
                        border: Border.all(color: filled ? AppColors.primary : AppColors.muted, width: 2),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 16),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(_error!,
                        style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700)),
                  ),
                const SizedBox(height: 8),
                _Keypad(onDigit: _digit, onBackspace: _backspace, disabled: _loading),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _loading || _pin.length < 4 ? null : _submit,
                    child: _loading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('MASUK'),
                  ),
                ),
                const SizedBox(height: 12),
                const Text('Admin mengelola toko lewat Website.\nPIN kasir contoh pertama kali: 123456',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.muted, fontSize: 11)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Keypad extends StatelessWidget {
  final void Function(String) onDigit;
  final VoidCallback onBackspace;
  final bool disabled;
  const _Keypad({required this.onDigit, required this.onBackspace, required this.disabled});

  @override
  Widget build(BuildContext context) {
    final keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 3,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.6,
      children: keys.map((k) {
        if (k.isEmpty) return const SizedBox();
        final isBack = k == '⌫';
        return Material(
          color: isBack ? AppColors.bg : Colors.white,
          borderRadius: BorderRadius.circular(14),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: disabled ? null : (isBack ? onBackspace : () => onDigit(k)),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.black.withValues(alpha: 0.08)),
              ),
              alignment: Alignment.center,
              child: isBack
                  ? const Icon(Icons.backspace_outlined, size: 24)
                  : Text(k, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
            ),
          ),
        );
      }).toList(),
    );
  }
}
