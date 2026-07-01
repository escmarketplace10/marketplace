import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';

import 'app.dart';
import 'config/app_config.dart';
import 'state/session.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppConfig.init();
  await initializeDateFormatting('id_ID', null);

  final session = Session()..restoreFromPrefs();

  runApp(
    ChangeNotifierProvider.value(
      value: session,
      child: const PosEscApp(),
    ),
  );
}
