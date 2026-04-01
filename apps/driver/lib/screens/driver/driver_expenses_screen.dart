import 'package:flutter/material.dart';

import '../../services/document_upload_content.dart';
import '../../services/document_upload_service.dart';
import '../../services/driver_api.dart';

const List<String> _expenseCategories = <String>[
  'fuel',
  'road_fee',
  'parking',
  'allowance',
  'customs_related_payment',
  'port_charge',
  'emergency_maintenance',
  'other',
];

class DriverExpensesScreen extends StatefulWidget {
  const DriverExpensesScreen({super.key});

  @override
  State<DriverExpensesScreen> createState() => _DriverExpensesScreenState();
}

class _DriverExpensesScreenState extends State<DriverExpensesScreen> {
  bool _loading = true;
  bool _submitting = false;
  String _message = '';
  String _category = _expenseCategories.first;
  String _currency = 'ETB';
  String _paidDate = DateTime.now().toIso8601String().split('T').first;
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _locationController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();
  Map<String, dynamic>? _transitPack;
  Map<String, dynamic>? _workspace;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _amountController.dispose();
    _locationController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _message = '';
    });
    try {
      final transitPack = await DriverApi.fetchCorridorDriverTransitPack();
      final shipmentRef = (transitPack?['bookingNumber'] ??
              transitPack?['shipmentRef'] ??
              transitPack?['tripId'])
          ?.toString();
      Map<String, dynamic>? workspace;
      if (shipmentRef != null && shipmentRef.isNotEmpty) {
        workspace = await DriverApi.fetchImportSettlementWorkspace(shipmentRef);
      }
      if (!mounted) return;
      setState(() {
        _transitPack = transitPack;
        _workspace = workspace;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _message = 'Unable to load driver reimbursement workflow right now.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _submitClaim() async {
    final shipmentRef = (_transitPack?['bookingNumber'] ??
            _transitPack?['shipmentRef'] ??
            _workspace?['shipment']?['bookingNumber'])
        ?.toString();
    if (_submitting ||
        shipmentRef == null ||
        shipmentRef.isEmpty ||
        _amountController.text.trim().isEmpty) {
      return;
    }
    final selected = await DocumentUploadService.pickFile(
      context,
      title: DocumentUploadContent.uploadTitle(
        'expense_receipt',
        'Driver expense receipt',
      ),
      subtitle: DocumentUploadContent.uploadGuidance('expense_receipt'),
      allowedExtensions:
          DocumentUploadContent.allowedExtensions('expense_receipt'),
    );
    if (selected == null) return;

    setState(() {
      _submitting = true;
      _message = '';
    });
    try {
      final upload = await DocumentUploadService.uploadDocument(
        title: 'Driver expense | $shipmentRef | $_category',
        entityType: 'trip',
        entityId: (_transitPack?['tripId'] ?? shipmentRef).toString(),
        category: 'expense_receipt',
        file: selected,
      );
      await DriverApi.createDriverExpenseClaim(shipmentRef, {
        'tripId': (_transitPack?['tripId'] ?? '').toString(),
        'items': [
          {
            'category': _category,
            'amount': double.tryParse(_amountController.text.trim()) ?? 0,
            'currency': _currency,
            'paidDate': _paidDate,
            'location': _locationController.text.trim(),
            'receiptFileUrl': upload['fileUrl'],
            'receiptDocumentId': upload['id'],
            'notes': _notesController.text.trim(),
          }
        ],
      });
      _amountController.clear();
      _locationController.clear();
      _notesController.clear();
      _currency = 'ETB';
      _category = _expenseCategories.first;
      _paidDate = DateTime.now().toIso8601String().split('T').first;
      await _load();
      if (!mounted) return;
      setState(() {
        _message =
            'Expense claim submitted. Finance will review and post reimbursement status here.';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _message = 'Expense claim submission failed. Try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    final shipment = _workspace?['shipment'] as Map<String, dynamic>?;
    final claims =
        (_workspace?['driverExpenseClaims'] as List<dynamic>? ?? const [])
            .cast<Map<String, dynamic>>();
    final reimbursedClaims = claims
        .where((claim) => (claim['reimbursement'] as Map<String, dynamic>?) != null)
        .toList();

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Driver expenses and reimbursement',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    shipment == null
                        ? 'Submit out-of-pocket trip payments and track finance reimbursement.'
                        : '${shipment['bookingNumber'] ?? shipment['shipmentId']} · ${shipment['financeStatus'] ?? 'finance workflow'}',
                    style: const TextStyle(color: Color(0xFF5B677A)),
                  ),
                  if (_message.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      _message,
                      style: TextStyle(
                        color: _message.toLowerCase().contains('failed')
                            ? const Color(0xFFB42318)
                            : const Color(0xFF0F766E),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'New expense claim',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _category,
                    decoration: const InputDecoration(
                      labelText: 'Category',
                      border: OutlineInputBorder(),
                    ),
                    items: _expenseCategories
                        .map(
                          (category) => DropdownMenuItem<String>(
                            value: category,
                            child: Text(category.replaceAll('_', ' ')),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      if (value == null) return;
                      setState(() => _category = value);
                    },
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _amountController,
                          keyboardType: const TextInputType.numberWithOptions(
                              decimal: true),
                          decoration: const InputDecoration(
                            labelText: 'Amount',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _currency,
                          decoration: const InputDecoration(
                            labelText: 'Currency',
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'ETB', child: Text('ETB')),
                            DropdownMenuItem(value: 'USD', child: Text('USD')),
                          ],
                          onChanged: (value) {
                            if (value == null) return;
                            setState(() => _currency = value);
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _locationController,
                          decoration: const InputDecoration(
                            labelText: 'Location',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: InputDecorator(
                          decoration: const InputDecoration(
                              labelText: 'Paid date',
                              border: OutlineInputBorder()),
                          child: Text(_paidDate),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _notesController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Notes',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _submitting || shipment == null ? null : _submitClaim,
                    child: Text(_submitting
                        ? 'Submitting...'
                        : 'Upload receipt and submit claim'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'My expense claims',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  if (claims.isEmpty)
                    const Text(
                      'No expense claim has been submitted for the current shipment yet.',
                      style: TextStyle(color: Color(0xFF5B677A)),
                    )
                  else
                    ...claims.map((claim) {
                      final reimbursement =
                          claim['reimbursement'] as Map<String, dynamic>?;
                      final items = (claim['items'] as List<dynamic>? ?? const [])
                          .cast<Map<String, dynamic>>();
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: const Color(0xFFD7E0EB)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${claim['tripId'] ?? 'Trip claim'} · ${claim['status'] ?? 'submitted'}',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800, fontSize: 15),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Claimed ${claim['totalClaimed'] ?? 0} | Approved ${claim['totalApproved'] ?? 0}',
                              style:
                                  const TextStyle(color: Color(0xFF5B677A)),
                            ),
                            if ((claim['financeNote'] ?? '').toString().isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text(
                                  claim['financeNote'].toString(),
                                  style: const TextStyle(
                                      color: Color(0xFF16324D),
                                      fontWeight: FontWeight.w600),
                                ),
                              ),
                            const SizedBox(height: 8),
                            ...items.map(
                              (item) => Padding(
                                padding: const EdgeInsets.only(bottom: 4),
                                child: Text(
                                  '${item['category']} · ${item['amount']} ${item['currency']} · ${item['status']}',
                                  style: const TextStyle(
                                      color: Color(0xFF5B677A)),
                                ),
                              ),
                            ),
                            if (reimbursement != null) ...[
                              const SizedBox(height: 8),
                              Text(
                                'Reimbursed ${reimbursement['amountPaid'] ?? 0} on ${reimbursement['paidAt'] ?? 'pending'} via ${reimbursement['method'] ?? 'bank transfer'}',
                                style: const TextStyle(
                                  color: Color(0xFF0F766E),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Reimbursement history',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  if (reimbursedClaims.isEmpty)
                    const Text(
                      'Approved reimbursements will appear here after finance pays the claim.',
                      style: TextStyle(color: Color(0xFF5B677A)),
                    )
                  else
                    ...reimbursedClaims.map((claim) {
                      final reimbursement =
                          claim['reimbursement'] as Map<String, dynamic>?;
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          'Trip ${claim['tripId'] ?? '-'} · ${reimbursement?['amountPaid'] ?? 0}',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        subtitle: Text(
                          'Status ${reimbursement?['status'] ?? 'pending'} · Ref ${reimbursement?['referenceNo'] ?? '-'}',
                        ),
                      );
                    }),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
