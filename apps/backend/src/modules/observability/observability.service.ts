import { Injectable } from '@nestjs/common';
import {
  ActivityLogModel,
  AgreementModel,
  CandidateModel,
  ChatMessageModel,
  DocumentModel,
  DriverReportModel,
  EmployeePerformanceMetricModel,
  IncidentReportModel,
  InvoiceModel,
  MaintenanceNotificationModel,
  MaintenancePlanModel,
  NotificationModel,
  PaymentModel,
  TripModel,
  UploadedDocumentModel,
  VehicleModel,
} from '../../database/models';

@Injectable()
export class ObservabilityService {
  async getSummary() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      vehiclesByStatus,
      activeTrips,
      delayedTrips,
      maintenanceDue,
      blockedVehicles,
      openIncidents,
      openDriverReports,
      overdueInvoices,
      collectionsEscalated,
      documentsToday,
      uploadedDocumentsToday,
      fuelActivityToday,
      notificationsUnread,
      activityFeedToday,
      chatMessagesToday,
      agreementsAwaitingSignature,
      signedAgreementsThisWeek,
      candidatesActive,
      employeePerformanceAverage,
    ] = await Promise.all([
      VehicleModel.aggregate([
        { $group: { _id: '$currentStatus', count: { $sum: 1 } } },
      ]),
      TripModel.countDocuments({ status: { $in: ['assigned', 'loading', 'loaded', 'in_transit', 'on_road', 'offloading', 'in_djibouti'] } }),
      TripModel.countDocuments({ status: 'delayed' }),
      MaintenancePlanModel.countDocuments({ status: { $in: ['due_soon', 'overdue'] } }),
      VehicleModel.countDocuments({ currentStatus: 'blocked' }),
      IncidentReportModel.countDocuments({ status: { $in: ['submitted', 'under_review', 'open'] } }),
      DriverReportModel.countDocuments({ status: { $in: ['submitted', 'under_review', 'approved'] } }),
      InvoiceModel.countDocuments({ status: 'overdue' }),
      NotificationModel.countDocuments({ type: { $in: ['collection_escalated', 'invoice_overdue'] } }),
      DocumentModel.countDocuments({ createdAt: { $gte: last24h } }),
      UploadedDocumentModel.countDocuments({ createdAt: { $gte: last24h } }),
      ActivityLogModel.countDocuments({ activityType: { $in: ['fuel_log', 'fuel_request'] }, createdAt: { $gte: last24h } }),
      NotificationModel.countDocuments({ isRead: false }),
      ActivityLogModel.countDocuments({ createdAt: { $gte: last24h } }),
      ChatMessageModel.countDocuments({ createdAt: { $gte: last24h } }),
      AgreementModel.countDocuments({ status: { $in: ['under_review', 'sent_for_signature'] } }),
      AgreementModel.countDocuments({ status: 'signed', updatedAt: { $gte: weekStart } }),
      CandidateModel.countDocuments({ status: { $in: ['applied', 'screening', 'under_review', 'interview_scheduled', 'interviewed', 'offered'] } }),
      EmployeePerformanceMetricModel.aggregate([
        { $group: { _id: null, avgScore: { $avg: '$performanceScore' } } },
      ]),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      fleet: {
        byStatus: toCountMap(vehiclesByStatus),
        activeTrips,
        delayedTrips,
        blockedVehicles,
      },
      maintenance: {
        due: maintenanceDue,
        notificationsOpen: await MaintenanceNotificationModel.countDocuments({ status: { $in: ['queued', 'sent'] } }),
      },
      incidents: {
        open: openIncidents,
        driverReportsOpen: openDriverReports,
      },
      finance: {
        overdueInvoices,
        escalatedCollections: collectionsEscalated,
        paymentsToday: await PaymentModel.countDocuments({ paymentDate: { $gte: last24h } }),
      },
      documents: {
        documentsToday,
        uploadedDocumentsToday,
      },
      activity: {
        activityFeedToday,
        fuelActivityToday,
        chatMessagesToday,
        unreadNotifications: notificationsUnread,
      },
      commercial: {
        agreementsAwaitingSignature,
        signedAgreementsThisWeek,
      },
      hr: {
        activeCandidates: candidatesActive,
        averageEmployeePerformance: Number(employeePerformanceAverage[0]?.avgScore ?? 0).toFixed(2),
      },
    };
  }

  async getPrometheusText() {
    const summary = await this.getSummary();
    const lines = [
      '# HELP tikur_abay_fleet_active_trips Current number of active trips',
      '# TYPE tikur_abay_fleet_active_trips gauge',
      `tikur_abay_fleet_active_trips ${summary.fleet.activeTrips}`,
      '# HELP tikur_abay_fleet_delayed_trips Current number of delayed trips',
      '# TYPE tikur_abay_fleet_delayed_trips gauge',
      `tikur_abay_fleet_delayed_trips ${summary.fleet.delayedTrips}`,
      '# HELP tikur_abay_fleet_blocked_vehicles Current number of blocked vehicles',
      '# TYPE tikur_abay_fleet_blocked_vehicles gauge',
      `tikur_abay_fleet_blocked_vehicles ${summary.fleet.blockedVehicles}`,
      '# HELP tikur_abay_maintenance_due Current number of due maintenance items',
      '# TYPE tikur_abay_maintenance_due gauge',
      `tikur_abay_maintenance_due ${summary.maintenance.due}`,
      '# HELP tikur_abay_incidents_open Current number of open incidents',
      '# TYPE tikur_abay_incidents_open gauge',
      `tikur_abay_incidents_open ${summary.incidents.open}`,
      '# HELP tikur_abay_driver_reports_open Current number of open driver reports',
      '# TYPE tikur_abay_driver_reports_open gauge',
      `tikur_abay_driver_reports_open ${summary.incidents.driverReportsOpen}`,
      '# HELP tikur_abay_finance_overdue_invoices Current number of overdue invoices',
      '# TYPE tikur_abay_finance_overdue_invoices gauge',
      `tikur_abay_finance_overdue_invoices ${summary.finance.overdueInvoices}`,
      '# HELP tikur_abay_activity_unread_notifications Current number of unread notifications',
      '# TYPE tikur_abay_activity_unread_notifications gauge',
      `tikur_abay_activity_unread_notifications ${summary.activity.unreadNotifications}`,
      '# HELP tikur_abay_documents_uploaded_today Number of uploaded documents in the last 24 hours',
      '# TYPE tikur_abay_documents_uploaded_today gauge',
      `tikur_abay_documents_uploaded_today ${summary.documents.uploadedDocumentsToday}`,
    ];

    return `${lines.join('\n')}\n`;
  }
}

function toCountMap(rows: Array<{ _id: string | null; count: number }>) {
  return rows.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row._id || 'unknown'] = row.count;
    return accumulator;
  }, {});
}
