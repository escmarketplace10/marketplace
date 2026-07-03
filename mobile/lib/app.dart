import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/theme.dart';
import 'screens/store_login_screen.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'state/session.dart';

class PosEscApp extends StatefulWidget {
  const PosEscApp({super.key});
  @override
  State<PosEscApp> createState() => _PosEscAppState();
}

class _PosEscAppState extends State<PosEscApp> {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Kantinku',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: _buildHome(),
    );
  }

  Widget _buildHome() {
    return Consumer<Session>(
      builder: (context, session, _) {
        if (!session.isStoreLoggedIn) {
          return const StoreLoginScreen();
        }
        if (!session.isLoggedIn) {
          return const LoginScreen();
        }
        return const HomeScreen();
      },
    );
  }
}
