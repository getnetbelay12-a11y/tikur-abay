import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mime/mime.dart';

import 'document_upload_content.dart';
import 'driver_api.dart';

class SelectedUploadFile {
  const SelectedUploadFile({
    required this.fileName,
    required this.bytes,
    required this.mimeType,
  });

  final String fileName;
  final Uint8List bytes;
  final String mimeType;

  String get label {
    final sizeKb = bytes.length / 1024;
    final displaySize = sizeKb >= 1024
        ? '${(sizeKb / 1024).toStringAsFixed(1)} MB'
        : '${sizeKb.toStringAsFixed(1)} KB';
    return '$fileName • $displaySize';
  }
}

class DocumentUploadResult<T> {
  const DocumentUploadResult._({
    this.data,
    required this.message,
    required this.isSuccess,
  });

  final T? data;
  final String message;
  final bool isSuccess;

  factory DocumentUploadResult.success(T data, String message) {
    return DocumentUploadResult._(
      data: data,
      message: message,
      isSuccess: true,
    );
  }

  factory DocumentUploadResult.failure(String message) {
    return DocumentUploadResult._(
      message: message,
      isSuccess: false,
    );
  }
}

class DocumentUploadService {
  static const defaultSuccessMessage = 'Document uploaded.';
  static Future<SelectedUploadFile?> Function(
    BuildContext context, {
    required String title,
    required String subtitle,
    required List<String> allowedExtensions,
  })? pickFileOverride;
  static Future<Map<String, dynamic>> Function({
    required String title,
    required String entityType,
    required String entityId,
    required String category,
    required SelectedUploadFile file,
  })? uploadDocumentOverride;

  static void clearOverrides() {
    pickFileOverride = null;
    uploadDocumentOverride = null;
  }

  static Future<SelectedUploadFile?> pickFile(
    BuildContext context, {
    required String title,
    required String subtitle,
    required List<String> allowedExtensions,
  }) {
    final override = pickFileOverride;
    if (override != null) {
      return override(
        context,
        title: title,
        subtitle: subtitle,
        allowedExtensions: allowedExtensions,
      );
    }
    return showModalBottomSheet<SelectedUploadFile>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                title,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Text(
                subtitle,
                style: const TextStyle(color: Color(0xFF52606D)),
              ),
              const SizedBox(height: 16),
              FilledButton.tonalIcon(
                onPressed: () async {
                  final picker = ImagePicker();
                  final file = await picker.pickImage(
                    source: ImageSource.camera,
                    imageQuality: 85,
                  );
                  if (!context.mounted) return;
                  Navigator.of(context).pop(await _fromXFile(file));
                },
                icon: const Icon(Icons.photo_camera_outlined),
                label: Text(DocumentUploadContent.takePhotoOption.label),
              ),
              const SizedBox(height: 10),
              FilledButton.tonalIcon(
                onPressed: () async {
                  final picker = ImagePicker();
                  final file = await picker.pickImage(
                    source: ImageSource.gallery,
                    imageQuality: 85,
                  );
                  if (!context.mounted) return;
                  Navigator.of(context).pop(await _fromXFile(file));
                },
                icon: const Icon(Icons.photo_library_outlined),
                label: Text(DocumentUploadContent.choosePhotoOption.label),
              ),
              const SizedBox(height: 10),
              FilledButton.tonalIcon(
                onPressed: () async {
                  final result = await FilePicker.platform.pickFiles(
                    allowMultiple: false,
                    type: FileType.custom,
                    withData: true,
                    allowedExtensions: allowedExtensions,
                  );
                  if (!context.mounted) return;
                  Navigator.of(context)
                      .pop(_fromPlatformFile(result?.files.single));
                },
                icon: const Icon(Icons.folder_open_outlined),
                label: Text(DocumentUploadContent.chooseFileOption.label),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static Future<Map<String, dynamic>> uploadDocument({
    required String title,
    required String entityType,
    required String entityId,
    required String category,
    required SelectedUploadFile file,
  }) {
    final override = uploadDocumentOverride;
    if (override != null) {
      return override(
        title: title,
        entityType: entityType,
        entityId: entityId,
        category: category,
        file: file,
      );
    }
    return DriverApi.uploadDocument({
      'title': title,
      'entityType': entityType,
      'entityId': entityId,
      'category': category,
      'fileName': file.fileName,
      'mimeType': file.mimeType,
      'fileSize': file.bytes.length,
      'fileContentBase64': base64Encode(file.bytes),
    });
  }

  static Future<DocumentUploadResult<T>> execute<T>({
    required Future<T> Function() upload,
    Future<void> Function(T result)? onUploaded,
    String successMessage = defaultSuccessMessage,
  }) async {
    try {
      final result = await upload();
      if (onUploaded != null) {
        await onUploaded(result);
      }
      return DocumentUploadResult.success(result, successMessage);
    } catch (error) {
      return DocumentUploadResult.failure(uploadErrorMessage(error));
    }
  }

  static Future<SelectedUploadFile?> _fromXFile(XFile? file) async {
    if (file == null) return null;
    final bytes = await file.readAsBytes();
    return SelectedUploadFile(
      fileName: file.name,
      bytes: bytes,
      mimeType: lookupMimeType(file.name, headerBytes: bytes) ?? 'image/jpeg',
    );
  }

  static SelectedUploadFile? _fromPlatformFile(PlatformFile? file) {
    if (file == null || file.bytes == null) return null;
    return SelectedUploadFile(
      fileName: file.name,
      bytes: file.bytes!,
      mimeType: lookupMimeType(file.name, headerBytes: file.bytes!) ??
          'application/octet-stream',
    );
  }

  static String uploadErrorMessage(Object error) {
    if (error is HttpException) {
      return error.message;
    }
    return 'Unable to upload the document right now.';
  }
}
