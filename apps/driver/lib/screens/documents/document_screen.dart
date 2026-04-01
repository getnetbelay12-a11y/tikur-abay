import 'package:flutter/material.dart';

import '../../app_language.dart';
import '../../services/driver_api.dart';
import '../../services/document_experience.dart';
import '../../services/document_focus_session.dart';
import '../../services/document_upload_content.dart';
import '../../services/document_preview_service.dart';
import '../../services/document_upload_service.dart';

class DocumentScreen extends StatefulWidget {
  const DocumentScreen({
    this.focusCategory,
    this.focusLabel,
    this.focusEntityType,
    this.focusEntityId,
    super.key,
  });

  final String? focusCategory;
  final String? focusLabel;
  final String? focusEntityType;
  final String? focusEntityId;

  @override
  State<DocumentScreen> createState() => _DocumentScreenState();
}

class _DocumentScreenState extends State<DocumentScreen> {
  late Future<List<dynamic>> _documentsFuture;
  late Future<Map<String, dynamic>?> _customerWorkspaceFuture;
  late Future<List<dynamic>> _customerPolicyFuture;
  late Future<List<dynamic>> _driverPolicyFuture;
  late String? _activeFocusCategory;
  late String? _activeFocusLabel;
  bool _uploading = false;

  bool get _isCustomerRole {
    final role =
        (DriverSession.user?['mobileRole'] ?? DriverSession.user?['role'] ?? '')
            .toString();
    return role == 'customer';
  }

  bool get _hasFocusCategory =>
      _activeFocusCategory != null && _activeFocusCategory!.isNotEmpty;

  bool get _hasFocusUploadTarget =>
      _resolvedFocusEntityType != null &&
      _resolvedFocusEntityType!.isNotEmpty &&
      _resolvedFocusEntityId != null &&
      _resolvedFocusEntityId!.isNotEmpty;

  String? get _resolvedFocusEntityType {
    if (widget.focusEntityType != null && widget.focusEntityType!.isNotEmpty) {
      return widget.focusEntityType;
    }
    final role =
        (DriverSession.user?['mobileRole'] ?? DriverSession.user?['role'] ?? '')
            .toString();
    if (role == 'customer') {
      return 'customer';
    }
    return 'driver_kyc';
  }

  String? get _resolvedFocusEntityId {
    if (widget.focusEntityId != null && widget.focusEntityId!.isNotEmpty) {
      return widget.focusEntityId;
    }
    final role =
        (DriverSession.user?['mobileRole'] ?? DriverSession.user?['role'] ?? '')
            .toString();
    if (role == 'customer') {
      return DriverSession.user?['customerCode']?.toString();
    }
    return DriverSession.user?['_id']?.toString();
  }

  @override
  void initState() {
    super.initState();
    final persisted = DocumentFocusSession.read(customer: _isCustomerRole);
    _activeFocusCategory = widget.focusCategory ?? persisted.category;
    _activeFocusLabel = widget.focusLabel ?? persisted.label;
    _documentsFuture = DriverApi.fetchDocuments();
    _customerWorkspaceFuture = DriverApi.fetchCustomerWorkspace();
    _customerPolicyFuture = DriverApi.fetchDocumentPolicy(
      entityType: 'customer',
      mobileUploadOnly: true,
    );
    _driverPolicyFuture = DriverApi.fetchDocumentPolicy(
      entityType: 'driver_kyc',
      mobileUploadOnly: true,
    );
  }

  Future<void> _reload() async {
    setState(() {
      _documentsFuture = DriverApi.fetchDocuments();
      _customerWorkspaceFuture = DriverApi.fetchCustomerWorkspace();
      _customerPolicyFuture = DriverApi.fetchDocumentPolicy(
        entityType: 'customer',
        mobileUploadOnly: true,
      );
      _driverPolicyFuture = DriverApi.fetchDocumentPolicy(
        entityType: 'driver_kyc',
        mobileUploadOnly: true,
      );
    });
  }

  List<Map<String, dynamic>> _sortedPolicyList(List<dynamic> items) {
    final policies = items
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
    policies.sort((left, right) {
      final leftOrder = (left['displayOrder'] as num?)?.toInt() ?? 999;
      final rightOrder = (right['displayOrder'] as num?)?.toInt() ?? 999;
      return leftOrder.compareTo(rightOrder);
    });
    return policies;
  }

  List<Map<String, dynamic>> _sortedDocumentList(List<dynamic> items) {
    final docs = items
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
    docs.sort((left, right) {
      final leftOrder = (left['categoryOrder'] as num?)?.toInt() ?? 999;
      final rightOrder = (right['categoryOrder'] as num?)?.toInt() ?? 999;
      if (leftOrder != rightOrder) {
        return leftOrder.compareTo(rightOrder);
      }
      final leftDate = DateTime.tryParse(left['createdAt']?.toString() ?? '');
      final rightDate = DateTime.tryParse(right['createdAt']?.toString() ?? '');
      return (rightDate ?? DateTime.fromMillisecondsSinceEpoch(0))
          .compareTo(leftDate ?? DateTime.fromMillisecondsSinceEpoch(0));
    });
    return docs;
  }

  List<Map<String, dynamic>> _filteredPolicies(List<dynamic> items) {
    final policies = _sortedPolicyList(items);
    if (!_hasFocusCategory) {
      return policies;
    }
    return policies
        .where(
            (policy) => policy['category']?.toString() == _activeFocusCategory)
        .toList();
  }

  List<Map<String, dynamic>> _filteredDocuments(List<dynamic> items) {
    final docs = _sortedDocumentList(items);
    if (!_hasFocusCategory) {
      return docs;
    }
    return docs
        .where((doc) => doc['category']?.toString() == _activeFocusCategory)
        .toList();
  }

  String _priorityLabel(String? priority) {
    switch ((priority ?? '').toLowerCase()) {
      case 'high':
        return 'Priority';
      case 'medium':
        return 'Standard';
      default:
        return 'Normal';
    }
  }

  Color _priorityColor(String? priority) {
    switch ((priority ?? '').toLowerCase()) {
      case 'high':
        return const Color(0xFFD64545);
      case 'medium':
        return const Color(0xFFB7791F);
      default:
        return const Color(0xFF52606D);
    }
  }

  Color _priorityBackground(String? priority, bool uploaded) {
    if (uploaded) {
      return const Color(0xFFF8FAFC);
    }
    switch ((priority ?? '').toLowerCase()) {
      case 'high':
        return const Color(0xFFFFF1F1);
      case 'medium':
        return const Color(0xFFFFF8E8);
      default:
        return const Color(0xFFF8FAFC);
    }
  }

  IconData _policyIcon(String? priority, bool uploaded) {
    if (uploaded) {
      return Icons.check_circle_outline;
    }
    switch ((priority ?? '').toLowerCase()) {
      case 'high':
        return Icons.priority_high_rounded;
      case 'medium':
        return Icons.assignment_late_outlined;
      default:
        return Icons.hourglass_empty_outlined;
    }
  }

  Future<void> _uploadFocusedPolicy(Map<String, dynamic> policy) async {
    final title = policy['label']?.toString() ??
        _activeFocusLabel ??
        _activeFocusCategory ??
        'document';
    final category =
        policy['category']?.toString() ?? _activeFocusCategory ?? '';
    final selected = await _pickFile(title, category: category);
    if (selected == null) {
      return;
    }

    setState(() => _uploading = true);
    try {
      final result = await DocumentUploadService.execute<Map<String, dynamic>>(
        upload: () => DocumentUploadService.uploadDocument(
          title: title,
          entityType: _resolvedFocusEntityType ?? '',
          entityId: _resolvedFocusEntityId ?? '',
          category:
              (policy['category'] ?? _activeFocusCategory ?? '').toString(),
          file: selected,
        ),
        onUploaded: (_) => _reload(),
        successMessage: t('documentsUploaded', fallback: 'Document uploaded.'),
      );
      if (!mounted) return;
      DocumentExperience.showMessage(context, result.message);
    } finally {
      if (mounted) {
        setState(() => _uploading = false);
      }
    }
  }

  void _clearFocus() {
    setState(() {
      _activeFocusCategory = null;
      _activeFocusLabel = null;
    });
    DocumentFocusSession.clear(customer: _isCustomerRole);
  }

  void _focusPolicy(Map<String, dynamic> policy) {
    setState(() {
      _activeFocusCategory = policy['category']?.toString();
      _activeFocusLabel =
          policy['label']?.toString() ?? policy['category']?.toString();
    });
    DocumentFocusSession.write(
      customer: _isCustomerRole,
      category: _activeFocusCategory,
      label: _activeFocusLabel,
    );
  }

  void _focusDocument(Map<String, dynamic> doc) {
    setState(() {
      _activeFocusCategory = doc['category']?.toString();
      _activeFocusLabel =
          doc['categoryLabel']?.toString() ?? doc['category']?.toString();
    });
    DocumentFocusSession.write(
      customer: _isCustomerRole,
      category: _activeFocusCategory,
      label: _activeFocusLabel,
    );
  }

  Widget _buildPolicySection({
    required String title,
    required List<dynamic> policies,
    required List<dynamic> documents,
  }) {
    if (policies.isEmpty) {
      return const SizedBox.shrink();
    }

    final grouped = <String, List<Map<String, dynamic>>>{};
    final groupOrder = <String, int>{};
    for (final item in policies) {
      final policy = item as Map<String, dynamic>;
      final group = (policy['group'] ?? 'General').toString();
      grouped.putIfAbsent(group, () => []).add(policy);
      groupOrder[group] = (policy['groupOrder'] as num?)?.toInt() ?? 999;
    }
    final orderedGroups = grouped.keys.toList()
      ..sort((left, right) =>
          (groupOrder[left] ?? 999).compareTo(groupOrder[right] ?? 999));

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_hasFocusCategory) ...[
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F1FB),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFB9D2F0)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.my_library_books_outlined,
                        color: Color(0xFF15304A)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Focused document: ${_activeFocusLabel ?? _activeFocusCategory}',
                        style: const TextStyle(
                          color: Color(0xFF15304A),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    TextButton.icon(
                      onPressed: _clearFocus,
                      icon: const Icon(Icons.close_rounded, size: 16),
                      label: const Text('Clear'),
                    ),
                  ],
                ),
              ),
            ],
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            for (final group in orderedGroups) ...[
              Text(
                group,
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              ...grouped[group]!.map((policy) {
                final category = policy['category']?.toString();
                final priority = policy['priority']?.toString();
                final matching = documents
                    .where((doc) {
                      final map = doc as Map<String, dynamic>;
                      return map['category']?.toString() == category;
                    })
                    .cast<Map<String, dynamic>>()
                    .toList();
                final uploaded = matching.any((doc) {
                  final state = (doc['requirementState'] ?? doc['status'] ?? '')
                      .toString();
                  return state == 'uploaded' || state == 'available';
                });
                final accentColor = uploaded
                    ? const Color(0xFF0F9D58)
                    : _priorityColor(priority);
                return InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: _hasFocusCategory ? null : () => _focusPolicy(policy),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _priorityBackground(priority, uploaded),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: uploaded
                            ? const Color(0xFFB7E4C7)
                            : accentColor.withValues(alpha: 0.25),
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: accentColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            _policyIcon(priority, uploaded),
                            color: accentColor,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      policy['label']?.toString() ??
                                          category ??
                                          'Document requirement',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF102A43),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color:
                                          accentColor.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Text(
                                      uploaded
                                          ? 'Ready'
                                          : _priorityLabel(priority),
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: accentColor,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                uploaded
                                    ? 'Uploaded or available'
                                    : _hasFocusCategory
                                        ? 'Required before completion'
                                        : 'Tap to focus this document',
                                style: const TextStyle(
                                  color: Color(0xFF52606D),
                                  fontSize: 13,
                                ),
                              ),
                              if (_hasFocusCategory && !uploaded) ...[
                                const SizedBox(height: 10),
                                if (_hasFocusUploadTarget)
                                  FilledButton.tonalIcon(
                                    onPressed: _uploading
                                        ? null
                                        : () => _uploadFocusedPolicy(policy),
                                    icon:
                                        const Icon(Icons.upload_file_outlined),
                                    label: Text(_uploading
                                        ? 'Uploading...'
                                        : 'Upload now'),
                                  )
                                else
                                  const Text(
                                    'Upload target is not available yet for this focused document.',
                                    style: TextStyle(
                                      color: Color(0xFF52606D),
                                      fontSize: 12,
                                    ),
                                  ),
                              ],
                            ],
                          ),
                        ),
                        if (!_hasFocusCategory) ...[
                          const SizedBox(width: 8),
                          Icon(
                            Icons.chevron_right_rounded,
                            color: accentColor,
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }),
              if (group != orderedGroups.last) const SizedBox(height: 12),
            ],
          ],
        ),
      ),
    );
  }

  Future<SelectedUploadFile?> _pickFile(
    String title, {
    String category = '',
  }) async {
    final promptTitle = DocumentUploadContent.uploadTitle(category, title);
    final promptSubtitle = DocumentUploadContent.uploadGuidance(category);
    final allowedExtensions = DocumentUploadContent.allowedExtensions(category);
    return DocumentUploadService.pickFile(
      context,
      title: promptTitle,
      subtitle: promptSubtitle,
      allowedExtensions: allowedExtensions,
    );
  }

  Future<void> _previewRemoteDocument(Map<String, dynamic> doc) async {
    final id = doc['id']?.toString();
    if (id == null || id.isEmpty) {
      return;
    }

    final previewResult = await DocumentPreviewService.fetchPreview(
      id,
      fallbackMimeType: doc['mimeType']?.toString() ?? '',
    );
    if (!previewResult.isSuccess || previewResult.data == null) {
      if (!mounted) return;
      DocumentExperience.showMessage(context, previewResult.message);
      return;
    }

    if (!mounted) return;
    final preview = previewResult.data!;
    final downloadUrl = preview.downloadUrl;
    final mimeType = preview.mimeType;
    final isImage = preview.isImage;

    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(doc['title']?.toString() ?? 'Document'),
        content: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Status: ${doc['status'] ?? 'available'}'),
              const SizedBox(height: 6),
              Text('File: ${doc['fileName'] ?? 'Unknown'}'),
              const SizedBox(height: 6),
              Text(
                  'Category: ${doc['categoryLabel'] ?? doc['category'] ?? 'document'}'),
              const SizedBox(height: 6),
              Text('Created: ${_formatDate(doc['createdAt']?.toString())}'),
              const SizedBox(height: 16),
              if (downloadUrl.isEmpty)
                const Text(DocumentExperience.noDownloadUrlMessage)
              else if (isImage)
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    downloadUrl,
                    height: 260,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        DocumentExperience.imagePreviewFallbackMessage,
                      ),
                    ),
                  ),
                )
              else
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        mimeType == 'application/pdf'
                            ? Icons.picture_as_pdf_outlined
                            : Icons.insert_drive_file_outlined,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          DocumentExperience.previewOpenMessage(mimeType),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        actions: [
          if (downloadUrl.isNotEmpty)
            TextButton(
              onPressed: () async {
                final openResult =
                    await DocumentPreviewService.openRemoteUrl(downloadUrl);
                if (!context.mounted || openResult.isSuccess) return;
                DocumentExperience.showMessage(context, openResult.message);
              },
              child: const Text('Open'),
            ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Future<void> _uploadSelectedFile(Map<String, dynamic> doc) async {
    final selected = await _pickFile(
      doc['title']?.toString() ?? 'document',
      category: doc['category']?.toString() ?? '',
    );
    if (selected == null) return;

    setState(() => _uploading = true);
    try {
      final result = await DocumentUploadService.execute<Map<String, dynamic>>(
        upload: () => DocumentUploadService.uploadDocument(
          title: doc['title']?.toString() ?? 'document',
          entityType: doc['entityType']?.toString() ?? '',
          entityId: doc['entityId']?.toString() ?? '',
          category: doc['category']?.toString() ?? '',
          file: selected,
        ),
        onUploaded: (_) => _reload(),
        successMessage: t('documentsUploaded', fallback: 'Document uploaded.'),
      );
      if (!mounted) return;
      DocumentExperience.showMessage(context, result.message);
    } finally {
      if (mounted) {
        setState(() => _uploading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final role =
        (DriverSession.user?['mobileRole'] ?? DriverSession.user?['role'] ?? '')
            .toString();
    if (role == 'customer') {
      return FutureBuilder<Map<String, dynamic>?>(
        future: _customerWorkspaceFuture,
        builder: (context, snapshot) {
          final workspace = snapshot.data ?? <String, dynamic>{};
          final docs = _filteredDocuments(
              (workspace['documents'] as List<dynamic>?) ?? const []);
          final agreements =
              (workspace['agreements'] as List<dynamic>?) ?? const [];
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          return FutureBuilder<List<dynamic>>(
            future: _customerPolicyFuture,
            builder: (context, policySnapshot) {
              final policies =
                  _filteredPolicies(policySnapshot.data ?? const []);
              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildPolicySection(
                    title: 'Required customer documents',
                    policies: policies,
                    documents: docs,
                  ),
                  if (policies.isNotEmpty) const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Signed agreements',
                              style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 12),
                          if (agreements.isEmpty)
                            const Text(
                                DocumentExperience.emptyAgreementsMessage)
                          else
                            ...agreements.take(6).map((item) {
                              final agreement = item as Map<String, dynamic>;
                              return ListTile(
                                contentPadding: EdgeInsets.zero,
                                leading: const Icon(Icons.description_outlined),
                                title: Text(
                                    agreement['agreementCode']?.toString() ??
                                        'Agreement'),
                                subtitle: Text(
                                    (agreement['status'] ?? 'pending')
                                        .toString()
                                        .replaceAll('_', ' ')),
                                trailing: Text(agreement['signedPdfUrl'] == null
                                    ? 'Pending'
                                    : 'PDF'),
                              );
                            }),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Documents and receipts',
                              style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 12),
                          if (docs.isEmpty)
                            Text(DocumentExperience.documentsEmptyMessage(
                              focused: _hasFocusCategory,
                            ))
                          else
                            ...docs.take(12).map((item) {
                              final doc = item;
                              final canUpload = doc['mobileCanUpload'] == true;
                              final requirementState =
                                  (doc['requirementState'] ??
                                          doc['status'] ??
                                          'available')
                                      .toString();
                              return ListTile(
                                contentPadding: EdgeInsets.zero,
                                leading: const Icon(Icons.attach_file_outlined),
                                title: InkWell(
                                  borderRadius: BorderRadius.circular(8),
                                  onTap: _hasFocusCategory
                                      ? null
                                      : () => _focusDocument(doc),
                                  child: Padding(
                                    padding:
                                        const EdgeInsets.symmetric(vertical: 2),
                                    child: Text(
                                      doc['title']?.toString() ?? 'Document',
                                      style: TextStyle(
                                        color: _hasFocusCategory
                                            ? null
                                            : const Color(0xFF15304A),
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const SizedBox(height: 4),
                                    InkWell(
                                      borderRadius: BorderRadius.circular(8),
                                      onTap: _hasFocusCategory
                                          ? null
                                          : () => _focusDocument(doc),
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(
                                            vertical: 2),
                                        child: Text(
                                          '${doc['categoryLabel'] ?? doc['category'] ?? 'document'} · $requirementState',
                                          style: const TextStyle(
                                            color: Color(0xFF52606D),
                                          ),
                                        ),
                                      ),
                                    ),
                                    if (!_hasFocusCategory)
                                      const Padding(
                                        padding:
                                            EdgeInsets.only(top: 4, bottom: 2),
                                        child: Text(
                                          DocumentExperience.focusHintMessage,
                                          style: TextStyle(
                                            color: Color(0xFF7B8794),
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                    const SizedBox(height: 8),
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      crossAxisAlignment:
                                          WrapCrossAlignment.center,
                                      children: [
                                        TextButton(
                                          onPressed: () =>
                                              _previewRemoteDocument(doc),
                                          child: const Text('Preview'),
                                        ),
                                        if (canUpload)
                                          FilledButton(
                                            onPressed: _uploading
                                                ? null
                                                : () =>
                                                    _uploadSelectedFile(doc),
                                            child: Text(_uploading
                                                ? 'Uploading...'
                                                : 'Upload'),
                                          )
                                        else
                                          Text(
                                            _formatDate(
                                                doc['createdAt']?.toString()),
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodySmall,
                                          ),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            }),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          );
        },
      );
    }

    return FutureBuilder<List<dynamic>>(
      future: _documentsFuture,
      builder: (context, snapshot) {
        final docs = _filteredDocuments(snapshot.data ?? []);
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        return FutureBuilder<List<dynamic>>(
          future: _driverPolicyFuture,
          builder: (context, policySnapshot) {
            final focusedPolicies = _filteredPolicies(
              policySnapshot.data ?? const [],
            );
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildPolicySection(
                  title: 'Required driver documents',
                  policies: focusedPolicies,
                  documents: docs,
                ),
                if (focusedPolicies.isNotEmpty) const SizedBox(height: 16),
                if (docs.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      child: Text(
                        _hasFocusCategory
                            ? DocumentExperience.documentsEmptyMessage(
                                focused: true,
                              )
                            : t('noDocuments',
                                fallback:
                                    DocumentExperience.emptyDocumentsMessage),
                      ),
                    ),
                  )
                else
                  ...docs.map((item) {
                    final doc = item;
                    final canUpload = doc['mobileCanUpload'] == true;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Card(
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          leading: const Icon(Icons.description_outlined),
                          title: InkWell(
                            borderRadius: BorderRadius.circular(8),
                            onTap: _hasFocusCategory
                                ? null
                                : () => _focusDocument(doc),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 2),
                              child: Text(
                                '${doc['title']}',
                                style: TextStyle(
                                  color: _hasFocusCategory
                                      ? null
                                      : const Color(0xFF15304A),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                          subtitle: Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                InkWell(
                                  borderRadius: BorderRadius.circular(8),
                                  onTap: _hasFocusCategory
                                      ? null
                                      : () => _focusDocument(doc),
                                  child: Padding(
                                    padding:
                                        const EdgeInsets.symmetric(vertical: 2),
                                    child: Text(
                                      '${doc['categoryLabel'] ?? doc['category'] ?? 'document'} · ${doc['status']}',
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    TextButton(
                                      onPressed: () =>
                                          _previewRemoteDocument(doc),
                                      child: const Text('Preview'),
                                    ),
                                    if (canUpload)
                                      FilledButton(
                                        onPressed: _uploading
                                            ? null
                                            : () => _uploadSelectedFile(doc),
                                        child: Text(_uploading
                                            ? 'Uploading...'
                                            : 'Upload'),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
              ],
            );
          },
        );
      },
    );
  }
}

String _formatDate(String? value) {
  if (value == null || value.isEmpty) return 'Pending';
  final parsed = DateTime.tryParse(value);
  if (parsed == null) return value;
  return '${parsed.year}-${parsed.month.toString().padLeft(2, '0')}-${parsed.day.toString().padLeft(2, '0')}';
}
