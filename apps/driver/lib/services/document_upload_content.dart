class DocumentUploadOption {
  const DocumentUploadOption({
    required this.key,
    required this.label,
  });

  final String key;
  final String label;
}

class DocumentUploadContent {
  static const takePhotoOption = DocumentUploadOption(
    key: 'camera',
    label: 'Take photo',
  );
  static const choosePhotoOption = DocumentUploadOption(
    key: 'gallery',
    label: 'Choose photo',
  );
  static const chooseFileOption = DocumentUploadOption(
    key: 'file',
    label: 'Choose file',
  );

  static const defaultOptions = [
    takePhotoOption,
    choosePhotoOption,
    chooseFileOption,
  ];

  static String uploadTitle(String category, String title) {
    switch (category) {
      case 'fayda_front':
      case 'fayda_back':
        return 'Upload $title';
      case 'driver_license':
      case 'license':
        return 'Upload driver license';
      case 'proof_of_delivery':
        return 'Upload proof of delivery';
      case 'trip_document':
        return 'Upload trip document';
      case 'expense_receipt':
        return 'Upload expense receipt';
      case 'empty_return_interchange':
        return 'Upload empty return interchange';
      case 'trade_license':
        return 'Upload trade license';
      case 'tin_certificate':
        return 'Upload TIN certificate';
      case 'cargo_manifest':
        return 'Upload cargo manifest';
      default:
        return 'Upload $title';
    }
  }

  static String uploadGuidance(
    String category, {
    bool onboardingKyc = false,
  }) {
    switch (category) {
      case 'fayda_front':
        return 'Capture or select a clear front-side image of the Fayda ID. Avoid glare and cropped edges.';
      case 'fayda_back':
        return 'Capture or select a clear back-side image of the Fayda ID. All text should remain readable.';
      case 'driver_license':
      case 'license':
        return 'Upload a readable driver license image or PDF. The license number and expiry should be visible.';
      case 'proof_of_delivery':
        return 'Upload the signed POD as a photo or PDF so dispatch can close the trip without follow-up.';
      case 'trip_document':
        return 'Upload a trip evidence file such as manifest, loading photo, offloading photo, or signed delivery paper.';
      case 'expense_receipt':
        return 'Upload receipts for depot, customs, fuel, escort, or other trip payments so finance can review and refund the driver.';
      case 'empty_return_interchange':
        return 'Upload the Djibouti empty return interchange or depot receipt after the empty container is returned.';
      case 'trade_license':
        return 'Upload the current trade license as a scan, photo, or PDF.';
      case 'tin_certificate':
        return 'Upload the TIN certificate as a scan, photo, or PDF.';
      case 'cargo_manifest':
        return 'Upload the cargo manifest as a PDF or clear scan/photo.';
      default:
        return onboardingKyc
            ? 'Choose a real image or document. The file will be uploaded with the KYC submission.'
            : 'Choose a real image or PDF. The file will be uploaded immediately.';
    }
  }

  static List<String> allowedExtensions(String category) {
    switch (category) {
      case 'proof_of_delivery':
      case 'trip_document':
      case 'expense_receipt':
      case 'empty_return_interchange':
        return const ['jpg', 'jpeg', 'png', 'pdf', 'webp'];
      case 'trade_license':
      case 'tin_certificate':
      case 'cargo_manifest':
        return const ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
      case 'fayda_front':
      case 'fayda_back':
      case 'driver_license':
      case 'license':
        return const ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
      default:
        return const ['jpg', 'jpeg', 'png', 'pdf', 'webp'];
    }
  }
}
