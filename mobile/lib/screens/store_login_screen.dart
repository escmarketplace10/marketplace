import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/api.dart';
import '../state/session.dart';

class StoreLoginScreen extends StatefulWidget {
  const StoreLoginScreen({super.key});

  @override
  State<StoreLoginScreen> createState() => _StoreLoginScreenState();
}

class _StoreLoginScreenState extends State<StoreLoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _isLoading = false;

  Future<void> _login() async {
    final email = _emailCtrl.text.trim();
    final pass = _passCtrl.text.trim();
    if (email.isEmpty || pass.isEmpty) {
      showSnack(context, 'Email dan password harus diisi');
      return;
    }

    setState(() => _isLoading = true);
    try {
      final res = await Api.storeLogin(email, pass);

      if (res['token'] != null && mounted) {
        context.read<Session>().setStoreLogin(res['token']);
      }
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Image.asset('assets/logo.png', height: 80),
              const SizedBox(height: 24),
              const Text('Login Toko', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('Masuk menggunakan akun admin untuk menghubungkan perangkat ini ke toko Anda.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
              const SizedBox(height: 32),
              
              TextField(
                controller: _emailCtrl,
                decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passCtrl,
                decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder()),
                obscureText: true,
              ),
              const SizedBox(height: 24),
              
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _login,
                  child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text('Hubungkan Perangkat'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
