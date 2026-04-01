import 'package:flutter/material.dart';

import '../../app_language.dart';
import '../../services/driver_api.dart';
import 'report_form_screen.dart';

class ReportIssueScreen extends StatefulWidget {
  const ReportIssueScreen({super.key});

  @override
  State<ReportIssueScreen> createState() => _ReportIssueScreenState();
}

class _ReportIssueScreenState extends State<ReportIssueScreen> {
  late Future<List<dynamic>> _reportsFuture;
  late Future<List<dynamic>> _tripsFuture;

  static const _demoHistory = [
    {
      'type': 'fuel_log',
      'status': 'submitted',
      'description':
          'Fuel request logged for Addis Ababa departure preparation.',
    },
    {
      'type': 'checkpoint_update',
      'status': 'under_review',
      'description':
          'Checkpoint workflow template prepared for the next dispatch run.',
    },
    {
      'type': 'maintenance_needed',
      'status': 'submitted',
      'description':
          'Maintenance readiness note recorded for demo fleet presentation.',
    },
  ];

  static const _reportTypes = [
    _ReportType(
        'fuel_log', 'fuelReport', Icons.local_gas_station_outlined, 'fuel'),
    _ReportType('accident_report', 'accidentReport', Icons.car_crash_outlined,
        'incident'),
    _ReportType('breakdown_report', 'breakdownReport',
        Icons.warning_amber_outlined, 'incident'),
    _ReportType(
        'delay_report', 'delayReport', Icons.schedule_outlined, 'operations'),
    _ReportType('obstacle_report', 'roadObstacle',
        Icons.report_problem_outlined, 'operations'),
    _ReportType(
        'tire_issue', 'tireIssue', Icons.tire_repair_outlined, 'maintenance'),
    _ReportType('maintenance_needed', 'maintenanceNeeded',
        Icons.build_circle_outlined, 'maintenance'),
    _ReportType('support_request', 'supportRequest',
        Icons.support_agent_outlined, 'operations'),
    _ReportType('checkpoint_update', 'checkpointUpdate', Icons.place_outlined,
        'workflow'),
    _ReportType(
        'border_crossed', 'borderCrossed', Icons.flag_outlined, 'workflow'),
    _ReportType(
        'pod_uploaded', 'podUploaded', Icons.upload_file_outlined, 'workflow'),
  ];

  @override
  void initState() {
    super.initState();
    _reportsFuture = DriverApi.fetchReports();
    _tripsFuture = DriverApi.fetchTrips();
  }

  Future<void> _reload() async {
    setState(() {
      _reportsFuture = DriverApi.fetchReports();
      _tripsFuture = DriverApi.fetchTrips();
    });
  }

  Widget _buildReportCenter({
    required List<dynamic> history,
    required List<dynamic> trips,
    required bool loadFailed,
  }) {
    final activeTrip = trips.isNotEmpty
        ? trips.first as Map<String, dynamic>
        : <String, dynamic>{};

    final grouped = <String, List<_ReportType>>{};
    for (final item in _reportTypes) {
      grouped.putIfAbsent(item.group, () => []).add(item);
    }

    return RefreshIndicator(
      onRefresh: _reload,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            color: const Color(0xFF15304A),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t('reportOverview', fallback: 'Report center'),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    loadFailed
                        ? 'Live report data is unavailable, so this screen is showing demo reporting content for presentation.'
                        : t(
                            'reportOverviewSubtitle',
                            fallback:
                                'Fuel, incidents, delays, maintenance, and workflow updates in one operational queue.',
                          ),
                    style: const TextStyle(color: Colors.white70, height: 1.4),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: _MetricTile(
                          label: t(
                            'recentSubmissions',
                            fallback: 'Recent submissions',
                          ),
                          value: '${history.length}',
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _MetricTile(
                          label: t('activeTrips', fallback: 'Active trips'),
                          value: '${trips.length}',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (loadFailed)
            Card(
              child: ListTile(
                contentPadding: const EdgeInsets.all(16),
                leading: const Icon(Icons.auto_awesome_outlined),
                title:
                    Text(t('aiRecommendation', fallback: 'AI recommendation')),
                subtitle: const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text(
                    'Start with fuel log, checkpoint update, and maintenance readiness. Those three report types tell the clearest operations story in a demo.',
                  ),
                ),
              ),
            ),
          if (loadFailed) const SizedBox(height: 12),
          ...grouped.entries.map(
            (entry) => Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: _ReportGroupCard(
                title: _groupTitle(entry.key),
                types: entry.value,
                trip: activeTrip,
                onSubmitted: _reload,
              ),
            ),
          ),
          Text(
            t('recentQueue', fallback: 'Recent queue'),
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          if (history.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Text(
                  t('noReportsYet',
                      fallback: 'No reports have been submitted yet.'),
                ),
              ),
            )
          else
            ...history.take(8).map((item) {
              final report = item as Map<String, dynamic>;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Card(
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(14),
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xFFE8EEF5),
                      foregroundColor: Color(0xFF15304A),
                      child: Icon(Icons.assignment_outlined),
                    ),
                    title: Text(_reportTypeText(report['type']?.toString())),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        '${_statusText(report['status']?.toString())} · ${_formatText(report['description'], fallback: t('fieldPackage', fallback: 'Trip, vehicle, driver, GPS, odometer, urgency, and attachments'))}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: Future.wait([_reportsFuture, _tripsFuture])
          .then((value) => [value[0], value[1]]),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return _buildReportCenter(
            history: _demoHistory,
            trips: const [],
            loadFailed: true,
          );
        }

        final history = snapshot.data?[0] as List<dynamic>? ?? [];
        final trips = snapshot.data?[1] as List<dynamic>? ?? [];
        return _buildReportCenter(
          history: history,
          trips: trips,
          loadFailed: false,
        );
      },
    );
  }

  String _groupTitle(String group) {
    switch (group) {
      case 'fuel':
        return t('fuel', fallback: 'Fuel');
      case 'incident':
        return t('incident', fallback: 'Incident');
      case 'maintenance':
        return t('maintenance', fallback: 'Maintenance');
      case 'workflow':
        return t('workflow', fallback: 'Workflow');
      default:
        return t('operations', fallback: 'Operations');
    }
  }
}

class _ReportGroupCard extends StatelessWidget {
  const _ReportGroupCard({
    required this.title,
    required this.types,
    required this.trip,
    required this.onSubmitted,
  });

  final String title;
  final List<_ReportType> types;
  final Map<String, dynamic> trip;
  final Future<void> Function() onSubmitted;

  @override
  Widget build(BuildContext context) {
    final tripId = trip['_id']?.toString() ?? trip['id']?.toString() ?? '';
    final vehicleId = trip['vehicleCode']?.toString() ?? '';
    final driverId = trip['driverId']?.toString() ??
        DriverSession.user?['id']?.toString() ??
        '';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 14),
            ...types.map((report) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF7F9FC),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFE1E8F0)),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: const Color(0xFFE8EEF5),
                          foregroundColor: const Color(0xFF15304A),
                          child: Icon(report.icon),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                  t(report.labelKey, fallback: report.labelKey),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700)),
                              const SizedBox(height: 4),
                              Text(
                                report.group == 'fuel'
                                    ? t('fuelAndReceipts',
                                        fallback:
                                            'Fuel, receipt, station, and odometer')
                                    : t('fieldPackage',
                                        fallback:
                                            'Trip, vehicle, driver, GPS, odometer, urgency, and attachments'),
                                style: const TextStyle(
                                    color: Colors.black54, height: 1.35),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        FilledButton.tonal(
                          onPressed: () async {
                            final created =
                                await Navigator.of(context).push<bool>(
                              MaterialPageRoute(
                                builder: (_) => ReportFormScreen(
                                  reportTypeKey: report.code,
                                  reportTitle: t(report.labelKey,
                                      fallback: report.labelKey),
                                  tripId: tripId,
                                  vehicleId: vehicleId,
                                  driverId: driverId,
                                ),
                              ),
                            );
                            if (created == true) {
                              await onSubmitted();
                            }
                          },
                          child: Text(t('openForm', fallback: 'Open form')),
                        ),
                      ],
                    ),
                  ),
                )),
          ],
        ),
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.label, required this.value});

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
          const SizedBox(height: 4),
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

class _ReportType {
  const _ReportType(this.code, this.labelKey, this.icon, this.group);

  final String code;
  final String labelKey;
  final IconData icon;
  final String group;
}

String _reportTypeText(String? type) {
  switch (type) {
    case 'fuel_log':
      return t('fuelReport', fallback: 'Fuel report');
    case 'accident_report':
      return t('accidentReport', fallback: 'Accident report');
    case 'breakdown_report':
      return t('breakdownReport', fallback: 'Breakdown report');
    case 'delay_report':
      return t('delayReport', fallback: 'Delay report');
    case 'obstacle_report':
      return t('roadObstacle', fallback: 'Road obstacle');
    case 'tire_issue':
      return t('tireIssue', fallback: 'Tire issue');
    case 'maintenance_needed':
      return t('maintenanceNeeded', fallback: 'Maintenance needed');
    case 'support_request':
      return t('supportRequest', fallback: 'Support request');
    case 'checkpoint_update':
      return t('checkpointUpdate', fallback: 'Checkpoint update');
    case 'border_crossed':
      return t('borderCrossed', fallback: 'Border crossed');
    case 'pod_uploaded':
      return t('podUploaded', fallback: 'POD uploaded');
    default:
      return _formatText(type,
          fallback: t('reportType', fallback: 'Report type'));
  }
}

String _statusText(String? status) {
  switch (status) {
    case 'draft':
      return t('draft', fallback: 'Draft');
    case 'submitted':
      return t('submitted', fallback: 'Submitted');
    case 'under_review':
      return t('underReview', fallback: 'Under review');
    default:
      return _formatText(status,
          fallback: t('submitted', fallback: 'Submitted'));
  }
}

String _formatText(Object? value, {String? fallback}) {
  final text = value?.toString().trim();
  if (text == null || text.isEmpty || text == 'undefined' || text == 'null') {
    return fallback ?? t('notAvailable', fallback: 'Not available');
  }
  return text;
}
