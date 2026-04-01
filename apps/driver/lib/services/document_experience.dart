import 'package:flutter/material.dart';

class DocumentExperience {
  static const uploadedMessage = 'Document uploaded.';
  static const noDownloadUrlMessage =
      'No download URL is available for this document yet.';
  static const imagePreviewFallbackMessage =
      'Image preview failed. Use Open to view the file.';
  static const emptyFocusedDocumentsMessage =
      'No uploaded file is linked to this document yet.';
  static const emptyDocumentsMessage = 'No documents are available.';
  static const emptyAgreementsMessage = 'No agreements are available.';
  static const focusHintMessage =
      'Tap title or category to focus this document context.';
  static const pdfPreviewOpenMessage =
      'PDF preview opens in the device browser or file handler.';
  static const genericPreviewOpenMessage =
      'This file type opens in the device browser or file handler.';

  static void showMessage(BuildContext context, String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  static String previewOpenMessage(String mimeType) {
    return mimeType == 'application/pdf'
        ? pdfPreviewOpenMessage
        : genericPreviewOpenMessage;
  }

  static String documentsEmptyMessage({required bool focused}) {
    return focused ? emptyFocusedDocumentsMessage : emptyDocumentsMessage;
  }
}
