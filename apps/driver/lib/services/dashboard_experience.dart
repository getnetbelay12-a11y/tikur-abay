class DashboardExperience {
  static const documentPriorityTitle = 'Document priority';
  static const documentPrioritySubtitle =
      'Prepare these documents first so quotes, agreements, and invoicing do not wait on compliance later.';

  static const tripDocumentPriorityTitle = 'Trip document priority';
  static const tripDocumentPrioritySubtitle =
      'Keep these documents ready during execution so dispatch does not need to chase trip completion evidence later.';

  static const noAssignedTripMessage = 'No assigned trip right now.';
  static const noActiveTripMessage =
      'No trips are active yet. Once a booking is assigned, trip milestones and ETA will appear here.';

  static const assignedTripsOverviewMessage =
      'Assigned trips, ETA, milestones, and document status.';

  static String customerBookingPrompt(String? topMissingLabel) {
    if (topMissingLabel == null || topMissingLabel.isEmpty) {
      return 'Open Availability or Quotes to request transport and reserve fleet.';
    }
    return 'Open Availability or Quotes to request transport. Prepare $topMissingLabel first so booking documents do not stall later.';
  }

  static String customerNoTripsPrompt(String? topMissingLabel) {
    if (topMissingLabel == null || topMissingLabel.isEmpty) {
      return noActiveTripMessage;
    }
    return 'No trips are active yet. Before the first assignment, keep $topMissingLabel ready so operations can move without a document chase.';
  }

  static String customerRecommendation({
    required int pendingInvoices,
    required String unpaidInvoicesLabel,
    required String chatSupportLabel,
    String? topMissingLabel,
  }) {
    if (pendingInvoices > 0) {
      return '$pendingInvoices $unpaidInvoicesLabel · $chatSupportLabel';
    }
    if (topMissingLabel == null || topMissingLabel.isEmpty) {
      return assignedTripsOverviewMessage;
    }
    return 'Prepare $topMissingLabel next. It is the highest-priority missing document in your workspace.';
  }

  static String driverNoAssignedTripPrompt(String? topMissingLabel) {
    if (topMissingLabel == null || topMissingLabel.isEmpty) {
      return noAssignedTripMessage;
    }
    return 'No assigned trip right now. Keep $topMissingLabel ready so the first dispatch can move cleanly.';
  }

  static String customerAvailabilityRecommendation({
    required String vehicleType,
    String? topLane,
  }) {
    if (topLane == null || topLane.isEmpty) {
      return 'Recommended next step: request a quote for the selected $vehicleType capacity, then upload key customer documents before approval is needed.';
    }
    return 'Recommended next step: request a quote for $topLane using the selected $vehicleType capacity, then keep customer documents ready so approval does not stall.';
  }

  static String driverExecutionRecommendation({
    String? topMissingLabel,
    required String checkpoint,
  }) {
    if (topMissingLabel == null || topMissingLabel.isEmpty) {
      return 'Recommended next step: keep checkpoint updates current and submit route evidence from $checkpoint so dispatch has clean execution visibility.';
    }
    return 'Recommended next step: upload $topMissingLabel and keep checkpoint updates current from $checkpoint so dispatch can close the trip without document chase.';
  }
}
