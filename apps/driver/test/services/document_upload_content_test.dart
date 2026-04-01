import 'package:flutter_test/flutter_test.dart';
import 'package:tikur_abay_driver/services/document_upload_content.dart';

void main() {
  group('DocumentUploadContent', () {
    test('returns category-specific titles and guidance', () {
      expect(
        DocumentUploadContent.uploadTitle('proof_of_delivery', 'POD'),
        'Upload proof of delivery',
      );
      expect(
        DocumentUploadContent.uploadGuidance('fayda_front'),
        contains('front-side image of the Fayda ID'),
      );
      expect(
        DocumentUploadContent.uploadGuidance(
          'unknown',
          onboardingKyc: true,
        ),
        contains('KYC submission'),
      );
    });

    test('returns category-specific allowed extensions', () {
      expect(
        DocumentUploadContent.allowedExtensions('cargo_manifest'),
        contains('pdf'),
      );
      expect(
        DocumentUploadContent.allowedExtensions('cargo_manifest'),
        isNot(contains('exe')),
      );
      expect(
        DocumentUploadContent.allowedExtensions('driver_license'),
        containsAll(['jpg', 'png', 'pdf']),
      );
    });

    test('exposes stable source options', () {
      expect(DocumentUploadContent.takePhotoOption.label, 'Take photo');
      expect(DocumentUploadContent.choosePhotoOption.label, 'Choose photo');
      expect(DocumentUploadContent.chooseFileOption.label, 'Choose file');
      expect(DocumentUploadContent.defaultOptions, hasLength(3));
    });
  });
}
