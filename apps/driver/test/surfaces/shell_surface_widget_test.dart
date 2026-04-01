import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tikur_abay_driver/main.dart';
import 'package:tikur_abay_driver/screens/notifications/notifications_screen.dart';
import 'package:tikur_abay_driver/screens/profile/profile_screen.dart';
import 'package:tikur_abay_driver/services/driver_api.dart';

import '../support/mobile_test_harness.dart';

void main() {
  setupMobileWidgetTestHarness();

  testWidgets('driver home shell shows working tabs',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: DriverHomeShell()));

    expect(find.text('Home'), findsWidgets);
    expect(find.byIcon(Icons.assignment_outlined), findsOneWidget);
    expect(find.byIcon(Icons.qr_code_2_outlined), findsOneWidget);
    expect(find.byIcon(Icons.receipt_long_outlined), findsOneWidget);
    expect(find.byIcon(Icons.support_agent_outlined), findsOneWidget);
    expect(find.byIcon(Icons.person_outline), findsOneWidget);
  });

  testWidgets(
      'mobile role home loads customer experience for customer accounts',
      (WidgetTester tester) async {
    DriverSession.user = {'role': 'customer', 'mobileRole': 'customer'};

    await tester.pumpWidget(const MaterialApp(home: MobileRoleHome()));
    await tester.pumpAndSettle();

    expect(find.text('Home'), findsWidgets);
    expect(find.text('Request quote / booking'), findsOneWidget);
    expect(find.text('Open shipment tracking'), findsOneWidget);
  });

  testWidgets('mobile role home blocks driver operations when kyc is pending',
      (WidgetTester tester) async {
    DriverSession.user = {
      'role': 'driver',
      'mobileRole': 'driver',
      'kycStatus': 'under_review',
    };

    await tester.pumpWidget(const MaterialApp(home: MobileRoleHome()));
    await tester.pumpAndSettle();

    expect(find.text('Driver KYC'), findsOneWidget);
    expect(find.text('KYC Under Review'), findsOneWidget);
  });

  testWidgets('notifications screen shows empty alerts message',
      (WidgetTester tester) async {
    DriverSession.user = {'role': 'driver', 'mobileRole': 'driver'};

    await tester.pumpWidget(const MaterialApp(home: NotificationsScreen()));
    await tester.pumpAndSettle();

    expect(find.textContaining('No alerts right now'), findsOneWidget);
  });

  testWidgets('driver kyc pending screen shows backend-driven blockers',
      (WidgetTester tester) async {
    await tester.binding.setSurfaceSize(const Size(1280, 1800));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    DriverSession.accessToken = 'access-token';
    DriverSession.user = {
      '_id': 'driver-1',
      'role': 'driver',
      'mobileRole': 'driver',
      'kycStatus': 'under_review',
    };

    MockHttpRegistry.setJson(
      'GET',
      '/api/v1/auth/me',
      {
        '_id': 'driver-1',
        'role': 'driver',
        'mobileRole': 'driver',
        'kycStatus': 'under_review',
      },
    );
    MockHttpRegistry.setJson(
      'GET',
      '/api/v1/driver-kyc/driver-1',
      {
        'id': 'kyc-1',
        'status': 'under_review',
        'faydaFrontDocumentId': 'doc-front',
      },
    );
    MockHttpRegistry.setJson(
      'GET',
      '/api/v1/documents/policy?entityType=driver_kyc&mobileUploadOnly=true',
      {
        'data': [
          {
            'category': 'fayda_front',
            'label': 'Fayda ID Front',
            'priority': 'high',
            'displayOrder': 10,
          },
          {
            'category': 'fayda_back',
            'label': 'Fayda ID Back',
            'priority': 'high',
            'displayOrder': 20,
          },
          {
            'category': 'driver_license',
            'label': 'Driver License',
            'priority': 'high',
            'displayOrder': 30,
          },
        ],
      },
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: DriverKycPendingScreen(status: 'under_review'),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Uploaded documents'), findsOneWidget);
    expect(find.text('Driver license'), findsOneWidget);
    expect(find.text('Fayda back'), findsOneWidget);
  });

  testWidgets('profile screen renders settings and fallback details',
      (WidgetTester tester) async {
    DriverSession.user = {'role': 'driver', 'mobileRole': 'driver'};

    await tester.pumpWidget(const MaterialApp(home: ProfileScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Driver profile'), findsOneWidget);
    expect(find.text('KYC status'), findsOneWidget);
    expect(find.text('Addis Ababa'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Logout'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    expect(find.text('Logout'), findsOneWidget);
  });
}
