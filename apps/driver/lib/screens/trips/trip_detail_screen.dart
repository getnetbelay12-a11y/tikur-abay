import 'package:flutter/material.dart';

import '../../app_language.dart';
import '../../services/driver_api.dart';

class TripDetailScreen extends StatefulWidget {
  const TripDetailScreen({required this.tripId, super.key});

  final String tripId;

  @override
  State<TripDetailScreen> createState() => _TripDetailScreenState();
}

class _TripDetailScreenState extends State<TripDetailScreen> {
  late Future<Map<String, dynamic>?> _tripFuture;
  late Future<List<dynamic>> _eventsFuture;

  bool get _isCustomerRole => (DriverSession.user?['mobileRole']?.toString() ?? 'customer') == 'customer';

  @override
  void initState() {
    super.initState();
    _tripFuture = DriverApi.fetchTrip(widget.tripId);
    _eventsFuture = DriverApi.fetchTripEvents(widget.tripId);
  }

  Future<void> _reload() async {
    setState(() {
      _tripFuture = DriverApi.fetchTrip(widget.tripId);
      _eventsFuture = DriverApi.fetchTripEvents(widget.tripId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(t('tripDetail', fallback: 'Trip detail'))),
      body: FutureBuilder<List<dynamic>>(
        future: Future.wait([_tripFuture, _eventsFuture]).then((value) => [value[0], value[1]]),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return _TripDetailError(onRetry: _reload);
          }

          final trip = snapshot.data?[0] as Map<String, dynamic>?;
          final events = snapshot.data?[1] as List<dynamic>? ?? const [];
          if (trip == null) {
            return Center(child: Text(t('tripUnavailable', fallback: 'Trip details unavailable.')));
          }

          final documents = (trip['documents'] as List<dynamic>?) ?? const [];
          final route = '${_formatText(trip['origin'])} → ${_formatText(trip['destination'])}';
          final currentStatus = _statusText(trip['status']?.toString());
          final eta = _formatDateTime(trip['plannedArrivalAt']?.toString() ?? trip['eta']?.toString());
          final latestCheckpoint = _formatText(trip['currentCheckpoint'], fallback: t('locationNotRecorded', fallback: 'Location not recorded'));
          final driverName = _formatText(trip['driverName'], fallback: t('systemUpdate', fallback: 'System update'));
          final vehicleCode = _formatText(trip['vehicleCode'], fallback: t('notAvailable', fallback: 'Not available'));
          final paymentLink = _formatText(trip['invoiceCode'] ?? trip['paymentCode'], fallback: t('paymentPending', fallback: 'Payment pending'));
          final podStatus = ((trip['proofOfDeliveryUploaded'] as bool?) ?? false)
              ? t('completed', fallback: 'Completed')
              : t('awaitingPod', fallback: 'Awaiting POD');

          return RefreshIndicator(
            onRefresh: _reload,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _HeroStatusCard(
                  title: _formatText(trip['tripCode'], fallback: t('tripDetail', fallback: 'Trip detail')),
                  route: route,
                  status: currentStatus,
                  eta: eta,
                  vehicleCode: vehicleCode,
                  driverName: driverName,
                  customerVisible: _isCustomerRole,
                ),
                const SizedBox(height: 16),
                _SectionCard(
                  title: t('trackingSnapshot', fallback: 'Tracking snapshot'),
                  subtitle: t('trackingSnapshotSubtitle', fallback: 'Latest route progress and checkpoint context.'),
                  child: Column(
                    children: [
                      _InfoRow(label: t('latestCheckpoint', fallback: 'Latest checkpoint'), value: latestCheckpoint),
                      _InfoRow(label: t('routeStatus', fallback: 'Route status'), value: _formatText(trip['routeStatus'], fallback: currentStatus)),
                      _InfoRow(label: t('eta', fallback: 'ETA'), value: eta),
                      _InfoRow(label: t('assignedVehicle', fallback: 'Assigned vehicle'), value: vehicleCode),
                      if (!_isCustomerRole) _InfoRow(label: t('driver', fallback: 'Driver'), value: driverName),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _SectionCard(
                  title: t('timeline', fallback: 'Timeline'),
                  subtitle: t('tripTimelineSubtitle', fallback: 'Major milestones and checkpoint updates for this trip.'),
                  child: events.isEmpty
                      ? Text(t('noTimelineYet', fallback: 'No timeline updates recorded yet.'))
                      : Column(
                          children: events.map((item) => _TimelineItem(event: item as Map<String, dynamic>)).toList(),
                        ),
                ),
                const SizedBox(height: 16),
                _SectionCard(
                  title: t('documents', fallback: 'Documents'),
                  subtitle: t('tripDocumentsSubtitle', fallback: 'Manifest, POD, receipts, and delivery files linked to this trip.'),
                  child: documents.isEmpty
                      ? Text(t('noDocumentsYet', fallback: 'No linked documents are available yet.'))
                      : Column(
                          children: documents.map((item) {
                            final doc = item as Map<String, dynamic>;
                            return ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: const CircleAvatar(
                                backgroundColor: Color(0xFFE8EEF5),
                                foregroundColor: Color(0xFF15304A),
                                child: Icon(Icons.description_outlined),
                              ),
                              title: Text(_formatText(doc['title'] ?? doc['name'], fallback: t('documents', fallback: 'Documents'))),
                              subtitle: Text(_formatText(doc['status'], fallback: t('submitted', fallback: 'Submitted'))),
                            );
                          }).toList(),
                        ),
                ),
                const SizedBox(height: 16),
                _SectionCard(
                  title: t('paymentLink', fallback: 'Payment link'),
                  subtitle: t('tripPaymentSubtitle', fallback: 'Invoice and payment follow-up linked to this shipment.'),
                  child: Column(
                    children: [
                      _InfoRow(label: t('paymentLink', fallback: 'Payment link'), value: paymentLink),
                      _InfoRow(label: t('podStatus', fallback: 'POD status'), value: podStatus),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.map_outlined),
                        label: Text(t('trackShipment', fallback: 'Track shipment')),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.forum_outlined),
                        label: Text(t('openChat', fallback: 'Open chat')),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _HeroStatusCard extends StatelessWidget {
  const _HeroStatusCard({
    required this.title,
    required this.route,
    required this.status,
    required this.eta,
    required this.vehicleCode,
    required this.driverName,
    required this.customerVisible,
  });

  final String title;
  final String route;
  final String status;
  final String eta;
  final String vehicleCode;
  final String driverName;
  final bool customerVisible;

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
              title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(route, style: const TextStyle(color: Colors.white70)),
            const SizedBox(height: 16),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                _HeroChip(label: t('currentStatus', fallback: 'Current status'), value: status),
                _HeroChip(label: t('eta', fallback: 'ETA'), value: eta),
                _HeroChip(label: t('assignedVehicle', fallback: 'Assigned vehicle'), value: vehicleCode),
                if (!customerVisible) _HeroChip(label: t('driver', fallback: 'Driver'), value: driverName),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(subtitle, style: const TextStyle(color: Colors.black54, height: 1.35)),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    );
  }
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Colors.white60, fontSize: 12)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
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
          SizedBox(width: 132, child: Text(label, style: const TextStyle(color: Colors.black54))),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}

class _TimelineItem extends StatelessWidget {
  const _TimelineItem({required this.event});

  final Map<String, dynamic> event;

  @override
  Widget build(BuildContext context) {
    final title = _formatText(event['title'], fallback: t('systemUpdate', fallback: 'System update'));
    final actor = _formatText(event['source'] ?? event['actor'], fallback: t('systemUpdate', fallback: 'System update'));
    final location = _formatText(event['location'], fallback: t('locationNotRecorded', fallback: 'Location not recorded'));
    final note = _formatText(event['note'], fallback: actor);
    final eventAt = _formatDateTime(event['eventAt']?.toString() ?? event['createdAt']?.toString());

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 12,
            height: 12,
            margin: const EdgeInsets.only(top: 5),
            decoration: const BoxDecoration(color: Color(0xFF15304A), shape: BoxShape.circle),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(note),
                const SizedBox(height: 4),
                Text(location, style: const TextStyle(color: Colors.black54, fontSize: 12)),
                const SizedBox(height: 2),
                Text(eventAt, style: const TextStyle(color: Colors.black45, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TripDetailError extends StatelessWidget {
  const _TripDetailError({required this.onRetry});

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
              child: Text(t('retry', fallback: 'Retry')),
            ),
          ],
        ),
      ),
    );
  }
}

String _formatText(Object? value, {String? fallback}) {
  final text = value?.toString().trim();
  if (text == null || text.isEmpty || text == 'undefined' || text == 'null') {
    return fallback ?? t('notAvailable', fallback: 'Not available');
  }
  return text;
}

String _formatDateTime(String? value) {
  if (value == null || value.isEmpty) return t('timeNotRecorded', fallback: 'Time not recorded');
  final parsed = DateTime.tryParse(value);
  if (parsed == null) return value;
  return '${parsed.year}-${parsed.month.toString().padLeft(2, '0')}-${parsed.day.toString().padLeft(2, '0')} ${parsed.hour.toString().padLeft(2, '0')}:${parsed.minute.toString().padLeft(2, '0')}';
}

String _statusText(String? status) {
  switch (status) {
    case 'assigned':
      return t('currentAssignment', fallback: 'Current assignment');
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
    default:
      return _formatText(status, fallback: t('status', fallback: 'Status'));
  }
}
