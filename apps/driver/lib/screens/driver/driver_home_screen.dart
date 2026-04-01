import 'package:flutter/material.dart';

import '../../services/assigned_driver_trip_service.dart';
import '../../services/driver_api.dart';
import '../../services/driver_ai_support.dart';
import '../../services/logistics_demo_data.dart'
    show
        CustomerSupportThread,
        DriverCheckpointEvent,
        DriverIssueRecord,
        DriverTrip,
        LogisticsDemoData;

class DriverHomeScreen extends StatefulWidget {
  const DriverHomeScreen({super.key});

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen>
    with WidgetsBindingObserver {
  late Future<DriverTrip> _future;
  final _scrollController = ScrollController();
  final _checkpointSectionKey = GlobalKey();
  final _issuesSectionKey = GlobalKey();
  final _documentsSectionKey = GlobalKey();
  final _checkpointNoteController = TextEditingController();
  String _checkpointStatus = 'passed';
  bool _sealIntact = true;
  String _selectedCheckpoint = '';
  bool _submittingCheckpoint = false;
  String _checkpointMessage = '';

  bool _isActionableCheckpoint(DriverCheckpointEvent checkpoint) {
    final status = checkpoint.status.trim().toLowerCase();
    return status == 'current' || status == 'pending';
  }

  List<DriverCheckpointEvent> _uniqueCheckpointOptions(
      List<DriverCheckpointEvent> checkpoints) {
    final seen = <String>{};
    return checkpoints.where((checkpoint) {
      final key = checkpoint.location.trim().toLowerCase();
      if (key.isEmpty || seen.contains(key)) return false;
      seen.add(key);
      return true;
    }).toList();
  }

  Future<void> _scrollToSection(GlobalKey key) async {
    final context = key.currentContext;
    if (context == null) return;
    await Scrollable.ensureVisible(
      context,
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOutCubic,
      alignment: 0.08,
    );
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _future = _load();
  }

  Future<DriverTrip> _load() async =>
      AssignedDriverTripService.loadAssignedTrip();

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      setState(() {
        _future = _load();
      });
    }
  }

  Future<void> _submitCheckpointUpdate(DriverTrip trip) async {
    if (_selectedCheckpoint.isEmpty || _submittingCheckpoint) return;
    final submittedCheckpoint = _selectedCheckpoint;
    setState(() {
      _submittingCheckpoint = true;
      _checkpointMessage = '';
    });
    try {
      await DriverApi.submitCorridorCheckpointUpdate(
        tripId: trip.tripId,
        location: submittedCheckpoint,
        status: _checkpointStatus,
        sealIntact: _sealIntact,
        note: _checkpointNoteController.text.trim(),
      );
      final refreshedTrip = await _load();
      final refreshedOptions = _uniqueCheckpointOptions(
        refreshedTrip.checkpoints.where(_isActionableCheckpoint).toList(),
      );
      final nextCheckpoint =
          refreshedOptions.isEmpty ? '' : refreshedOptions.first.location;
      setState(() {
        _future = Future.value(refreshedTrip);
        _selectedCheckpoint = nextCheckpoint;
        _checkpointStatus = 'passed';
        _sealIntact = true;
        _checkpointNoteController.clear();
        _checkpointMessage = nextCheckpoint.isEmpty
            ? 'Checkpoint update submitted for $submittedCheckpoint.'
            : 'Checkpoint update submitted for $submittedCheckpoint. Next checkpoint: $nextCheckpoint.';
      });
    } catch (error) {
      setState(() {
        _checkpointMessage = 'Checkpoint update failed. Try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _submittingCheckpoint = false;
        });
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _scrollController.dispose();
    _checkpointNoteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<DriverTrip>(
      future: _future,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final trip = snapshot.data!;
        if (trip.tripId == 'UNASSIGNED') {
          return RefreshIndicator(
            onRefresh: () async {
              setState(() {
                _future = _load();
              });
              await _future;
            },
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: const [
                SizedBox(height: 160),
                Center(
                  child: Text(
                    'No active trip is assigned right now. Pull to refresh after dispatch pushes your next trip.',
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          );
        }
        final aiBrief = DriverAiSupport.build(trip);
        final liveThreads = LogisticsDemoData.supportThreads.take(2).toList();
        final nextCheckpoint = trip.checkpoints
                .cast<DriverCheckpointEvent?>()
                .firstWhere(
                  (checkpoint) =>
                      checkpoint != null && _isActionableCheckpoint(checkpoint),
                  orElse: () => trip.checkpoints.isNotEmpty
                      ? trip.checkpoints.last
                      : null,
                ) ??
            const DriverCheckpointEvent(
              location: 'No checkpoint loaded',
              timestamp: 'Pending',
              status: 'Pending',
              sealIntact: true,
              driverNote: 'Wait for dispatch to push the corridor update.',
              officerNote: 'No checkpoint packet is loaded yet.',
            );
        final checkpointOptions = _uniqueCheckpointOptions(
            trip.checkpoints.where(_isActionableCheckpoint).toList());
        final checkpointOptionLocations =
            checkpointOptions.map((checkpoint) => checkpoint.location).toList();
        final selectedCheckpointValue =
            checkpointOptionLocations.contains(_selectedCheckpoint)
                ? _selectedCheckpoint
                : (checkpointOptionLocations.isEmpty
                    ? null
                    : checkpointOptionLocations.first);
        if (selectedCheckpointValue != _selectedCheckpoint) {
          _selectedCheckpoint = selectedCheckpointValue ?? '';
        }
        return RefreshIndicator(
            onRefresh: () async {
              setState(() {
                _future = _load();
              });
              await _future;
            },
            child: ListView(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF16324D),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        trip.driverType,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.72),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        trip.tripId,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${trip.customer} · ${trip.route}',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.82),
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                              child: _HeroFact(
                                  label: 'Status', value: trip.tripStatus)),
                          Expanded(
                              child: _HeroFact(
                                  label: 'ETA', value: trip.etaSummary)),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.qr_code_2_outlined,
                        title: 'Open transit pack',
                        subtitle: 'Checkpoint-ready customs packet',
                        onTap: () => _scrollToSection(_documentsSectionKey),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.route_outlined,
                        title: 'Checkpoint update',
                        subtitle: 'Submit next corridor event',
                        onTap: () => _scrollToSection(_checkpointSectionKey),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.report_outlined,
                        title: 'Report issue',
                        subtitle: 'Customs, seal, delay, fuel',
                        onTap: () => _scrollToSection(_issuesSectionKey),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.description_outlined,
                        title: 'View documents',
                        subtitle: 'BL, packing, transit, release',
                        onTap: () => _scrollToSection(_documentsSectionKey),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Card(
                  key: _checkpointSectionKey,
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Next checkpoint',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 10),
                        _InfoRow(
                            label: 'Location', value: nextCheckpoint.location),
                        _InfoRow(label: 'Status', value: nextCheckpoint.status),
                        _InfoRow(
                            label: 'Driver note',
                            value: nextCheckpoint.driverNote),
                        _InfoRow(
                            label: 'Officer note',
                            value: nextCheckpoint.officerNote),
                        const SizedBox(height: 14),
                        DropdownButtonFormField<String>(
                          key: ValueKey<String>(
                              selectedCheckpointValue ?? 'checkpoint-empty'),
                          initialValue: selectedCheckpointValue,
                          decoration: const InputDecoration(
                            labelText: 'Checkpoint location',
                            border: OutlineInputBorder(),
                          ),
                          items: checkpointOptions
                              .map(
                                (checkpoint) => DropdownMenuItem<String>(
                                  value: checkpoint.location,
                                  child: Text(checkpoint.location),
                                ),
                              )
                              .toList(),
                          onChanged: checkpointOptions.isEmpty
                              ? null
                              : (value) {
                                  if (value == null) return;
                                  setState(() {
                                    _selectedCheckpoint = value;
                                  });
                                },
                        ),
                        const SizedBox(height: 10),
                        DropdownButtonFormField<String>(
                          initialValue: _checkpointStatus,
                          decoration: const InputDecoration(
                            labelText: 'Checkpoint status',
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(
                                value: 'passed', child: Text('Passed')),
                            DropdownMenuItem(
                                value: 'hold', child: Text('Hold')),
                            DropdownMenuItem(
                                value: 'delayed', child: Text('Delayed')),
                          ],
                          onChanged: (value) {
                            if (value == null) return;
                            setState(() {
                              _checkpointStatus = value;
                            });
                          },
                        ),
                        const SizedBox(height: 10),
                        SwitchListTile.adaptive(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Seal intact'),
                          value: _sealIntact,
                          onChanged: (value) {
                            setState(() {
                              _sealIntact = value;
                            });
                          },
                        ),
                        TextField(
                          controller: _checkpointNoteController,
                          minLines: 2,
                          maxLines: 3,
                          decoration: const InputDecoration(
                            labelText: 'Checkpoint note',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed:
                              checkpointOptions.isEmpty || _submittingCheckpoint
                                  ? null
                                  : () => _submitCheckpointUpdate(trip),
                          child: Text(
                            _submittingCheckpoint
                                ? 'Submitting...'
                                : 'Submit checkpoint update',
                          ),
                        ),
                        if (_checkpointMessage.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Text(
                            _checkpointMessage,
                            style: TextStyle(
                              color: _checkpointMessage.contains('failed')
                                  ? const Color(0xFFB42318)
                                  : const Color(0xFF0F766E),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                        const SizedBox(height: 14),
                        const Text(
                          'Corridor checkpoint timeline',
                          style: TextStyle(
                              fontSize: 15, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 10),
                        ...trip.checkpoints.map(
                          (checkpoint) =>
                              _CheckpointTimelineRow(checkpoint: checkpoint),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  key: _documentsSectionKey,
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Border and customs packet',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'Keep these documents ready for Djibouti customs and border checkpoints.',
                          style:
                              TextStyle(color: Color(0xFF5B677A), height: 1.4),
                        ),
                        const SizedBox(height: 12),
                        _InfoRow(
                            label: 'T1',
                            value:
                                '${trip.transitDocumentType} · ${trip.transitDocumentNumber}'),
                        _InfoRow(label: 'Invoice', value: trip.invoiceNumber),
                        _InfoRow(
                            label: 'Packing list',
                            value: trip.packingListNumber),
                        _InfoRow(label: 'Transport doc', value: trip.blNumber),
                        _InfoRow(label: 'Truck', value: trip.truckPlate),
                        _InfoRow(label: 'Trailer', value: trip.trailerPlate),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  key: _issuesSectionKey,
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Checkpoint actions',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 10),
                        _InfoRow(
                            label: 'Next stop', value: nextCheckpoint.location),
                        _InfoRow(
                            label: 'Current status',
                            value: nextCheckpoint.status),
                        _InfoRow(
                            label: 'Driver note',
                            value: nextCheckpoint.driverNote),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: const [
                            _HomeActionChip(label: 'Submit checkpoint update'),
                            _HomeActionChip(label: 'Report hold'),
                            _HomeActionChip(label: 'Confirm arrival'),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Issues and live chat',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 10),
                        if (trip.issues.isEmpty)
                          const Text(
                            'No open issue is logged on this trip right now.',
                            style: TextStyle(color: Color(0xFF5B677A)),
                          )
                        else
                          ...trip.issues.take(2).map(
                                (issue) => _IssuePreviewRow(issue: issue),
                              ),
                        const SizedBox(height: 12),
                        ...liveThreads
                            .map((thread) => _ChatPreviewRow(thread: thread)),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: const [
                            _HomeActionChip(label: 'Open live chat'),
                            _HomeActionChip(label: 'Submit issue report'),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  color: const Color(0xFF16324D),
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    aiBrief.title,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 17,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    aiBrief.summary,
                                    style: TextStyle(
                                      color:
                                          Colors.white.withValues(alpha: 0.82),
                                      height: 1.45,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF28C34),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: const Text(
                                'Secure',
                                style: TextStyle(
                                  color: Color(0xFF10233E),
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Next best action',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.72),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                aiBrief.nextAction,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (aiBrief.risks.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          _DriverAiList(
                              title: 'Risk signals', items: aiBrief.risks),
                        ],
                        if (aiBrief.validationChecks.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          _DriverAiList(
                              title: 'Validation checks',
                              items: aiBrief.validationChecks),
                        ],
                        const SizedBox(height: 12),
                        _DriverAiList(
                            title: 'Secure mode', items: [aiBrief.secureMode]),
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Draft issue note',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.72),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                aiBrief.draftIssueText,
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.9),
                                  height: 1.45,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Assigned trip summary',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 12),
                        _InfoRow(label: 'Booking', value: trip.bookingNumber),
                        _InfoRow(
                            label: 'Container', value: trip.containerNumber),
                        _InfoRow(label: 'Seal', value: trip.sealNumber),
                        _InfoRow(label: 'Truck', value: trip.truckPlate),
                        _InfoRow(
                            label: 'Dispatch note', value: trip.dispatchNote),
                      ],
                    ),
                  ),
                ),
              ],
            ));
      },
    );
  }
}

String _formatCheckpointTimelineMeta(DriverCheckpointEvent checkpoint) {
  final normalizedStatus = checkpoint.status.trim().toLowerCase();
  final normalizedTimestamp = checkpoint.timestamp.trim().toLowerCase();
  if (normalizedStatus == 'passed' &&
      (normalizedTimestamp == 'departure pending' ||
          normalizedTimestamp == 'pending')) {
    return '${checkpoint.status} · Recorded';
  }
  if (normalizedStatus == 'current' && normalizedTimestamp == 'pending') {
    return '${checkpoint.status} · Awaiting update';
  }
  return '${checkpoint.status} · ${checkpoint.timestamp}';
}

class _HeroFact extends StatelessWidget {
  const _HeroFact({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.66),
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style:
              const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  const _QuickActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: const Color(0xFF16324D)),
              const SizedBox(height: 10),
              Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text(subtitle, style: const TextStyle(color: Color(0xFF5B677A))),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeActionChip extends StatelessWidget {
  const _HomeActionChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFEEF3F9),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Color(0xFF16324D),
          fontWeight: FontWeight.w800,
        ),
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
          SizedBox(
            width: 96,
            child: Text(
              label,
              style: const TextStyle(
                color: Color(0xFF5B677A),
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Expanded(
              child: Text(value,
                  style: const TextStyle(fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}

class _IssuePreviewRow extends StatelessWidget {
  const _IssuePreviewRow({required this.issue});

  final DriverIssueRecord issue;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F9FC),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(issue.type, style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(issue.note, style: const TextStyle(height: 1.35)),
          const SizedBox(height: 4),
          Text(
            '${issue.timestamp} · ${issue.status}',
            style: const TextStyle(color: Color(0xFF5B677A), fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _CheckpointTimelineRow extends StatelessWidget {
  const _CheckpointTimelineRow({required this.checkpoint});

  final DriverCheckpointEvent checkpoint;

  @override
  Widget build(BuildContext context) {
    final passed = checkpoint.status.toLowerCase() == 'passed';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: passed ? const Color(0xFFF0FDF4) : const Color(0xFFF7F9FC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: passed ? const Color(0xFF86EFAC) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 12,
            height: 12,
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(
              color: passed ? const Color(0xFF16A34A) : const Color(0xFF94A3B8),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  checkpoint.location,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  _formatCheckpointTimelineMeta(checkpoint),
                  style: const TextStyle(
                    color: Color(0xFF5B677A),
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  checkpoint.driverNote,
                  style: const TextStyle(height: 1.35),
                ),
                const SizedBox(height: 4),
                Text(
                  checkpoint.officerNote,
                  style: const TextStyle(
                    color: Color(0xFF5B677A),
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatPreviewRow extends StatelessWidget {
  const _ChatPreviewRow({required this.thread});

  final CustomerSupportThread thread;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F9FC),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(thread.title,
              style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(thread.preview, style: const TextStyle(height: 1.35)),
          const SizedBox(height: 4),
          Text(
            '${thread.channel} · ${thread.timestamp}',
            style: const TextStyle(color: Color(0xFF5B677A), fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _DriverAiList extends StatelessWidget {
  const _DriverAiList({required this.title, required this.items});

  final String title;
  final List<String> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.72),
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 6),
        ...items.map(
          (item) => Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.only(top: 6),
                  child: Icon(Icons.circle, size: 7, color: Color(0xFFF8C37A)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    item,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
