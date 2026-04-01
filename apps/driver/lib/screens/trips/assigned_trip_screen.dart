import 'package:flutter/material.dart';

import '../../navigation/mobile_route_navigator.dart';
import '../../app_language.dart';
import '../../services/dashboard_experience.dart';
import '../../services/dashboard_formatters.dart';
import '../../services/driver_api.dart';
import '../../services/document_priority_helper.dart';
import '../../widgets/dashboard_cards.dart';
import '../documents/document_route_navigator.dart';
import '../../widgets/document_priority_panel.dart';

class AssignedTripScreen extends StatefulWidget {
  const AssignedTripScreen({super.key});

  @override
  State<AssignedTripScreen> createState() => _AssignedTripScreenState();
}

class _AssignedTripScreenState extends State<AssignedTripScreen>
    with WidgetsBindingObserver {
  late Future<List<dynamic>> _tripsFuture;
  late Future<List<dynamic>> _documentsFuture;
  late Future<List<dynamic>> _tripPolicyFuture;
  String _syncState = 'pending';
  String _syncSource = 'backend';
  DateTime? _lastSyncAt;

  static const List<Map<String, dynamic>> _demoDriverPolicies = [
    {
      'category': 'fayda_front',
      'label': 'Fayda ID Front',
      'priority': 'high',
    },
    {
      'category': 'fayda_back',
      'label': 'Fayda ID Back',
      'priority': 'high',
    },
    {
      'category': 'driver_license',
      'label': 'Driver License',
      'priority': 'medium',
    },
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refresh();
    }
  }

  Future<void> _refresh() async {
    setState(() {
      _syncState = 'pending';
      _syncSource = 'backend';
      _lastSyncAt = DateTime.now();
      _tripsFuture = DriverApi.fetchTrips();
      _documentsFuture = DriverApi.fetchDocuments();
      _tripPolicyFuture = DriverApi.fetchDocumentPolicy(
        entityType: 'trip',
        mobileUploadOnly: true,
      );
    });
  }

  void _openTripDocuments(Map<String, dynamic>? policy, {String? tripId}) {
    DocumentRouteNavigator.open(
      context,
      baseTitle: t('tripDocuments', fallback: 'Trip documents'),
      focusCategory: policy?['category']?.toString(),
      focusLabel: policy?['label']?.toString(),
      focusEntityType: tripId == null ? null : 'trip',
      focusEntityId: tripId,
    );
  }

  Widget _buildSyncCard({required String tripId}) {
    final icon = _syncState == 'offline'
        ? Icons.cloud_off_outlined
        : _syncState == 'pending'
            ? Icons.sync
            : Icons.cloud_done_outlined;
    final lastSync = _lastSyncAt == null
        ? 'Last sync pending'
        : 'Last sync ${_lastSyncAt!.toLocal().toString().substring(0, 19)}';
    return DashboardInfoCard(
      title: t('liveSyncStatus', fallback: 'Live sync status'),
      subtitle:
          'State: $_syncState · Source: $_syncSource · Trip: ${tripId.isEmpty ? 'none' : tripId}\n$lastSync',
      icon: icon,
    );
  }

  Widget _buildDemoDriverHome({
    required bool loadFailed,
    required List<Map<String, dynamic>> missingPolicies,
  }) {
    final effectivePolicies =
        missingPolicies.isEmpty ? _demoDriverPolicies : missingPolicies;

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            color: const Color(0xFF15304A),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t('driverDashboard', fallback: 'Driver Dashboard'),
                    style: const TextStyle(color: Colors.white70),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    t('welcomeBack', fallback: 'Welcome back'),
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    loadFailed
                        ? t('driverDemoLoadFailed',
                            fallback:
                                'Live trip data is not available right now. Demo guidance is shown so you can continue the presentation.')
                        : t('driverDemoNoTrip',
                            fallback:
                                'No trip is assigned yet. Keep your profile and KYC readiness in good shape so dispatch can activate you quickly.'),
                    style: const TextStyle(
                      color: Colors.white70,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          DocumentPriorityPanel(
            title:
                t('profileKycPriority', fallback: 'Profile and KYC priority'),
            subtitle: t('profileKycPrioritySubtitle',
                fallback:
                    'Upload these first so approval and trip activation do not stall later.'),
            policies: effectivePolicies,
            maxItems: 3,
            leadingIcon: Icons.verified_user_outlined,
            trailingLabelBuilder: (priority) =>
                (priority ?? 'low').toUpperCase(),
            onPolicyTap: (policy) => _openTripDocuments(policy),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: DashboardMetricCard(
                  title: t('status', fallback: 'Status'),
                  value: t('readyForDispatch', fallback: 'Ready for dispatch'),
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: DashboardMetricCard(
                  title: t('branch', fallback: 'Branch'),
                  value: 'Addis Ababa',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: DashboardMetricCard(
                  title: 'KYC',
                  value: t('pendingReview', fallback: 'Pending review'),
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: DashboardMetricCard(
                  title: t('nextAction', fallback: 'Next action'),
                  value: t('uploadFayda', fallback: 'Upload Fayda'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          DashboardSectionCard(
            title: t('quickActionsTitle', fallback: 'Quick actions'),
            child: Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                DashboardQuickActionTile(
                  label: t('uploadFayda', fallback: 'Upload Fayda'),
                  icon: Icons.badge_outlined,
                ),
                DashboardQuickActionTile(
                  label: t('openDocuments', fallback: 'Open documents'),
                  icon: Icons.folder_open_outlined,
                ),
                DashboardQuickActionTile(
                  label: t('contactDispatch', fallback: 'Contact dispatch'),
                  icon: Icons.support_agent_outlined,
                ),
                DashboardQuickActionTile(
                  label: t('checkReports', fallback: 'Check reports'),
                  icon: Icons.assignment_outlined,
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          DashboardInfoCard(
            title: t('aiRecommendation', fallback: 'AI recommendation'),
            subtitle: t('driverAiRecommendation',
                fallback:
                    'Upload Fayda front and back first, then driver license. That is the fastest path to approval and first trip assignment.'),
            icon: Icons.auto_awesome_outlined,
          ),
          const SizedBox(height: 12),
          DashboardSectionCard(
            title: t('todayTitle', fallback: 'Today'),
            child: Column(
              children: [
                DashboardActivityRow(
                  title: t('accountAccessActive',
                      fallback: 'Account access is active'),
                  subtitle: t('accountAccessActiveSubtitle',
                      fallback:
                          'OTP login worked. You can continue onboarding without waiting for a password setup.'),
                ),
                DashboardActivityRow(
                  title: t('faydaStillMissing',
                      fallback: 'Fayda is still missing'),
                  subtitle: t('faydaStillMissingSubtitle',
                      fallback:
                          'Add identity documents from Documents when you are ready to move from demo to approval flow.'),
                ),
                DashboardActivityRow(
                  title: t('tripToolsUnlockAfterApproval',
                      fallback: 'Trip tools will unlock after approval'),
                  subtitle: t('tripToolsUnlockAfterApprovalSubtitle',
                      fallback:
                          'Once KYC is approved, active trip, route timeline, and reporting actions will appear here.'),
                ),
              ],
            ),
          ),
          if (loadFailed) ...[
            const SizedBox(height: 12),
            DashboardInfoCard(
              title: t('liveSyncStatus', fallback: 'Live sync status'),
              subtitle: t('liveSyncStatusSubtitle',
                  fallback:
                      'Trip API data did not load, so this screen is showing demo fallback content instead of a hard error.'),
              icon: Icons.cloud_off_outlined,
            ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: _tripsFuture,
      builder: (context, snapshot) {
        return FutureBuilder<List<dynamic>>(
          future: _documentsFuture,
          builder: (context, documentSnapshot) {
            return FutureBuilder<List<dynamic>>(
              future: _tripPolicyFuture,
              builder: (context, policySnapshot) {
                if (snapshot.connectionState == ConnectionState.waiting &&
                    documentSnapshot.connectionState ==
                        ConnectionState.waiting &&
                    policySnapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                final missingPolicies =
                    DocumentPriorityHelper.missingPoliciesFromDocuments(
                  policySnapshot.data ?? const [],
                  documentSnapshot.data ?? const [],
                );
                final normalizedMissingPolicies = missingPolicies
                    .whereType<Map>()
                    .map((item) => Map<String, dynamic>.from(item))
                    .toList();

                if (snapshot.hasError) {
                  _syncState = 'offline';
                  _syncSource = 'cache';
                  return _buildDemoDriverHome(
                    loadFailed: true,
                    missingPolicies: normalizedMissingPolicies,
                  );
                }

                final trips = snapshot.data ?? const [];
                if (trips.isEmpty) {
                  _syncState = 'pending';
                  _syncSource = 'backend';
                  return _buildDemoDriverHome(
                    loadFailed: false,
                    missingPolicies: normalizedMissingPolicies,
                  );
                }

                final trip = trips.first as Map<String, dynamic>;
                final tripId =
                    trip['_id']?.toString() ?? trip['id']?.toString() ?? '';
                final tripCode = DashboardFormatters.text(trip['tripCode'],
                    fallback: t('trip', fallback: 'Trips'));
                final route =
                    '${DashboardFormatters.text(trip['origin'])} → ${DashboardFormatters.text(trip['destination'])}';
                final status = DashboardFormatters.driverTripStatus(
                    trip['status']?.toString());
                final checkpoint = DashboardFormatters.text(
                    trip['currentCheckpoint'],
                    fallback: t('locationNotRecorded',
                        fallback: 'Location not recorded'));
                final vehicle = DashboardFormatters.text(trip['vehicleCode'],
                    fallback:
                        t('pendingAssignment', fallback: 'Pending assignment'));
                final customer = DashboardFormatters.text(trip['customerName'],
                    fallback: t('customer', fallback: 'Customer'));
                final cargo = DashboardFormatters.text(trip['routeName'],
                    fallback: t('freightRoute', fallback: 'Freight route'));
                _syncState = 'synced';
                _syncSource = 'backend';

                return RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildSyncCard(tripId: tripId),
                      const SizedBox(height: 12),
                      if (missingPolicies.isNotEmpty) ...[
                        DocumentPriorityPanel(
                          title: DashboardExperience.tripDocumentPriorityTitle,
                          subtitle:
                              DashboardExperience.tripDocumentPrioritySubtitle,
                          policies: missingPolicies,
                          maxItems: 2,
                          leadingIcon: Icons.assignment_outlined,
                          trailingLabelBuilder: (priority) =>
                              (priority ?? 'low').toUpperCase(),
                          onPolicyTap: (policy) =>
                              _openTripDocuments(policy, tripId: tripId),
                        ),
                        const SizedBox(height: 16),
                      ],
                      Card(
                        color: const Color(0xFF15304A),
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(tripCode,
                                  style:
                                      const TextStyle(color: Colors.white70)),
                              const SizedBox(height: 8),
                              Text(
                                route,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 24,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '${t('cargo', fallback: 'Cargo')}: $cargo',
                                style:
                                    const TextStyle(color: Color(0xFFF8E7CC)),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                '${t('dispatcherNote', fallback: 'Dispatcher note')}: ${t('keepCheckpointUpdatesCurrent', fallback: 'Keep checkpoint updates and POD current during execution.')}',
                                style: const TextStyle(
                                    color: Colors.white70, height: 1.4),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                              child: DashboardMetricCard(
                                  title: t('vehicle', fallback: 'Vehicle'),
                                  value: vehicle)),
                          const SizedBox(width: 12),
                          Expanded(
                              child: DashboardMetricCard(
                                  title: t('status', fallback: 'Status'),
                                  value: status)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                              child: DashboardMetricCard(
                                  title:
                                      t('customerName', fallback: 'Customer'),
                                  value: customer)),
                          const SizedBox(width: 12),
                          Expanded(
                              child: DashboardMetricCard(
                                  title: t('checkpointLabel',
                                      fallback: 'Checkpoint'),
                                  value: checkpoint)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          FilledButton(
                            onPressed: tripId.isEmpty
                                ? null
                                : () => MobileRouteNavigator.openTripDetail(
                                      context,
                                      tripId: tripId,
                                    ),
                            child: Text(
                                t('tripDetails', fallback: 'Trip details')),
                          ),
                          FilledButton.tonal(
                            onPressed: tripId.isEmpty
                                ? null
                                : () async {
                                    final updated = await MobileRouteNavigator
                                        .openStatusUpdate(
                                      context,
                                      tripId: tripId,
                                    );
                                    if (updated == true) {
                                      await _refresh();
                                    }
                                  },
                            child: Text(
                                t('updateStatus', fallback: 'Update status')),
                          ),
                          FilledButton.tonal(
                            onPressed: tripId.isEmpty
                                ? null
                                : () => MobileRouteNavigator.openTripTimeline(
                                      context,
                                      tripId: tripId,
                                    ),
                            child: Text(t('timeline', fallback: 'Timeline')),
                          ),
                          FilledButton.tonal(
                            onPressed: () => DocumentRouteNavigator.open(
                              context,
                              baseTitle: t('tripDocuments',
                                  fallback: 'Trip documents'),
                            ),
                            child: Text(t('docsPod', fallback: 'Docs / POD')),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      DashboardInfoCard(
                        title: t('tripExecution', fallback: 'Trip execution'),
                        subtitle: t(
                          'tripExecutionSubtitle',
                          fallback:
                              'Use Reports for loading, offloading, delay, accident, breakdown, fuel, and obstacle actions.',
                        ),
                        icon: Icons.checklist_rtl_outlined,
                      ),
                      const SizedBox(height: 12),
                      DashboardInfoCard(
                        title: t('gpsTimeline', fallback: 'GPS and timeline'),
                        subtitle: t(
                          'gpsTimelineSubtitle',
                          fallback:
                              'Operations sees live movement and checkpoint updates from active trip sync.',
                        ),
                        icon: Icons.gps_fixed,
                      ),
                      const SizedBox(height: 12),
                      DashboardInfoCard(
                        title: t('documentDiscipline',
                            fallback: 'Document discipline'),
                        subtitle: missingPolicies.isEmpty
                            ? t(
                                'documentDisciplineSubtitle',
                                fallback:
                                    'Upload manifest, loading photos, offloading photos, and POD as the trip progresses.',
                              )
                            : 'Upload ${missingPolicies.first['label'] ?? 'the next required document'} early so dispatch does not wait for trip evidence at completion.',
                        icon: Icons.upload_file_outlined,
                      ),
                      const SizedBox(height: 12),
                      DashboardInfoCard(
                        title: t('aiRecommendation',
                            fallback: 'AI recommendation'),
                        subtitle:
                            DashboardExperience.driverExecutionRecommendation(
                          topMissingLabel: missingPolicies.isEmpty
                              ? null
                              : missingPolicies.first['label']?.toString(),
                          checkpoint: checkpoint,
                        ),
                        icon: Icons.auto_awesome_outlined,
                      ),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }
}
