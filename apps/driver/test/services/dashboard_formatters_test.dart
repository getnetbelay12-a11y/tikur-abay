import 'package:flutter_test/flutter_test.dart';
import 'package:tikur_abay_driver/services/dashboard_experience.dart';
import 'package:tikur_abay_driver/services/dashboard_formatters.dart';

void main() {
  group('DashboardFormatters', () {
    test('formats text, dates, money, and counts', () {
      expect(DashboardFormatters.text(null, fallback: 'Fallback'), 'Fallback');
      expect(DashboardFormatters.text(' Addis '), 'Addis');
      expect(
        DashboardFormatters.date('2026-03-16T10:15:00Z'),
        '2026-03-16',
      );
      expect(DashboardFormatters.money(280000), 'ETB 280000');
      expect(DashboardFormatters.countByStatus('none', 1), 0);
      expect(DashboardFormatters.countByStatus('pending', 0), 1);
    });

    test('maps customer and driver statuses', () {
      expect(DashboardFormatters.customerStatus('requested'), 'Submitted');
      expect(
        DashboardFormatters.driverTripStatus('in_transit'),
        'Active',
      );
    });
  });

  group('DashboardExperience', () {
    test('builds customer and driver guidance from missing labels', () {
      expect(
        DashboardExperience.customerBookingPrompt(null),
        contains('Open Availability or Quotes'),
      );
      expect(
        DashboardExperience.customerNoTripsPrompt('Trade License'),
        contains('Trade License'),
      );
      expect(
        DashboardExperience.driverNoAssignedTripPrompt('Proof of delivery'),
        contains('Proof of delivery'),
      );
    });

    test('builds customer recommendation priorities', () {
      expect(
        DashboardExperience.customerRecommendation(
          pendingInvoices: 2,
          unpaidInvoicesLabel: 'Unpaid invoices',
          chatSupportLabel: 'Chat support',
        ),
        '2 Unpaid invoices · Chat support',
      );

      expect(
        DashboardExperience.customerRecommendation(
          pendingInvoices: 0,
          unpaidInvoicesLabel: 'Unpaid invoices',
          chatSupportLabel: 'Chat support',
          topMissingLabel: 'TIN Certificate',
        ),
        contains('TIN Certificate'),
      );
    });
  });
}
