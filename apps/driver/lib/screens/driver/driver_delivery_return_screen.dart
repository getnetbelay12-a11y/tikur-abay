import 'package:flutter/material.dart';

import '../../services/assigned_driver_trip_service.dart';
import '../../services/driver_api.dart';
import '../../services/logistics_demo_data.dart' show DriverTrip;

class DriverDeliveryReturnScreen extends StatefulWidget {
  const DriverDeliveryReturnScreen({super.key});

  @override
  State<DriverDeliveryReturnScreen> createState() =>
      _DriverDeliveryReturnScreenState();
}

class _DriverDeliveryReturnScreenState
    extends State<DriverDeliveryReturnScreen> {
  bool arrived = false;
  bool unloadComplete = false;
  bool emptyReleaseReceived = false;
  bool emptyReturnStarted = false;
  bool emptyReturned = false;
  final TextEditingController _noteController = TextEditingController();
  late final Future<DriverTrip> _tripFuture;

  Future<void> _loadClosureState(String tripId) async {
    final state = await DriverApi.readTripClosureState(tripId);
    if (!mounted) return;
    setState(() {
      arrived = state['arrived'] == true;
      unloadComplete = state['unloaded'] == true;
      emptyReleaseReceived = state['emptyRelease'] == true;
      emptyReturnStarted = state['emptyReturnStarted'] == true;
      emptyReturned = state['emptyReturned'] == true;
    });
  }

  Future<void> _persistClosureState(String tripId) {
    return DriverApi.writeTripClosureState(tripId, {
      'arrived': arrived,
      'unloaded': unloadComplete,
      'emptyRelease': emptyReleaseReceived,
      'emptyReturnStarted': emptyReturnStarted,
      'emptyReturned': emptyReturned,
    });
  }

  @override
  void initState() {
    super.initState();
    _tripFuture = AssignedDriverTripService.loadAssignedTrip();
    _tripFuture.then((trip) {
      _loadClosureState(trip.tripId);
    });
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
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
        return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Delivery / Return',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                const Text(
                    'Only actions relevant to the current trip closure are shown here.'),
                const SizedBox(height: 16),
                _ActionRow(
                  label: 'Confirm arrival',
                  complete: arrived,
                  onPressed: () async {
                    setState(() => arrived = true);
                    await _persistClosureState(trip.tripId);
                  },
                ),
                _ActionRow(
                  label: 'Confirm unload complete',
                  complete: unloadComplete,
                  onPressed: arrived
                      ? () async {
                          setState(() => unloadComplete = true);
                          await _persistClosureState(trip.tripId);
                        }
                      : null,
                ),
                _ActionRow(
                  label: 'Confirm empty release received',
                  complete: emptyReleaseReceived,
                  onPressed: unloadComplete
                      ? () async {
                          setState(() => emptyReleaseReceived = true);
                          await _persistClosureState(trip.tripId);
                        }
                      : null,
                ),
                _ActionRow(
                  label: 'Confirm empty return started',
                  complete: emptyReturnStarted,
                  onPressed: emptyReleaseReceived
                      ? () async {
                          setState(() => emptyReturnStarted = true);
                          await _persistClosureState(trip.tripId);
                        }
                      : null,
                ),
                _ActionRow(
                  label: 'Confirm empty returned',
                  complete: emptyReturned,
                  onPressed: emptyReturnStarted
                      ? () async {
                          setState(() => emptyReturned = true);
                          await _persistClosureState(trip.tripId);
                        }
                      : null,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _noteController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Unload / return note',
                    border: OutlineInputBorder(),
                  ),
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
