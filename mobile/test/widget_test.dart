// Placeholder test. UI utama diuji manual di perangkat.
import 'package:flutter_test/flutter_test.dart';
import 'package:pos_esc/core/format.dart';

void main() {
  test('format rupiah benar', () {
    expect(rupiah(15000), 'Rp 15.000');
  });
}
