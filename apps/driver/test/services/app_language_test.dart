import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tikur_abay_driver/app_language.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Driver language', () {
    test('defaults to English when no saved preference exists', () async {
      SharedPreferences.setMockInitialValues({});

      await initializeDriverLanguage();

      expect(driverLanguageNotifier.value, DriverLanguage.en);
      expect(t('language', fallback: 'Language'), 'Language');
      expect(driverLanguageLabel(DriverLanguage.am), 'Amharic');
    });

    test('uses saved Amharic preference only when explicitly stored', () async {
      SharedPreferences.setMockInitialValues({
        'tikur_abay_driver_language': 'am',
      });

      await initializeDriverLanguage();

      expect(driverLanguageNotifier.value, DriverLanguage.am);
      expect(t('language', fallback: 'Language'), 'ቋንቋ');
      expect(driverLanguageLabel(DriverLanguage.en), 'እንግሊዝኛ');
    });
  });
}
