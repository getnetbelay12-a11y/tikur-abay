import 'package:flutter/material.dart';

class AppSurfaceExperience {
  static const alertPrioritySubtitle =
      'These are the next documents worth resolving before waiting for a system-generated alert.';
  static const alertMarkedReadMessage = 'Alert marked as read.';
  static const alertCloseLabel = 'Close';
  static const alertOpenRelatedLabel = 'Open Related';
  static const alertMarkReadLabel = 'Mark Read';
  static const alertReadLabel = 'Read';
  static const alertOpenLabel = 'Open';

  static const profilePendingUpdate = 'Pending update';
  static const profilePendingAssignment = 'Pending assignment';
  static const profileDefaultBranch = 'Addis Ababa HQ';
  static const profileLogoutSubtitle =
      'Clear this device session and sign out.';

  static void showMessage(BuildContext context, String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  static String alertsEmptyMessage(String? summaryMessage) {
    return summaryMessage ?? 'No alerts right now.';
  }
}
