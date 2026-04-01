import 'package:flutter/material.dart';

import '../../services/assigned_driver_trip_service.dart';
import '../../services/logistics_demo_data.dart' show DriverTrip;
import 'driver_transit_documents_screen.dart';
import 'driver_transit_item_details_screen.dart';

class DriverTransitPackScreen extends StatefulWidget {
  const DriverTransitPackScreen({super.key});

  @override
  State<DriverTransitPackScreen> createState() =>
      _DriverTransitPackScreenState();
}

class _DriverTransitPackScreenState extends State<DriverTransitPackScreen> {
  bool _sealConfirmed = false;
  late Future<DriverTrip> _tripFuture;

  @override
  void initState() {
    super.initState();
    _tripFuture = AssignedDriverTripService.loadAssignedTrip();
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
                'No transit pack is available because no live trip is assigned yet.',
                textAlign: TextAlign.center,
              ),
            ),
          );
        }
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF16324D),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Transit Pack',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.74),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    trip.tripId,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${trip.customer} · ${trip.route}',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.82),
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  children: [
                    _FactRow(label: 'Booking', value: trip.bookingNumber),
                    _FactRow(label: 'BL', value: trip.blNumber),
                    _FactRow(label: 'Container', value: trip.containerNumber),
                    _FactRow(label: 'Seal', value: trip.sealNumber),
                    _FactRow(label: 'Truck plate', value: trip.truckPlate),
                    _FactRow(label: 'Trailer plate', value: trip.trailerPlate),
                    _FactRow(label: 'Driver', value: trip.driverName),
                    _FactRow(label: 'Route', value: trip.route),
                    _FactRow(label: 'Current status', value: trip.tripStatus),
                    _FactRow(
                      label: 'Transit / customs',
                      value:
                          '${trip.transitDocumentType} · ${trip.transitDocumentNumber}',
                    ),
                    _FactRow(label: 'Item count', value: '${trip.itemCount}'),
                    _FactRow(
                        label: 'Total packages',
                        value: '${trip.totalPackages}'),
                    _FactRow(
                        label: 'Gross weight',
                        value: '${trip.totalWeightKg} kg'),
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
                      'Border / customs packet',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Carry the T1 transit document together with BL, packing list, and invoice summary at Djibouti customs and all border checkpoints.',
                      style: TextStyle(color: Color(0xFF5B677A), height: 1.4),
                    ),
                    const SizedBox(height: 14),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF7FAFC),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: const Color(0xFFDCE4EE)),
                      ),
                      child: Column(
                        children: [
                          _FactRow(
                              label: 'T1 document',
                              value:
                                  '${trip.transitDocumentType} · ${trip.transitDocumentNumber}'),
                          _FactRow(
                              label: 'Customs state',
                              value: trip.customsStatus),
                          _FactRow(
                              label: 'Commercial invoice',
                              value: trip.invoiceNumber),
                          _FactRow(
                              label: 'Packing list',
                              value: trip.packingListNumber),
                          _FactRow(
                              label: 'Transport document',
                              value: trip.blNumber),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFFAF0),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: const Color(0xFFECC94B)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Vehicle details for customs and border checks',
                            style: TextStyle(
                                fontSize: 14, fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 10),
                          _FactRow(
                              label: 'Truck plate', value: trip.truckPlate),
                          _FactRow(
                              label: 'Trailer plate', value: trip.trailerPlate),
                          _FactRow(
                              label: 'Driver name', value: trip.driverName),
                          _FactRow(
                              label: 'Driver type', value: trip.driverType),
                          _FactRow(
                              label: 'Carrier / partner',
                              value: trip.partnerName),
                        ],
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
                    const Text(
                      'QR presentation',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF7FAFC),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: const Color(0xFFDCE4EE)),
                      ),
                      child: Column(
                        children: [
                          const Icon(Icons.qr_code_2_rounded,
                              size: 112, color: Color(0xFF16324D)),
                          const SizedBox(height: 10),
                          Text(
                            trip.transitDocumentNumber,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            trip.customsStatus,
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Color(0xFF5B677A)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        FilledButton.tonal(
                          onPressed: () => Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => DriverTransitItemDetailsScreen(
                                  items: trip.items),
                            ),
                          ),
                          child: const Text('Show item details'),
                        ),
                        FilledButton.tonal(
                          onPressed: () => Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) =>
                                  const DriverTransitDocumentsScreen(),
                            ),
                          ),
                          child: const Text('View documents'),
                        ),
                        FilledButton(
                          onPressed: () =>
                              setState(() => _sealConfirmed = true),
                          child: Text(_sealConfirmed
                              ? 'Seal confirmed'
                              : 'Confirm seal intact'),
                        ),
                        FilledButton.tonal(
                          onPressed: () =>
                              ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                  'Open the Checkpoints tab to submit the next update.'),
                            ),
                          ),
                          child: const Text('Submit checkpoint update'),
                        ),
                      ],
                    ),
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

class _FactRow extends StatelessWidget {
  const _FactRow({required this.label, required this.value});

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
            width: 118,
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
