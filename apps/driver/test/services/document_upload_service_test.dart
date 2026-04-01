import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:tikur_abay_driver/services/document_upload_service.dart';

void main() {
  group('DocumentUploadService.execute', () {
    test('returns success and runs refresh callback', () async {
      var refreshed = false;

      final result = await DocumentUploadService.execute<Map<String, dynamic>>(
        upload: () async => {'id': 'doc-1'},
        onUploaded: (_) async {
          refreshed = true;
        },
        successMessage: 'Uploaded and refreshed.',
      );

      expect(result.isSuccess, isTrue);
      expect(result.data, {'id': 'doc-1'});
      expect(result.message, 'Uploaded and refreshed.');
      expect(refreshed, isTrue);
    });

    test('returns http exception messages on failure', () async {
      final result = await DocumentUploadService.execute<void>(
        upload: () async => throw const HttpException('Upload failed.'),
      );

      expect(result.isSuccess, isFalse);
      expect(result.message, 'Upload failed.');
    });
  });
}
