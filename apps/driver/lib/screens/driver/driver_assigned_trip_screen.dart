import 'dart:async';

import 'package:flutter/material.dart';

import '../../services/assigned_driver_trip_service.dart';
import '../../services/document_upload_content.dart';
import '../../services/document_upload_service.dart';
import '../../services/driver_api.dart';
import '../../services/logistics_demo_data.dart' show DriverTrip;

class DriverAssignedTripScreen extends StatefulWidget {
  const DriverAssignedTripScreen({super.key});

  @override
  State<DriverAssignedTripScreen> createState() =>
      _DriverAssignedTripScreenState();
}

class _DriverAssignedTripScreenState extends State<DriverAssignedTripScreen> {
  late Future<DriverTrip> _tripFuture;
  bool _submitting = false;
  bool _uploadingExpense = false;
  bool _liveLocationSyncing = false;
  bool _liveLocationEnabled = true;
  String _message = '';
  String _expenseMessage = '';
  String _liveLocationMessage = '';
  Timer? _liveLocationTimer;
  String _liveTrackingTripId = '';
  DateTime? _lastLiveLocationSyncAt;
  _DriverLivePoint? _lastLivePoint;
  int _liveRouteStep = 0;
  final TextEditingController _expenseAmountController =
      TextEditingController();
  final TextEditingController _expenseNoteController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tripFuture = AssignedDriverTripService.loadAssignedTrip();
  }

  @override
  void dispose() {
    _liveLocationTimer?.cancel();
    _expenseAmountController.dispose();
    _expenseNoteController.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    final nextTrip = await AssignedDriverTripService.loadAssignedTrip();
    if (!mounted) return;
    setState(() {
      _tripFuture = Future.value(nextTrip);
    });
  }

  Future<void> _runTripAction(DriverTrip trip, String action) async {
    if (_submitting || trip.tripId == 'UNASSIGNED') return;
    setState(() {
      _submitting = true;
      _message = '';
    });
    try {
      await DriverApi.performCorridorTripAction(
        tripId: trip.tripId,
        action: action,
      );
      await _reload();
      if (!mounted) return;
      setState(() {
        _message = 'Trip action synced successfully.';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _message = 'Trip action failed. Try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  List<_DriverLivePoint> _buildLiveRoutePoints(DriverTrip trip) {
    final destination = trip.destination.toLowerCase();
    if (destination.contains('addis') || destination.contains('kality')) {
      return const [
        _DriverLivePoint(
          label: 'Djibouti Port Gate',
          latitude: 11.5721,
          longitude: 43.1456,
          speed: 0,
        ),
        _DriverLivePoint(
          label: 'Ali Sabieh corridor',
          latitude: 11.1558,
          longitude: 42.7124,
          speed: 38,
        ),
        _DriverLivePoint(
          label: 'Galafi border',
          latitude: 9.5931,
          longitude: 41.8661,
          speed: 27,
        ),
        _DriverLivePoint(
          label: 'Awash corridor',
          latitude: 8.9830,
          longitude: 40.1700,
          speed: 56,
        ),
        _DriverLivePoint(
          label: 'Addis corridor entry',
          latitude: 8.9806,
          longitude: 38.7578,
          speed: 34,
        ),
      ];
    }
    return const [
      _DriverLivePoint(
        label: 'Djibouti Port Gate',
        latitude: 11.5721,
        longitude: 43.1456,
        speed: 0,
      ),
      _DriverLivePoint(
        label: 'Ali Sabieh corridor',
        latitude: 11.1558,
        longitude: 42.7124,
        speed: 36,
      ),
      _DriverLivePoint(
        label: 'Galafi border',
        latitude: 9.5931,
        longitude: 41.8661,
        speed: 24,
      ),
      _DriverLivePoint(
        label: 'Awash corridor',
        latitude: 8.9830,
        longitude: 40.1700,
        speed: 58,
      ),
      _DriverLivePoint(
        label: 'Adama Dry Port approach',
        latitude: 8.5408,
        longitude: 39.2716,
        speed: 30,
      ),
    ];
  }

  Future<void> _sendLiveLocationUpdate(DriverTrip trip) async {
    if (!_liveLocationEnabled ||
        _liveLocationSyncing ||
        trip.tripId == 'UNASSIGNED' ||
        trip.truckPlate.trim().isEmpty ||
        trip.truckPlate == 'Pending truck') {
      return;
    }

    final routePoints = _buildLiveRoutePoints(trip);
    final point = routePoints[_liveRouteStep % routePoints.length];

    setState(() {
      _liveLocationSyncing = true;
    });

    try {
      await DriverApi.submitLiveGpsPoint(
        vehicleId: trip.truckPlate,
        tripId: trip.tripId,
        latitude: point.latitude,
        longitude: point.longitude,
        speed: point.speed,
        accuracy: 8,
      );
      if (!mounted) return;
      setState(() {
        _lastLivePoint = point;
        _lastLiveLocationSyncAt = DateTime.now();
        _liveLocationMessage = 'Live location synced from ${point.label}.';
        _liveRouteStep = (_liveRouteStep + 1) % routePoints.length;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _liveLocationMessage = 'Live location sync failed. Try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _liveLocationSyncing = false;
        });
      }
    }
  }

  void _ensureLiveLocationSync(DriverTrip trip) {
    if (!_liveLocationEnabled || trip.tripId == 'UNASSIGNED') {
      _liveLocationTimer?.cancel();
      _liveTrackingTripId = '';
      return;
    }
    if (_liveTrackingTripId == trip.tripId &&
        _liveLocationTimer?.isActive == true) {
      return;
    }
    _liveLocationTimer?.cancel();
    _liveTrackingTripId = trip.tripId;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        unawaited(_sendLiveLocationUpdate(trip));
      }
    });
    _liveLocationTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      if (!mounted) return;
      unawaited(_sendLiveLocationUpdate(trip));
    });
  }

  Future<void> _uploadExpenseClaim(
    DriverTrip trip, {
    required String category,
    required String title,
  }) async {
    if (_uploadingExpense || trip.tripId == 'UNASSIGNED') return;
    final selected = await DocumentUploadService.pickFile(
      context,
      title: DocumentUploadContent.uploadTitle(category, title),
      subtitle: DocumentUploadContent.uploadGuidance(category),
      allowedExtensions: DocumentUploadContent.allowedExtensions(category),
    );
    if (selected == null) return;
    setState(() {
      _uploadingExpense = true;
      _expenseMessage = '';
    });
    try {
      final amountText = _expenseAmountController.text.trim();
      final noteText = _expenseNoteController.text.trim();
      final detailParts = <String>[
        trip.tripId,
        trip.bookingNumber,
        if (amountText.isNotEmpty) 'Amount $amountText',
        if (noteText.isNotEmpty) noteText,
      ];
      final result = await DocumentUploadService.execute<Map<String, dynamic>>(
        upload: () => DocumentUploadService.uploadDocument(
          title: '$title | ${detailParts.join(' | ')}',
          entityType: 'trip',
          entityId: trip.tripId,
          category: category,
          file: selected,
        ),
        successMessage: category == 'empty_return_interchange'
            ? 'Empty return interchange uploaded for finance review.'
            : 'Expense receipt uploaded and routed to finance for refund review.',
      );
      if (!mounted) return;
      setState(() {
        _expenseMessage = result.message;
        if (result.isSuccess && category != 'empty_return_interchange') {
          _expenseAmountController.clear();
          _expenseNoteController.clear();
        }
      });
    } finally {
      if (mounted) {
        setState(() {
          _uploadingExpense = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<DriverTrip>(
      future: _tripFuture,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final trip = snapshot.data!;
        if (trip.tripId == 'UNASSIGNED') {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'No active trip is assigned right now. Dispatch will push the next live trip when it is ready.',
                textAlign: TextAlign.center,
              ),
            ),
          );
        }
        final external = trip.driverType.toLowerCase().contains('external');
        final arrived = trip.inlandArrivalConfirmed;
        final unloaded = trip.unloadCompleted;
        final emptyRelease = trip.emptyReleased;
        final emptyReturnStarted = trip.emptyReturnStarted;
        final emptyReturned = trip.emptyReturned;
        _ensureLiveLocationSync(trip);
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'Tier-1 mobile sync',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Expense receipts auto-link to the shipment, flow into finance review, and appear in pending reimbursement tracking without manual matching.',
                      style: TextStyle(color: Color(0xFF5B677A)),
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
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Live location from driver app',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        Switch(
                          value: _liveLocationEnabled,
                          onChanged: (value) {
                            setState(() {
                              _liveLocationEnabled = value;
                              _liveLocationMessage = value
                                  ? 'Live location sharing enabled.'
                                  : 'Live location sharing paused.';
                            });
                            if (value) {
                              _ensureLiveLocationSync(trip);
                            } else {
                              _liveLocationTimer?.cancel();
                            }
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _lastLivePoint == null
                          ? 'Driver app will keep sending live corridor location updates for this trip.'
                          : 'Latest live point: ${_lastLivePoint!.label}',
                      style: const TextStyle(color: Color(0xFF5B677A)),
                    ),
                    const SizedBox(height: 12),
                    _InfoRow(
                      label: 'Last app sync',
                      value: _lastLiveLocationSyncAt == null
                          ? 'Pending'
                          : _lastLiveLocationSyncAt!.toLocal().toString(),
                    ),
                    _InfoRow(
                      label: 'Coordinates',
                      value: _lastLivePoint == null
                          ? 'Pending'
                          : '${_lastLivePoint!.latitude.toStringAsFixed(4)}, ${_lastLivePoint!.longitude.toStringAsFixed(4)}',
                    ),
                    _InfoRow(
                      label: 'Speed',
                      value: _lastLivePoint == null
                          ? 'Pending'
                          : '${_lastLivePoint!.speed.toStringAsFixed(0)} km/h',
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _liveLocationSyncing
                            ? null
                            : () => _sendLiveLocationUpdate(trip),
                        icon: const Icon(Icons.gps_fixed),
                        label: Text(
                          _liveLocationSyncing
                              ? 'Syncing live location...'
                              : 'Send live location now',
                        ),
                      ),
                    ),
                    if (_liveLocationMessage.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(
                        _liveLocationMessage,
                        style: const TextStyle(color: Color(0xFF2F6FED)),
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
                      'Driver packet documents',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Dispatch must push, print, or download the full packet before departure. T1, BL, invoice, packing list, release note, container, and seal must travel with the driver.',
                      style: TextStyle(color: Color(0xFF5B677A)),
                    ),
                    const SizedBox(height: 14),
                    ...trip.documents.map(
                      (document) => _DocumentRow(
                        type: document.type,
                        reference: document.reference,
                        status: document.status,
                      ),
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
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            trip.tripId,
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        if (external)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF5F7FB),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Text(
                              'External Driver',
                              style: TextStyle(
                                  fontSize: 11, fontWeight: FontWeight.w700),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _InfoRow(label: 'Booking', value: trip.bookingNumber),
                    _InfoRow(label: 'Customer', value: trip.customer),
                    _InfoRow(label: 'Route', value: trip.route),
                    _InfoRow(label: 'Container', value: trip.containerNumber),
                    _InfoRow(label: 'Seal', value: trip.sealNumber),
                    _InfoRow(label: 'Current stage', value: trip.currentStage),
                    _InfoRow(label: 'ETA', value: trip.etaSummary),
                    _InfoRow(label: 'Dispatch note', value: trip.dispatchNote),
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
                      'Arrival and closure',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Only actions relevant to the trip stage are enabled.',
                      style: TextStyle(color: Color(0xFF5B677A)),
                    ),
                    const SizedBox(height: 16),
                    _ActionRow(
                      label: 'Confirm arrival',
                      complete: arrived,
                      onPressed: _submitting
                          ? null
                          : () => _runTripAction(trip, 'confirm_arrival'),
                    ),
                    _ActionRow(
                      label: 'Confirm unload complete',
                      complete: unloaded,
                      onPressed: arrived && !_submitting
                          ? () => _runTripAction(trip, 'confirm_unload')
                          : null,
                    ),
                    _ActionRow(
                      label: 'Confirm empty release received',
                      complete: emptyRelease,
                      onPressed: unloaded && !_submitting
                          ? () => _runTripAction(trip, 'mark_empty_released')
                          : null,
                    ),
                    _ActionRow(
                      label: 'Confirm empty return started',
                      complete: emptyReturnStarted,
                      onPressed: emptyRelease && !_submitting
                          ? () => _runTripAction(trip, 'start_empty_return')
                          : null,
                    ),
                    _ActionRow(
                      label: 'Confirm empty returned',
                      complete: emptyReturned,
                      onPressed: emptyReturnStarted && !_submitting
                          ? () => _runTripAction(trip, 'confirm_empty_return')
                          : null,
                    ),
                    if (_message.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        _message,
                        style: TextStyle(
                          color: _message.contains('failed')
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
                      'Expense refund and Djibouti return',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Driver must upload every trip expense from the phone app. Add the amount and note, then upload each receipt one by one so finance can verify all reimbursements. Upload the Djibouti empty return interchange here as well.',
                      style: TextStyle(color: Color(0xFF5B677A)),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF7E8),
                        borderRadius: BorderRadius.circular(14),
                        border:
                            Border.all(color: const Color(0xFFF5C96A)),
                      ),
                      child: const Text(
                        'Next step: upload all driver expenses on this assigned-trip page. Repeat "Upload expense receipt" until every receipt and paid cost is submitted.',
                        style: TextStyle(
                          color: Color(0xFF8A4B00),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _expenseAmountController,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Expense amount',
                        hintText: 'ETB 2,500 or USD 45',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _expenseNoteController,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Expense note',
                        hintText:
                            'Depot fee, escort fee, customs fee, fuel advance, or other paid amount',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        FilledButton.tonal(
                          onPressed: _uploadingExpense
                              ? null
                              : () => _uploadExpenseClaim(
                                    trip,
                                    category: 'expense_receipt',
                                    title: 'Driver expense reimbursement claim',
                                  ),
                          child: const Text('Upload expense receipt'),
                        ),
                        FilledButton.tonal(
                          onPressed: _uploadingExpense
                              ? null
                              : () => _uploadExpenseClaim(
                                    trip,
                                    category: 'empty_return_interchange',
                                    title: 'Djibouti empty return interchange',
                                  ),
                          child: const Text('Upload empty return interchange'),
                        ),
                      ],
                    ),
                    if (_expenseMessage.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(
                        _expenseMessage,
                        style: TextStyle(
                          color:
                              _expenseMessage.toLowerCase().contains('unable')
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
          ],
        );
      },
    );
  }
}

class _DriverLivePoint {
  const _DriverLivePoint({
    required this.label,
    required this.latitude,
    required this.longitude,
    required this.speed,
  });

  final String label;
  final double latitude;
  final double longitude;
  final double speed;
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 108,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: Color(0xFF5B677A),
              ),
            ),
          ),
          Expanded(
              child: Text(value,
                  style: const TextStyle(fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.label,
    required this.complete,
    required this.onPressed,
  });

  final String label;
  final bool complete;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Expanded(
            child: Text(label,
                style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
          FilledButton.tonal(
            onPressed: complete ? null : onPressed,
            child: Text(complete ? 'Done' : 'Confirm'),
          ),
        ],
      ),
    );
  }
}

class _DocumentRow extends StatelessWidget {
  const _DocumentRow({
    required this.type,
    required this.reference,
    required this.status,
  });

  final String type;
  final String reference;
  final String status;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFD7DFEA)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.description_outlined, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  type,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  reference.isEmpty ? 'Reference pending' : reference,
                  style: const TextStyle(color: Color(0xFF5B677A)),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text(
            status,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: Color(0xFF0F766E),
            ),
          ),
        ],
      ),
    );
  }
}
