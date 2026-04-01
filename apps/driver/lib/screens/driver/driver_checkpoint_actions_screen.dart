import 'package:flutter/material.dart';

import '../../services/assigned_driver_trip_service.dart';
import '../../services/driver_api.dart';
import '../../services/logistics_demo_data.dart';

class DriverCheckpointActionsScreen extends StatefulWidget {
  const DriverCheckpointActionsScreen({super.key});

  @override
  State<DriverCheckpointActionsScreen> createState() =>
      _DriverCheckpointActionsScreenState();
}

class _DriverCheckpointActionsScreenState
    extends State<DriverCheckpointActionsScreen> {
  final _noteController = TextEditingController();
  List<String> _checkpointOptions = const [];
  List<DriverCheckpointEvent> _checkpointEvents = const [];
  String _selectedLocation = '';
  late Future<DriverTrip> _tripFuture;
  String _status = 'passed';
  bool _sealIntact = true;
  String _message = '';
  bool _submitting = false;

  bool _isActionableCheckpoint(DriverCheckpointEvent event) {
    final status = event.status.trim().toLowerCase();
    return status == 'current' || status == 'pending';
  }

  List<String> _dedupeLocations(List<DriverCheckpointEvent> events) {
    final seen = <String>{};
    final unique = <String>[];
    for (final event in events) {
      final key = event.location.trim().toLowerCase();
      if (key.isEmpty || seen.contains(key)) continue;
      seen.add(key);
      unique.add(event.location);
    }
    return unique;
  }

  String _firstPendingLocation(List<DriverCheckpointEvent> events) {
    return events
        .firstWhere(
          _isActionableCheckpoint,
          orElse: () => events.last,
        )
        .location;
  }

  int _selectedCheckpointIndex() {
    return _checkpointEvents.indexWhere(
      (event) => event.location == _selectedLocation,
    );
  }

  int _firstPendingIndex() {
    return _checkpointEvents.indexWhere(_isActionableCheckpoint);
  }

  @override
  void initState() {
    super.initState();
    _tripFuture = _loadTrip();
  }

  Future<DriverTrip> _loadTrip() async {
    final trip = await AssignedDriverTripService.loadAssignedTrip();
    if (!mounted) {
      return trip;
    }
    setState(() {
      _checkpointEvents = List<DriverCheckpointEvent>.from(trip.checkpoints);
      _checkpointOptions = _dedupeLocations(_checkpointEvents);
      final preferredLocation = _checkpointEvents.isEmpty
          ? ''
          : _firstPendingLocation(_checkpointEvents);
      _selectedLocation = _checkpointOptions.contains(preferredLocation)
          ? preferredLocation
          : (_checkpointOptions.isEmpty ? '' : _checkpointOptions.first);
    });
    return trip;
  }

  Future<void> _reload() async {
    final nextFuture = _loadTrip();
    setState(() {
      _tripFuture = nextFuture;
    });
    await nextFuture;
  }

  Future<void> _submitCheckpointUpdate(DriverTrip trip) async {
    if (_selectedLocation.isEmpty || _submitting) return;
    final submittedLocation = _selectedLocation;
    setState(() {
      _submitting = true;
      _message = '';
    });
    try {
      await DriverApi.submitCorridorCheckpointUpdate(
        tripId: trip.tripId,
        location: _selectedLocation,
        status: _status,
        note: _noteController.text.trim().isEmpty
            ? null
            : _noteController.text.trim(),
        sealIntact: _sealIntact,
      );
      _noteController.clear();
      await _reload();
      if (!mounted) return;
      final nextLocation = _firstPendingIndex() >= 0
          ? _checkpointEvents[_firstPendingIndex()].location
          : '';
      setState(() {
        _message = nextLocation.isEmpty
            ? 'Checkpoint update submitted for $submittedLocation.'
            : 'Checkpoint update submitted for $submittedLocation. Next checkpoint: $nextLocation.';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _message = 'Checkpoint update failed. Retry from this screen.';
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
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<DriverTrip>(
      future: _tripFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done &&
            !snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                  'Checkpoint sync failed. Pull to refresh from the trip screen and try again.'),
            ),
          );
        }
        if (!snapshot.hasData) {
          return const SizedBox.shrink();
        }
        final trip = snapshot.data!;
        if (trip.tripId == 'UNASSIGNED') {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child:
                  Text('No assigned trip is available for checkpoint updates.'),
            ),
          );
        }
        if (_checkpointEvents.isEmpty) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                  'No checkpoint timeline is available for this trip yet.'),
            ),
          );
        }
        final firstPendingIndex = _firstPendingIndex();
        final selectedCheckpointIndex = _selectedCheckpointIndex();
        final selectedLocationValue = _checkpointOptions
                .contains(_selectedLocation)
            ? _selectedLocation
            : (_checkpointOptions.isEmpty ? null : _checkpointOptions.first);
        if (selectedLocationValue != _selectedLocation) {
          _selectedLocation = selectedLocationValue ?? '';
        }
        final selectedCheckpoint = _checkpointEvents.firstWhere(
          (event) => event.location == (selectedLocationValue ?? ''),
          orElse: () => _checkpointEvents.first,
        );
        final canSubmitSelectedCheckpoint = firstPendingIndex == -1 ||
            selectedCheckpointIndex == firstPendingIndex;

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
                      'Checkpoint update',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${trip.tripId} · ${trip.containerNumber} · ${trip.transitDocumentNumber}',
                      style: const TextStyle(color: Color(0xFF5B677A)),
                    ),
                    const SizedBox(height: 14),
                    DropdownButtonFormField<String>(
                      key: ValueKey<String>(
                          selectedLocationValue ?? 'checkpoint-empty'),
                      initialValue: selectedLocationValue,
                      decoration: const InputDecoration(
                        labelText: 'Checkpoint location',
                        border: OutlineInputBorder(),
                      ),
                      items: _checkpointOptions
                          .map(
                            (location) => DropdownMenuItem<String>(
                              value: location,
                              child: Text(location),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() {
                            _selectedLocation = value;
                            _message = '';
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: canSubmitSelectedCheckpoint
                            ? const Color(0xFFFFF7ED)
                            : const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: canSubmitSelectedCheckpoint
                              ? const Color(0xFFF97316)
                              : const Color(0xFFFCA5A5),
                        ),
                      ),
                      child: Text(
                        canSubmitSelectedCheckpoint
                            ? 'Next checkpoint: ${selectedCheckpoint.location}'
                            : 'Submit ${_checkpointEvents[firstPendingIndex].location} first before updating ${selectedCheckpoint.location}.',
                        style: TextStyle(
                          color: canSubmitSelectedCheckpoint
                              ? const Color(0xFF9A3412)
                              : const Color(0xFF991B1B),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _status,
                      decoration: const InputDecoration(
                        labelText: 'Status',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(
                            value: 'passed', child: Text('Passed')),
                        DropdownMenuItem(
                            value: 'inspection', child: Text('Inspection')),
                        DropdownMenuItem(value: 'hold', child: Text('Hold')),
                        DropdownMenuItem(
                            value: 'delayed', child: Text('Delayed')),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _status = value);
                        }
                      },
                    ),
                    const SizedBox(height: 8),
                    SwitchListTile.adaptive(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Seal intact'),
                      value: _sealIntact,
                      onChanged: (value) => setState(() => _sealIntact = value),
                    ),
                    TextField(
                      controller: _noteController,
                      minLines: 3,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'Officer / customs note',
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
                        'Photo upload placeholder. Attach checkpoint evidence here when live upload is wired.',
                      ),
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        FilledButton(
                          onPressed: canSubmitSelectedCheckpoint && !_submitting
                              ? () => _submitCheckpointUpdate(trip)
                              : null,
                          child: Text(
                            _submitting
                                ? 'Submitting...'
                                : 'Submit checkpoint update',
                          ),
                        ),
                        FilledButton.tonal(
                          onPressed: () => setState(
                            () => _message =
                                'Hold reported to dispatch and customs support.',
                          ),
                          child: const Text('Report hold'),
                        ),
                        FilledButton.tonal(
                          onPressed: () => setState(
                            () => _message = 'Route issue sent to operations.',
                          ),
                          child: const Text('Report route issue'),
                        ),
                      ],
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
            ..._checkpointEvents.map(
              (event) => Card(
                margin: const EdgeInsets.only(bottom: 12),
                color: event.location == _selectedLocation
                    ? const Color(0xFFFFFBEB)
                    : null,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              event.location,
                              style:
                                  const TextStyle(fontWeight: FontWeight.w800),
                            ),
                          ),
                          Text(
                            event.status,
                            style: TextStyle(
                              color: event.status.toLowerCase() == 'hold'
                                  ? const Color(0xFFD64545)
                                  : const Color(0xFF0F766E),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                          '${event.timestamp} · Seal intact ${event.sealIntact ? 'Yes' : 'No'}'),
                      const SizedBox(height: 4),
                      Text(event.driverNote),
                      const SizedBox(height: 2),
                      Text(
                        event.officerNote,
                        style: const TextStyle(color: Color(0xFF5B677A)),
                      ),
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
