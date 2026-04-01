import 'package:flutter/material.dart';

import '../../navigation/mobile_route_navigator.dart';
import '../../services/app_surface_experience.dart';
import '../../services/driver_api.dart';
import '../../services/document_priority_helper.dart';
import '../../services/realtime_service.dart';
import '../../widgets/document_priority_panel.dart';

import '../documents/document_route_navigator.dart';
import '../documents/document_route_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late Future<List<dynamic>> _notificationsFuture;
  late Future<DocumentPrioritySummary?> _prioritySummaryFuture;

  @override
  void initState() {
    super.initState();
    _notificationsFuture = DriverApi.fetchNotifications();
    _prioritySummaryFuture = _loadPrioritySummary();
    DriverRealtimeService.instance.onNotification((_) {
      if (mounted) {
        _reload();
      }
    });
  }

  @override
  void dispose() {
    DriverRealtimeService.instance.offNotification();
    super.dispose();
  }

  Future<void> _reload() async {
    setState(() {
      _notificationsFuture = DriverApi.fetchNotifications();
      _prioritySummaryFuture = _loadPrioritySummary();
    });
  }

  Future<DocumentPrioritySummary?> _loadPrioritySummary() async {
    final role =
        (DriverSession.user?['mobileRole'] ?? DriverSession.user?['role'] ?? '')
            .toString();
    if (role == 'customer') {
      final results = await Future.wait<dynamic>([
        DriverApi.fetchCustomerWorkspace(),
        DriverApi.fetchDocumentPolicy(
          entityType: 'customer',
          mobileUploadOnly: true,
        ),
      ]);
      final workspace = (results[0] as Map<String, dynamic>?) ?? {};
      final documents = (workspace['documents'] as List<dynamic>?) ?? const [];
      final policies = results[1] as List<dynamic>;
      return DocumentPriorityHelper.buildSummary(
        title: 'Customer document priority',
        emptyMessage:
            'No alerts right now. Prepare the next required customer documents before quotes, agreements, or invoicing depend on them.',
        policies: policies,
        documents: documents,
      );
    }

    final results = await Future.wait<dynamic>([
      DriverApi.fetchDocuments(),
      DriverApi.fetchDocumentPolicy(
        entityType: 'driver_kyc',
        mobileUploadOnly: true,
      ),
    ]);
    return DocumentPriorityHelper.buildSummary(
      title: 'Driver document priority',
      emptyMessage:
          'No alerts right now. Finish the remaining high-priority KYC uploads to keep approval moving.',
      policies: results[1] as List<dynamic>,
      documents: results[0] as List<dynamic>,
    );
  }

  void _openDocumentCenter(Map<String, dynamic>? policy) {
    DocumentRouteNavigator.open(
      context,
      baseTitle: 'Document Center',
      focusCategory: policy?['category']?.toString(),
      focusLabel: policy?['label']?.toString(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: _notificationsFuture,
      builder: (context, snapshot) {
        return FutureBuilder<DocumentPrioritySummary?>(
          future: _prioritySummaryFuture,
          builder: (context, prioritySnapshot) {
            final alerts = snapshot.data ?? [];
            final summary = prioritySnapshot.data;
            if (snapshot.connectionState == ConnectionState.waiting &&
                prioritySnapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (alerts.isEmpty) {
              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (summary != null) ...[
                    DocumentPriorityPanel(
                      title: summary.title,
                      subtitle: AppSurfaceExperience.alertPrioritySubtitle,
                      policies: summary.policies,
                      trailingLabelBuilder: DocumentPriorityHelper.actionLabel,
                      onPolicyTap: _openDocumentCenter,
                      backgroundColor: const Color(0xFFF8FAFC),
                      borderColor: const Color(0xFFD7E2F0),
                    ),
                    const SizedBox(height: 16),
                  ],
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      child: Text(
                        AppSurfaceExperience.alertsEmptyMessage(
                          summary?.emptyMessage,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ],
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemBuilder: (_, index) {
                if (summary != null && index == 0) {
                  return DocumentPriorityPanel(
                    title: summary.title,
                    subtitle: AppSurfaceExperience.alertPrioritySubtitle,
                    policies: summary.policies,
                    trailingLabelBuilder: DocumentPriorityHelper.actionLabel,
                    onPolicyTap: _openDocumentCenter,
                    backgroundColor: const Color(0xFFF8FAFC),
                    borderColor: const Color(0xFFD7E2F0),
                  );
                }
                final alertIndex = summary != null ? index - 1 : index;
                final alert = alerts[alertIndex] as Map<String, dynamic>;
                return Card(
                  child: ListTile(
                    onTap: () async {
                      await showDialog<void>(
                        context: context,
                        builder: (_) => AlertDialog(
                          title: Text('${alert['title']}'),
                          content: Text('${alert['message']}'),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.of(context).pop(),
                              child: const Text(
                                AppSurfaceExperience.alertCloseLabel,
                              ),
                            ),
                            TextButton(
                              onPressed: () {
                                Navigator.of(context).pop();
                                if (alert['entityType'] == 'chat') {
                                  MobileRouteNavigator.openDispatcherChat(
                                    context,
                                  );
                                } else {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => const DocumentRouteScreen(
                                        baseTitle: 'Related Document',
                                      ),
                                    ),
                                  );
                                }
                              },
                              child: const Text(
                                AppSurfaceExperience.alertOpenRelatedLabel,
                              ),
                            ),
                            FilledButton(
                              onPressed: () async {
                                await DriverApi.markNotificationRead(
                                    '${alert['id']}');
                                if (!context.mounted) return;
                                Navigator.of(context).pop();
                                await _reload();
                                if (!context.mounted) return;
                                AppSurfaceExperience.showMessage(
                                  context,
                                  AppSurfaceExperience.alertMarkedReadMessage,
                                );
                              },
                              child: const Text(
                                AppSurfaceExperience.alertMarkReadLabel,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                    contentPadding: const EdgeInsets.all(16),
                    leading: Icon(
                      alert['isRead'] == true
                          ? Icons.notifications_none
                          : Icons.notifications_active,
                    ),
                    title: Text('${alert['title']}'),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text('${alert['message']}'),
                    ),
                    trailing: alert['isRead'] == true
                        ? const Text(AppSurfaceExperience.alertReadLabel)
                        : const Text(AppSurfaceExperience.alertOpenLabel),
                  ),
                );
              },
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemCount: alerts.length + (summary == null ? 0 : 1),
            );
          },
        );
      },
    );
  }
}
