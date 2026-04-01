import 'package:flutter/material.dart';

import '../../navigation/mobile_route_navigator.dart';
import '../../app_language.dart';
import '../../services/driver_api.dart';

class CustomerTripsScreen extends StatefulWidget {
  const CustomerTripsScreen({super.key});

  @override
  State<CustomerTripsScreen> createState() => _CustomerTripsScreenState();
}

class _CustomerTripsScreenState extends State<CustomerTripsScreen> {
  late Future<List<dynamic>> _tripsFuture;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _tripsFuture = DriverApi.fetchTrips();
  }

  Future<void> _reload() async {
    setState(() {
      _tripsFuture = DriverApi.fetchTrips();
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: _tripsFuture,
      builder: (context, snapshot) {
        final allTrips = snapshot.data ?? const [];
        final trips = allTrips
            .where((item) => _matchesFilter(item as Map<String, dynamic>))
            .cast<Map<String, dynamic>>()
            .toList();

        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return _TripErrorState(onRetry: _reload);
        }

        return RefreshIndicator(
          onRefresh: _reload,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _WorkspaceHero(
                activeTrips: allTrips
                    .where((item) => _isActive(
                        (item as Map<String, dynamic>)['status']?.toString()))
                    .length,
                delayedTrips: allTrips
                    .where((item) =>
                        (item as Map<String, dynamic>)['status']?.toString() ==
                        'delayed')
                    .length,
                awaitingPod: allTrips
                    .where((item) => !((item as Map<String, dynamic>)[
                            'proofOfDeliveryUploaded'] as bool? ??
                        false))
                    .length,
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _TripFilterChip(
                    label: t('allTrips', fallback: 'All trips'),
                    selected: _filter == 'all',
                    onTap: () => setState(() => _filter = 'all'),
                  ),
                  _TripFilterChip(
                    label: t('active', fallback: 'Active'),
                    selected: _filter == 'active',
                    onTap: () => setState(() => _filter = 'active'),
                  ),
                  _TripFilterChip(
                    label: t('delayed', fallback: 'Delayed'),
                    selected: _filter == 'delayed',
                    onTap: () => setState(() => _filter = 'delayed'),
                  ),
                  _TripFilterChip(
                    label: t('completed', fallback: 'Completed'),
                    selected: _filter == 'completed',
                    onTap: () => setState(() => _filter = 'completed'),
                  ),
                  _TripFilterChip(
                    label: t('awaitingPod', fallback: 'Awaiting POD'),
                    selected: _filter == 'awaiting_pod',
                    onTap: () => setState(() => _filter = 'awaiting_pod'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (trips.isEmpty)
                _EmptyTripState(filter: _filter)
              else
                ...trips.map((trip) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _TripCard(
                        trip: trip,
                        onOpen: () {
                          final tripId = trip['_id']?.toString() ??
                              trip['id']?.toString() ??
                              '';
                          if (tripId.isEmpty) return;
                          MobileRouteNavigator.openTripDetail(
                            context,
                            tripId: tripId,
                          );
                        },
                      ),
                    )),
            ],
          ),
        );
      },
    );
  }

  bool _matchesFilter(Map<String, dynamic> trip) {
    final status = trip['status']?.toString() ?? '';
    if (_filter == 'all') return true;
    if (_filter == 'active') return _isActive(status);
    if (_filter == 'completed') return status == 'completed';
    if (_filter == 'delayed') return status == 'delayed';
    if (_filter == 'awaiting_pod') {
      return !(trip['proofOfDeliveryUploaded'] as bool? ?? false);
    }
    return true;
  }

  bool _isActive(String? status) {
    return {
      'assigned',
      'loading',
      'in_transit',
      'at_border',
      'in_djibouti',
      'offloading',
      'delayed',
    }.contains(status);
  }
}

class _WorkspaceHero extends StatelessWidget {
  const _WorkspaceHero({
    required this.activeTrips,
    required this.delayedTrips,
    required this.awaitingPod,
  });

  final int activeTrips;
  final int delayedTrips;
  final int awaitingPod;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFF15304A),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              t('customerTripWorkspace', fallback: 'Customer trip workspace'),
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(color: Colors.white, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              t('customerTripWorkspaceSubtitle',
                  fallback:
                      'Track assigned trips, ETA, payment state, and delivery documents in one place.'),
              style: const TextStyle(color: Colors.white70, height: 1.4),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                    child: _HeroMetric(
                        label: t('activeTrips', fallback: 'Active trips'),
                        value: '$activeTrips')),
                const SizedBox(width: 10),
                Expanded(
                    child: _HeroMetric(
                        label: t('delayed', fallback: 'Delayed'),
                        value: '$delayedTrips')),
                const SizedBox(width: 10),
                Expanded(
                    child: _HeroMetric(
                        label: t('awaitingPod', fallback: 'Awaiting POD'),
                        value: '$awaitingPod')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroMetric extends StatelessWidget {
  const _HeroMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(color: Colors.white60, fontSize: 12)),
          const SizedBox(height: 6),
          Text(value,
              style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 20)),
        ],
      ),
    );
  }
}

class _TripFilterChip extends StatelessWidget {
  const _TripFilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      selectedColor: const Color(0xFFDCE7F3),
      backgroundColor: Colors.white,
      side: BorderSide(
          color: selected ? const Color(0xFF15304A) : const Color(0xFFD7DEE7)),
    );
  }
}

class _TripCard extends StatelessWidget {
  const _TripCard({required this.trip, required this.onOpen});

  final Map<String, dynamic> trip;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final tripCode = _formatText(trip['tripCode']);
    final route =
        '${_formatText(trip['origin'])} → ${_formatText(trip['destination'])}';
    final eta = _formatDateTime(
        trip['eta']?.toString() ?? trip['plannedArrivalAt']?.toString());
    final update = _formatText(
        trip['currentCheckpoint'] ??
            trip['latestUpdate'] ??
            trip['routeStatus'],
        fallback: t('locationNotRecorded', fallback: 'Location not recorded'));
    final invoice = _formatText(trip['invoiceStatus'] ?? trip['paymentStatus'],
        fallback: t('invoicePending', fallback: 'Invoice pending'));
    final vehicle = _formatText(trip['vehicleCode'],
        fallback: t('assignedVehicle', fallback: 'Assigned vehicle'));
    final podUploaded = trip['proofOfDeliveryUploaded'] as bool? ?? false;

    return Card(
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(tripCode,
                            style: const TextStyle(
                                fontWeight: FontWeight.w800, fontSize: 16)),
                        const SizedBox(height: 6),
                        Text(route,
                            style: const TextStyle(
                                color: Color(0xFF243447),
                                fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                  _StatusPill(label: _statusLabel(trip['status']?.toString())),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                      child: _DetailPill(
                          icon: Icons.schedule_outlined,
                          label: t('eta', fallback: 'ETA'),
                          value: eta)),
                  const SizedBox(width: 10),
                  Expanded(
                      child: _DetailPill(
                          icon: Icons.local_shipping_outlined,
                          label: t('assignedVehicle',
                              fallback: 'Assigned vehicle'),
                          value: vehicle)),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                      child: _DetailPill(
                          icon: Icons.pin_drop_outlined,
                          label: t('latestUpdate', fallback: 'Latest update'),
                          value: update)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _DetailPill(
                      icon: podUploaded
                          ? Icons.verified_outlined
                          : Icons.file_present_outlined,
                      label: t('podStatus', fallback: 'POD status'),
                      value: podUploaded
                          ? t('completed', fallback: 'Completed')
                          : t('awaitingPod', fallback: 'Awaiting POD'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                      child: _DetailPill(
                          icon: Icons.receipt_long_outlined,
                          label: t('invoiceStatus', fallback: 'Invoice status'),
                          value: _statusLabel(invoice))),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton.tonalIcon(
                        onPressed: onOpen,
                        icon: const Icon(Icons.chevron_right),
                        label: Text(t('viewDetail', fallback: 'View detail')),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFE8EEF5),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
            color: Color(0xFF15304A),
            fontWeight: FontWeight.w700,
            fontSize: 12),
      ),
    );
  }
}

class _DetailPill extends StatelessWidget {
  const _DetailPill({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF6F8FB),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: const Color(0xFF15304A)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style:
                        const TextStyle(fontSize: 11, color: Colors.black54)),
                const SizedBox(height: 3),
                Text(value,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyTripState extends StatelessWidget {
  const _EmptyTripState({required this.filter});

  final String filter;

  @override
  Widget build(BuildContext context) {
    final message = switch (filter) {
      'active' => t('noTripsYet',
          fallback:
              'No trips are active yet. Once a booking is assigned, trip milestones and ETA will appear here.'),
      'delayed' => t('noActivity', fallback: 'No activity found yet.'),
      'completed' => t('noActivity', fallback: 'No activity found yet.'),
      'awaiting_pod' =>
        t('noDocumentsYet', fallback: 'No linked documents are available yet.'),
      _ => t('noTripsYet',
          fallback:
              'No trips are active yet. Once a booking is assigned, trip milestones and ETA will appear here.'),
    };

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Icon(Icons.local_shipping_outlined,
                size: 36, color: Color(0xFF15304A)),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _TripErrorState extends StatelessWidget {
  const _TripErrorState({required this.onRetry});

  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(t('loadFailed', fallback: 'Failed to load data.')),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: onRetry,
              child: Text(t('tryAgain', fallback: 'Try again')),
            ),
          ],
        ),
      ),
    );
  }
}

String _formatText(Object? value, {String? fallback}) {
  final text = value?.toString().trim();
  if (text == null || text.isEmpty || text == 'null' || text == 'undefined') {
    return fallback ?? t('notAvailable', fallback: 'Not available');
  }
  return text;
}

String _formatDateTime(String? value) {
  if (value == null || value.isEmpty) {
    return t('timeNotRecorded', fallback: 'Time not recorded');
  }
  final parsed = DateTime.tryParse(value);
  if (parsed == null) return value;
  return '${parsed.year}-${parsed.month.toString().padLeft(2, '0')}-${parsed.day.toString().padLeft(2, '0')} ${parsed.hour.toString().padLeft(2, '0')}:${parsed.minute.toString().padLeft(2, '0')}';
}

String _statusLabel(String? status) {
  switch (status) {
    case 'assigned':
      return t('currentBooking', fallback: 'Current booking');
    case 'loading':
      return t('loadingCompleted', fallback: 'Loading completed');
    case 'in_transit':
      return t('active', fallback: 'Active');
    case 'at_border':
      return t('borderUpdate', fallback: 'Border update');
    case 'in_djibouti':
      return 'Djibouti';
    case 'offloading':
      return t('offloadingCompleted', fallback: 'Offloading completed');
    case 'completed':
      return t('completed', fallback: 'Completed');
    case 'delayed':
      return t('delayed', fallback: 'Delayed');
    case 'paid':
      return t('completed', fallback: 'Completed');
    case 'unpaid':
      return t('paymentPending', fallback: 'Payment pending');
    case 'overdue':
      return t('delayed', fallback: 'Delayed');
    default:
      return _formatText(status, fallback: t('status', fallback: 'Status'));
  }
}
