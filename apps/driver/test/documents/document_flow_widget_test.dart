import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tikur_abay_driver/screens/documents/document_route_screen.dart';
import 'package:tikur_abay_driver/screens/documents/document_screen.dart';
import 'package:tikur_abay_driver/services/driver_api.dart';
import 'package:tikur_abay_driver/services/document_focus_session.dart';
import 'package:tikur_abay_driver/services/document_upload_service.dart';

import '../support/mobile_test_harness.dart';

void main() {
  setupMobileWidgetTestHarness();

  testWidgets('document route title reacts to focused document session',
      (WidgetTester tester) async {
    DriverSession.user = {'role': 'customer', 'mobileRole': 'customer'};
    DocumentFocusSession.clear(customer: true);

    await tester.pumpWidget(
      const MaterialApp(
        home: DocumentRouteScreen(baseTitle: 'Document Center'),
      ),
    );
    await tester.pump();

    expect(find.text('Document Center'), findsOneWidget);

    DocumentFocusSession.write(
      customer: true,
      category: 'trade_license',
      label: 'Trade License',
    );
    await tester.pump();

    expect(find.text('Document Center: Trade License'), findsOneWidget);
  });

  testWidgets('focused document screen shows upload CTA for missing policy',
      (WidgetTester tester) async {
    DriverSession.user = {
      '_id': 'driver-1',
      'role': 'driver',
      'mobileRole': 'driver',
    };

    MockHttpRegistry.setJson('GET', '/api/v1/documents', {'data': []});
    MockHttpRegistry.setJson(
      'GET',
      '/api/v1/documents/policy?entityType=driver_kyc&mobileUploadOnly=true',
      {
        'data': [
          {
            'category': 'driver_license',
            'label': 'Driver License',
            'priority': 'high',
            'group': 'Driving Approval',
            'groupOrder': 10,
            'displayOrder': 10,
          },
        ],
      },
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: DocumentScreen(
          focusCategory: 'driver_license',
          focusLabel: 'Driver License',
          focusEntityType: 'driver_kyc',
          focusEntityId: 'driver-1',
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Focused document: Driver License'), findsOneWidget);
    expect(find.text('Upload now'), findsOneWidget);
    expect(find.text('No uploaded file is linked to this document yet.'),
        findsOneWidget);
  });

  testWidgets('document preview dialog shows missing download URL message',
      (WidgetTester tester) async {
    DriverSession.user = {
      '_id': 'driver-1',
      'role': 'driver',
      'mobileRole': 'driver',
    };

    MockHttpRegistry.setJson(
      'GET',
      '/api/v1/documents',
      {
        'data': [
          {
            'id': 'doc-1',
            'title': 'Driver License',
            'category': 'driver_license',
            'categoryLabel': 'Driver License',
            'status': 'available',
            'mobileCanUpload': false,
            'createdAt': '2026-03-10T12:00:00.000Z',
          },
        ],
      },
    );
    MockHttpRegistry.setJson(
      'GET',
      '/api/v1/documents/doc-1/download',
      {
        'downloadUrl': '',
        'mimeType': 'application/pdf',
      },
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: DocumentScreen()),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Preview'));
    await tester.pumpAndSettle();

    expect(find.text('No download URL is available for this document yet.'),
        findsOneWidget);
    expect(find.text('Close'), findsOneWidget);
  });

  testWidgets('document preview failure shows snackbar message',
      (WidgetTester tester) async {
    DriverSession.user = {
      '_id': 'driver-1',
      'role': 'driver',
      'mobileRole': 'driver',
    };

    MockHttpRegistry.setJson(
      'GET',
      '/api/v1/documents',
      {
        'data': [
          {
            'id': 'doc-2',
            'title': 'Cargo Manifest',
            'category': 'cargo_manifest',
            'categoryLabel': 'Cargo Manifest',
            'status': 'available',
            'mobileCanUpload': false,
            'createdAt': '2026-03-10T12:00:00.000Z',
          },
        ],
      },
    );
    MockHttpRegistry.setJson(
      'GET',
      '/api/v1/documents/doc-2/download',
      {'message': 'Preview unavailable.'},
      statusCode: 500,
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: DocumentScreen()),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Preview'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.text('Preview unavailable.'), findsOneWidget);
  });

  testWidgets('document upload failure shows snackbar message',
      (WidgetTester tester) async {
    DriverSession.user = {
      '_id': 'driver-1',
      'role': 'driver',
      'mobileRole': 'driver',
    };

    MockHttpRegistry.setJson('GET', '/api/v1/documents', {'data': []});
    MockHttpRegistry.setJson(
      'GET',
      '/api/v1/documents/policy?entityType=driver_kyc&mobileUploadOnly=true',
      {
        'data': [
          {
            'category': 'cargo_manifest',
            'label': 'Cargo Manifest',
            'priority': 'high',
            'group': 'Trip documents',
            'groupOrder': 10,
            'displayOrder': 10,
          },
        ],
      },
    );

    DocumentUploadService.pickFileOverride = (
      BuildContext context, {
      required String title,
      required String subtitle,
      required List<String> allowedExtensions,
    }) async {
      return SelectedUploadFile(
        fileName: 'manifest.pdf',
        bytes: Uint8List.fromList([1, 2, 3]),
        mimeType: 'application/pdf',
      );
    };
    DocumentUploadService.uploadDocumentOverride = ({
      required String title,
      required String entityType,
      required String entityId,
      required String category,
      required SelectedUploadFile file,
    }) async {
      throw const HttpException('Upload failed from server.');
    };

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: DocumentScreen(
            focusCategory: 'cargo_manifest',
            focusLabel: 'Cargo Manifest',
            focusEntityType: 'trip',
            focusEntityId: 'trip-1',
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Upload now'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.text('Upload failed from server.'), findsOneWidget);
  });

  testWidgets('customer focused upload succeeds and refreshes documents',
      (WidgetTester tester) async {
    await tester.binding.setSurfaceSize(const Size(1280, 1800));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    DriverSession.user = {
      '_id': 'customer-user-1',
      'role': 'customer',
      'mobileRole': 'customer',
      'customerCode': 'CUST-1',
    };

    MockHttpRegistry.setJson(
      'GET',
      '/api/v1/customer/workspace',
      {
        'documents': <Map<String, dynamic>>[],
        'agreements': <Map<String, dynamic>>[],
      },
    );
    MockHttpRegistry.setJson(
      'GET',
      '/api/v1/documents/policy?entityType=customer&mobileUploadOnly=true',
      {
        'data': [
          {
            'category': 'trade_license',
            'label': 'Trade License',
            'priority': 'high',
            'group': 'Legal',
            'groupOrder': 10,
            'displayOrder': 10,
          },
        ],
      },
    );

    DocumentUploadService.pickFileOverride = (
      BuildContext context, {
      required String title,
      required String subtitle,
      required List<String> allowedExtensions,
    }) async {
      return SelectedUploadFile(
        fileName: 'trade-license.pdf',
        bytes: Uint8List.fromList([4, 5, 6]),
        mimeType: 'application/pdf',
      );
    };
    DocumentUploadService.uploadDocumentOverride = ({
      required String title,
      required String entityType,
      required String entityId,
      required String category,
      required SelectedUploadFile file,
    }) async {
      MockHttpRegistry.setJson(
        'GET',
        '/api/v1/customer/workspace',
        {
          'documents': [
            {
              'id': 'cust-doc-1',
              'title': 'Trade License',
              'category': 'trade_license',
              'categoryLabel': 'Trade License',
              'requirementState': 'uploaded',
              'mobileCanUpload': true,
              'createdAt': '2026-03-12T09:00:00.000Z',
            },
          ],
          'agreements': <Map<String, dynamic>>[],
        },
      );
      return {
        'id': 'cust-doc-1',
        'entityType': entityType,
        'entityId': entityId,
        'category': category,
      };
    };

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: DocumentScreen(
            focusCategory: 'trade_license',
            focusLabel: 'Trade License',
            focusEntityType: 'customer',
            focusEntityId: 'CUST-1',
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Upload now'), findsOneWidget);

    await tester.tap(find.text('Upload now'));
    await tester.pump();
    await tester.pumpAndSettle();

    expect(find.text('Documents Uploaded'), findsOneWidget);
    expect(find.text('Upload now'), findsNothing);
    expect(find.text('Uploaded or available'), findsOneWidget);
    expect(find.text('Trade License · uploaded'), findsOneWidget);
  });
}
