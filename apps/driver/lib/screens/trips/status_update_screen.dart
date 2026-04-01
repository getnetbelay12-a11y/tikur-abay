import 'package:flutter/material.dart';

import '../../services/driver_api.dart';

class StatusUpdateScreen extends StatefulWidget {
  const StatusUpdateScreen({required this.tripId, super.key});

  final String tripId;

  @override
  State<StatusUpdateScreen> createState() => _StatusUpdateScreenState();
}

class _StatusUpdateScreenState extends State<StatusUpdateScreen> {
  String? _pendingStatus;

  @override
  Widget build(BuildContext context) {
    const statuses = [
      'loading',
      'loaded',
      'in_transit',
      'at_border',
      'in_djibouti',
      'offloading',
      'completed',
      'delayed',
      'breakdown',
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Update Status')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemBuilder: (_, index) => Card(
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            leading: const Icon(Icons.sync_alt),
            title: Text(statuses[index].replaceAll('_', ' ')),
            trailing: FilledButton(
              onPressed: _pendingStatus != null
                  ? null
                  : () async {
                      setState(() => _pendingStatus = statuses[index]);
                      try {
                        await DriverApi.updateTripStatus(widget.tripId, statuses[index]);
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Trip status updated to ${statuses[index].replaceAll('_', ' ')}.')),
                        );
                        Navigator.of(context).pop(true);
                      } catch (error) {
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(error.toString().replaceFirst('HttpException: ', ''))),
                        );
                      } finally {
                        if (mounted) setState(() => _pendingStatus = null);
                      }
                    },
              child: Text(_pendingStatus == statuses[index] ? 'Updating...' : 'Update'),
            ),
          ),
        ),
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemCount: statuses.length,
      ),
    );
  }
}
