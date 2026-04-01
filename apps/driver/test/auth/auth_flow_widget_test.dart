import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tikur_abay_driver/main.dart';
import 'package:tikur_abay_driver/screens/auth/customer_login_screen.dart';
import 'package:tikur_abay_driver/screens/auth/driver_login_screen.dart';
import 'package:tikur_abay_driver/screens/auth/otp_verification_screen.dart';
import 'package:tikur_abay_driver/services/driver_api.dart';

import '../support/mobile_test_harness.dart';

void main() {
  setupMobileWidgetTestHarness();

  testWidgets('login screen renders app title', (WidgetTester tester) async {
    await tester.pumpWidget(const TikurAbayDriverApp());

    expect(find.text('Welcome to Tikur Abay'), findsOneWidget);
    expect(find.text('Customer / User'), findsOneWidget);
    expect(find.text('Driver'), findsOneWidget);
  });

  testWidgets(
      'customer login shows validation message when identifier is empty',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: CustomerLoginScreen()));

    await tester.enterText(find.byType(TextField).at(0), '');
    await tester.enterText(find.byType(TextField).at(1), '1234');
    await tester.scrollUntilVisible(
      find.text('Sign in'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Sign in'));
    await tester.pump();

    expect(find.text('Enter your phone number or email.'), findsOneWidget);
  });

  testWidgets('driver login shows validation message when pin is empty',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: DriverLoginScreen()));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).last, '');
    await tester.scrollUntilVisible(
      find.text('Sign in'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Sign in'));
    await tester.pump();

    expect(find.text('Enter a 4-digit PIN.'), findsOneWidget);
  });

  testWidgets('driver login preloads fixed phone and PIN defaults',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: DriverLoginScreen()));
    await tester.pumpAndSettle();

    final phoneField = tester.widget<TextField>(find.byType(TextField).first);
    final pinField = tester.widget<TextField>(find.byType(TextField).last);

    expect(phoneField.controller?.text, '+251900000015');
    expect(pinField.controller?.text, '2112');
    expect(
      find.text(
          'Default demo login: +251900000015 with PIN 2112. Drivers sign in with phone number and PIN only.'),
      findsOneWidget,
    );
  });

  testWidgets('otp verification logs in an existing customer',
      (WidgetTester tester) async {
    MockHttpRegistry.setJson(
      'POST',
      '/api/v1/mobile-auth/verify-otp',
      {
        'data': {
          'existingUser': true,
          'user': {
            '_id': 'customer-1',
            'role': 'customer',
            'mobileRole': 'customer',
          },
        },
      },
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: OtpVerificationScreen(
          identifier: '+251912345678',
          role: 'customer',
        ),
      ),
    );

    await tester.enterText(find.byType(TextField), '123456');
    await tester.tap(find.text('Verify code'));
    await tester.pumpAndSettle();

    expect(find.text('Request quote / booking'), findsOneWidget);
    expect(DriverSession.user?['mobileRole'], 'customer');
  });

  testWidgets('otp verification routes a new driver to onboarding',
      (WidgetTester tester) async {
    MockHttpRegistry.setJson(
      'POST',
      '/api/v1/mobile-auth/verify-otp',
      {
        'data': {'existingUser': false},
      },
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: OtpVerificationScreen(
          identifier: '+251955555555',
          role: 'driver',
        ),
      ),
    );

    await tester.enterText(find.byType(TextField), '123456');
    await tester.tap(find.text('Verify code'));
    await tester.pumpAndSettle();

    expect(find.text('Driver onboarding'), findsOneWidget);
    expect(find.text('Driver type'), findsOneWidget);
  });
}
