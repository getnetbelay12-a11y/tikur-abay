import 'package:flutter/material.dart';

import '../../app_language.dart';
import '../../services/driver_api.dart';

class ActivityScreen extends StatefulWidget {
  const ActivityScreen({super.key});

  @override
  State<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends State<ActivityScreen> {
  late Future<_ActivityBundle> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_ActivityBundle> _load() async {
    final results = await Future.wait([
      DriverApi.fetchActivityLogs(),
      DriverApi.fetchReports(),
      DriverApi.fetchFuelLogs(),
      DriverApi.fetchDocuments(),
    ]);

    return _ActivityBundle(
      activityLogs: results[0],
      reports: results[1],
      fuelLogs: results[2],
      documents: results[3],
    );
  }

  Future<void> _refresh() async {
    setState(() {
      _future = _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_ActivityBundle>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(snapshot.error.toString()),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _refresh,
                    child: Text(t('refresh', fallback: 'Refresh')),
                  ),
                ],
              ),
            ),
          );
        }

        final bundle = snapshot.data ?? const _ActivityBundle.empty();
        final hasAnyData = bundle.activityLogs.isNotEmpty || bundle.reports.isNotEmpty || bundle.fuelLogs.isNotEmpty || bundle.documents.isNotEmpty;

        if (!hasAnyData) {
          return Center(child: Text(t('noActivity', fallback: 'No activity found yet.')));
        }

        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _SummaryCard(
                title: t('reportsSubmitted', fallback: 'Reports Submitted'),
                value: '${bundle.reports.length}',
                subtitle: 'Incident, issue, and support reporting',
              ),
              const SizedBox(height: 12),
              _SummaryCard(
                title: t('fuelLogs', fallback: 'Fuel Logs'),
                value: '${bundle.fuelLogs.length}',
                subtitle: 'Fuel receipts, liters, and odometer updates',
              ),
              const SizedBox(height: 12),
              _SummaryCard(
                title: t('documentsUploaded', fallback: 'Documents Uploaded'),
                value: '${bundle.documents.length}',
                subtitle: 'POD, manifests, receipts, and support files',
              ),
              const SizedBox(height: 16),
              Text(t('recentActivity', fallback: 'Recent Activity'), style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...bundle.activityLogs.take(12).map((item) {
                final row = item as Map<String, dynamic>;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Card(
                    child: ListTile(
                      leading: const Icon(Icons.timeline_outlined),
                      title: Text('${row['title'] ?? row['activityType'] ?? 'Activity'}'),
                      subtitle: Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('${row['description'] ?? ''}\n${row['createdAt'] ?? ''}'),
                      ),
                    ),
                  ),
                );
              }),
            ],
          ),
        );
      },
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.title,
    required this.value,
    required this.subtitle,
  });

  final String title;
  final String value;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(value, style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 6),
            Text(subtitle),
          ],
        ),
      ),
    );
  }
}

class _ActivityBundle {
  const _ActivityBundle({
    required this.activityLogs,
    required this.reports,
    required this.fuelLogs,
    required this.documents,
  });

  const _ActivityBundle.empty()
      : activityLogs = const [],
        reports = const [],
        fuelLogs = const [],
        documents = const [];

  final List<dynamic> activityLogs;
  final List<dynamic> reports;
  final List<dynamic> fuelLogs;
  final List<dynamic> documents;
}
