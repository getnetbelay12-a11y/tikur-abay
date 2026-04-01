import 'package:flutter/material.dart';

import '../../services/assigned_driver_trip_service.dart';
import '../../services/logistics_demo_data.dart' show DriverTrip;

class DriverTransitDocumentsScreen extends StatelessWidget {
  const DriverTransitDocumentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: Navigator.of(context).canPop()
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded),
                onPressed: () => Navigator.of(context).pop(),
              )
            : null,
        title: const Text('Transit documents'),
      ),
      body: FutureBuilder<DriverTrip>(
        future: AssignedDriverTripService.loadAssignedTrip(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final trip = snapshot.data!;
          return ListView(
        padding: const EdgeInsets.all(16),
        children: [
        Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            title: const Text('T1 transit document',
                style: TextStyle(fontWeight: FontWeight.w800)),
            subtitle: Text('${trip.transitDocumentNumber} · Ready'),
            trailing: FilledButton.tonal(
              onPressed: () => _showPreview(
                context,
                'T1 transit document',
                'Border and customs transit clearance reference:\n${trip.transitDocumentType} · ${trip.transitDocumentNumber}',
              ),
              child: const Text('View'),
            ),
          ),
        ),
        Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            title: const Text('Commercial invoice',
                style: TextStyle(fontWeight: FontWeight.w800)),
            subtitle: Text('${trip.invoiceNumber} · Ready'),
            trailing: FilledButton.tonal(
              onPressed: () => _showPreview(
                context,
                'Commercial invoice',
                'Commercial invoice reference for customs validation:\n${trip.invoiceNumber}',
              ),
              child: const Text('View'),
            ),
          ),
        ),
        Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            title: const Text('Packing list',
                style: TextStyle(fontWeight: FontWeight.w800)),
            subtitle: Text('${trip.packingListNumber} · Ready'),
            trailing: FilledButton.tonal(
              onPressed: () => _showPreview(
                context,
                'Packing list',
                'Packing list reference for cargo inspection:\n${trip.packingListNumber}',
              ),
              child: const Text('View'),
            ),
          ),
        ),
        Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            title: const Text('Transport document',
                style: TextStyle(fontWeight: FontWeight.w800)),
            subtitle: Text('${trip.blNumber} · Ready'),
            trailing: FilledButton.tonal(
              onPressed: () => _showPreview(
                context,
                'Transport document',
                'Transport document / BL reference for checkpoint review:\n${trip.blNumber}',
              ),
              child: const Text('View'),
            ),
          ),
        ),
        Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            title: const Text('Vehicle details',
                style: TextStyle(fontWeight: FontWeight.w800)),
            subtitle: Text(
                '${trip.truckPlate} · ${trip.trailerPlate.isEmpty ? 'Pending trailer' : trip.trailerPlate}'),
            trailing: FilledButton.tonal(
              onPressed: () => _showPreview(
                context,
                'Vehicle details',
                'Truck plate: ${trip.truckPlate}\nTrailer plate: ${trip.trailerPlate}\nDriver: ${trip.driverName}\nCarrier: ${trip.partnerName}',
              ),
              child: const Text('View'),
            ),
          ),
        ),
        ...trip.documents
          .map(
            (document) => Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                contentPadding: const EdgeInsets.all(16),
                title: Text(document.type,
                    style: const TextStyle(fontWeight: FontWeight.w800)),
                subtitle: Text('${document.reference} · ${document.status}'),
                trailing: FilledButton.tonal(
                  onPressed: () => _showPreview(
                    context,
                    document.type,
                    'Preview placeholder for ${document.reference}.',
                  ),
                  child: const Text('View'),
                ),
              ),
            ),
          )
          ,
        ],
          );
        },
      ),
    );
  }

  void _showPreview(BuildContext context, String title, String content) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
