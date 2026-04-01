import 'package:flutter/material.dart';

import '../../services/driver_api.dart';

class TripTimelineScreen extends StatelessWidget {
  const TripTimelineScreen({required this.tripId, super.key});

  final String tripId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Trip Timeline')),
      body: FutureBuilder<List<dynamic>>(
        future: DriverApi.fetchTripEvents(tripId),
        builder: (context, snapshot) {
          final events = snapshot.data ?? [];
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (events.isEmpty) {
            return const Center(child: Text('No trip events available.'));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: events.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, index) {
              final event = events[index] as Map<String, dynamic>;
              return Card(
                child: ListTile(
                  leading: const Icon(Icons.timeline_outlined),
                  title: Text('${event['title'] ?? event['eventType'] ?? 'Update'}'),
                  subtitle: Text('${event['location'] ?? event['description'] ?? ''}\n${_formatDate(event['eventAt']?.toString())}'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

String _formatDate(String? value) {
  if (value == null || value.isEmpty) return 'Pending';
  final parsed = DateTime.tryParse(value);
  if (parsed == null) return value;
  return '${parsed.year}-${parsed.month.toString().padLeft(2, '0')}-${parsed.day.toString().padLeft(2, '0')} ${parsed.hour.toString().padLeft(2, '0')}:${parsed.minute.toString().padLeft(2, '0')}';
}
