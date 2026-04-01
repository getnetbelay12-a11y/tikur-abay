import 'package:flutter/material.dart';

import '../../services/customer_corridor_service.dart';

class CustomerDocumentsHubScreen extends StatefulWidget {
  const CustomerDocumentsHubScreen({super.key});

  @override
  State<CustomerDocumentsHubScreen> createState() =>
      _CustomerDocumentsHubScreenState();
}

class _CustomerDocumentsHubScreenState
    extends State<CustomerDocumentsHubScreen> {
  late Future<List<CustomerLiveShipment>> _shipmentsFuture;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _shipmentsFuture = CustomerCorridorService.loadShipments();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<CustomerLiveShipment>>(
      future: _shipmentsFuture,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final documents = snapshot.data!
            .expand((shipment) => shipment.shipment.documents.map((document) => {
                  'shipmentRef': shipment.shipment.bookingNumber,
                  'type': document.type,
                  'reference': document.reference,
                  'date': document.date,
                  'status': document.status,
                }))
            .where((row) => _filter == 'all' || row['type'] == _filter)
            .toList();
        final filters = <String>{
          'all',
          ...documents.map((row) => row['type'] ?? 'Document'),
        }.toList();

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Verified document hub',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            const Text(
              'Shipment-linked files with live status, versions, and customer visibility.',
              style: TextStyle(color: Color(0xFF5B677A)),
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: filters
                  .map(
                    (value) => ChoiceChip(
                      label: Text(value == 'all' ? 'All' : value),
                      selected: _filter == value,
                      onSelected: (_) => setState(() => _filter = value),
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 16),
            ...documents.map(
              (entry) => Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  title: Text(
                    '${entry['type']} · ${entry['reference']}',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  subtitle: Text(
                    '${entry['shipmentRef']} · ${entry['date']}',
                    style: const TextStyle(height: 1.35),
                  ),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${entry['status']}',
                        style: TextStyle(
                          color: '${entry['status']}'.toLowerCase() == 'verified'
                              ? const Color(0xFF0F766E)
                              : const Color(0xFFB7791F),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text('Live',
                          style: TextStyle(fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
