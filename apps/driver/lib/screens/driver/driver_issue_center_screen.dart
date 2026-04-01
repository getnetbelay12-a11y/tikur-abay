import 'package:flutter/material.dart';

import '../../services/assigned_driver_trip_service.dart';
import '../../services/logistics_demo_data.dart' show DriverTrip;

class DriverIssueCenterScreen extends StatefulWidget {
  const DriverIssueCenterScreen({super.key});

  @override
  State<DriverIssueCenterScreen> createState() =>
      _DriverIssueCenterScreenState();
}

class _DriverIssueCenterScreenState extends State<DriverIssueCenterScreen> {
  String _issueType = 'customs hold';
  final _noteController = TextEditingController();
  String _message = '';

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<DriverTrip>(
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
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Issue report',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  'Trip ${trip.tripId} is linked automatically to each report.',
                  style: const TextStyle(color: Color(0xFF5B677A)),
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  initialValue: _issueType,
                  decoration: const InputDecoration(
                    labelText: 'Issue type',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(
                        value: 'customs hold', child: Text('Customs hold')),
                    DropdownMenuItem(
                        value: 'road issue', child: Text('Road issue')),
                    DropdownMenuItem(
                        value: 'fuel issue', child: Text('Fuel issue')),
                    DropdownMenuItem(
                        value: 'tire issue', child: Text('Tire issue')),
                    DropdownMenuItem(
                        value: 'accident', child: Text('Accident')),
                    DropdownMenuItem(
                        value: 'seal issue', child: Text('Seal issue')),
                    DropdownMenuItem(value: 'delay', child: Text('Delay')),
                    DropdownMenuItem(value: 'other', child: Text('Other')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => _issueType = value);
                    }
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _noteController,
                  minLines: 3,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'Issue note',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7FAFC),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Text(
                    'Photo upload placeholder. Add evidence when the upload endpoint is ready.',
                  ),
                ),
                const SizedBox(height: 14),
                FilledButton(
                  onPressed: () => setState(
                    () => _message =
                        '$_issueType report submitted for ${trip.tripId} with current timestamp.',
                  ),
                  child: const Text('Submit issue report'),
                ),
                if (_message.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    _message,
                    style: const TextStyle(
                      color: Color(0xFF0F766E),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        ...trip.issues.map(
          (issue) => Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              title: Text(issue.type,
                  style: const TextStyle(fontWeight: FontWeight.w800)),
              subtitle: Text('${issue.note}\n${issue.timestamp}'),
              trailing: Text(
                issue.status,
                style: TextStyle(
                  color: issue.status.toLowerCase() == 'open'
                      ? const Color(0xFFD64545)
                      : const Color(0xFFB7791F),
                  fontWeight: FontWeight.w700,
                ),
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
