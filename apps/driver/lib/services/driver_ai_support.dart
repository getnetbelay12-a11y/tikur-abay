import 'logistics_demo_data.dart';

class DriverAiBrief {
  const DriverAiBrief({
    required this.title,
    required this.summary,
    required this.nextAction,
    required this.risks,
    required this.validationChecks,
    required this.secureMode,
    required this.draftIssueText,
  });

  final String title;
  final String summary;
  final String nextAction;
  final List<String> risks;
  final List<String> validationChecks;
  final String secureMode;
  final String draftIssueText;
}

class DriverAiSupport {
  static DriverAiBrief build(DriverTrip trip) {
    final nextCheckpoint = trip.checkpoints.firstWhere(
      (item) => item.status.toLowerCase() == 'pending',
      orElse: () => trip.checkpoints.isNotEmpty ? trip.checkpoints.last : const DriverCheckpointEvent(
        location: 'Assigned trip',
        timestamp: 'Pending',
        status: 'Pending',
        sealIntact: true,
        driverNote: '',
        officerNote: '',
      ),
    );

    final risks = <String>[];
    final validationChecks = <String>[];

    if (trip.containerNumber.isEmpty) {
      validationChecks.add('Container number is missing from the mobile trip.');
    }
    if (trip.sealNumber.isEmpty) {
      validationChecks.add('Seal number is missing from the mobile trip.');
    }
    if (trip.documents.isEmpty) {
      validationChecks.add('The mobile trip does not include a visible document pack.');
    }
    if (trip.checkpoints.where((item) => item.status.toLowerCase() != 'pending').isEmpty) {
      risks.add('No checkpoint has been submitted yet.');
    }
    if (trip.customsStatus.toLowerCase().contains('pending')) {
      risks.add('Customs / transit documents may still need to be checked at the next checkpoint.');
    }
    if (trip.tripStatus.toLowerCase().contains('delay') || trip.currentStage.toLowerCase().contains('hold')) {
      risks.add('The trip status indicates a delay or hold condition.');
    }

    return DriverAiBrief(
      title: 'AI Driver Copilot',
      summary: 'Driver AI keeps the trip simple: next checkpoint, document readiness, and what should be escalated before it becomes a corridor issue.',
      nextAction: nextCheckpoint.status.toLowerCase() == 'pending'
          ? 'Submit checkpoint update for ${nextCheckpoint.location}'
          : 'Review the latest trip issue or confirm the next arrival handoff',
      risks: risks,
      validationChecks: validationChecks,
      secureMode: 'AI guidance is advisory only. It never auto-submits checkpoints, issues, or customer confirmations without the driver.',
      draftIssueText: 'Checkpoint update from ${trip.tripId}: ${nextCheckpoint.location}. Container ${trip.containerNumber}, seal ${trip.sealNumber}. Please review if any delay, hold, shortage, or seal concern appears.',
    );
  }
}
