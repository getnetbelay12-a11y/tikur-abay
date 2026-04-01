import 'dart:io';

import 'package:url_launcher/url_launcher.dart';

import 'driver_api.dart';

class DocumentPreviewData {
  const DocumentPreviewData({
    required this.downloadUrl,
    required this.mimeType,
  });

  final String downloadUrl;
  final String mimeType;

  bool get isImage => mimeType.startsWith('image/');
  bool get isPdf => mimeType == 'application/pdf';
}

class DocumentPreviewResult<T> {
  const DocumentPreviewResult._({
    this.data,
    required this.message,
    required this.isSuccess,
  });

  final T? data;
  final String message;
  final bool isSuccess;

  factory DocumentPreviewResult.success(T data, {String message = ''}) {
    return DocumentPreviewResult._(
      data: data,
      message: message,
      isSuccess: true,
    );
  }

  factory DocumentPreviewResult.failure(String message) {
    return DocumentPreviewResult._(
      message: message,
      isSuccess: false,
    );
  }
}

class DocumentPreviewService {
  static const previewLoadErrorMessage = 'Unable to load the document preview.';
  static const openErrorMessage = 'Unable to open the document right now.';

  static Future<DocumentPreviewResult<DocumentPreviewData>> fetchPreview(
    String id, {
    String fallbackMimeType = '',
  }) async {
    try {
      final download = await DriverApi.fetchDocumentDownload(id);
      return DocumentPreviewResult.success(
        DocumentPreviewData(
          downloadUrl: download?['downloadUrl']?.toString() ?? '',
          mimeType: (download?['mimeType'] ?? fallbackMimeType).toString(),
        ),
      );
    } catch (error) {
      return DocumentPreviewResult.failure(_errorMessage(
        error,
        fallback: previewLoadErrorMessage,
      ));
    }
  }

  static Future<DocumentPreviewResult<void>> openRemoteUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) {
      return DocumentPreviewResult.failure(openErrorMessage);
    }
    try {
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!opened) {
        return DocumentPreviewResult.failure(openErrorMessage);
      }
      return DocumentPreviewResult.success(null);
    } catch (error) {
      return DocumentPreviewResult.failure(_errorMessage(
        error,
        fallback: openErrorMessage,
      ));
    }
  }

  static String _errorMessage(Object error, {required String fallback}) {
    if (error is HttpException) {
      return error.message;
    }
    return fallback;
  }
}
