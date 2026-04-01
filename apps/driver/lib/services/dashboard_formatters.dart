import '../app_language.dart';

class DashboardFormatters {
  static String text(Object? value, {String? fallback}) {
    final text = value?.toString().trim();
    if (text == null || text.isEmpty || text == 'undefined' || text == 'null') {
      return fallback ?? t('notAvailable', fallback: 'Not available');
    }
    return text;
  }

  static String date(String? value, {String? fallback}) {
    if (value == null || value.isEmpty) {
      return fallback ?? t('timeNotRecorded', fallback: 'Time not recorded');
    }
    final parsed = DateTime.tryParse(value);
    if (parsed == null) return value;
    return '${parsed.year}-${parsed.month.toString().padLeft(2, '0')}-${parsed.day.toString().padLeft(2, '0')}';
  }

  static String money(double value, {String currency = 'ETB'}) {
    return '$currency ${value.toStringAsFixed(0)}';
  }

  static int countByStatus(Object? value, int fallbackCount) {
    if (value == null) return fallbackCount;
    final text = value.toString();
    if (text.isEmpty || text == 'none') return 0;
    return fallbackCount == 0 ? 1 : fallbackCount;
  }

  static String customerStatus(String? value) {
    switch (value) {
      case 'requested':
        return t('submitted', fallback: 'Submitted');
      case 'approved':
        return t('completed', fallback: 'Completed');
      case 'pending':
        return t('pendingApproval', fallback: 'Pending approval');
      default:
        return text(value,
            fallback: t('notAvailable', fallback: 'Not available'));
    }
  }

  static String driverTripStatus(String? value) {
    switch (value) {
      case 'assigned':
        return t('currentAssignment', fallback: 'Current assignment');
      case 'loading':
        return t('loadingCompleted', fallback: 'Loading completed');
      case 'in_transit':
        return t('active', fallback: 'Active');
      case 'delayed':
        return t('delayed', fallback: 'Delayed');
      case 'completed':
        return t('completed', fallback: 'Completed');
      default:
        return text(value, fallback: t('status', fallback: 'Status'));
    }
  }
}
