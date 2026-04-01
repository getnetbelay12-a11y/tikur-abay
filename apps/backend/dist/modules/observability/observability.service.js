"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityService = void 0;
const common_1 = require("@nestjs/common");
const models_1 = require("../../database/models");
let ObservabilityService = class ObservabilityService {
    async getSummary() {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const [vehiclesByStatus, activeTrips, delayedTrips, maintenanceDue, blockedVehicles, openIncidents, openDriverReports, overdueInvoices, collectionsEscalated, documentsToday, uploadedDocumentsToday, fuelActivityToday, notificationsUnread, activityFeedToday, chatMessagesToday, agreementsAwaitingSignature, signedAgreementsThisWeek, candidatesActive, employeePerformanceAverage,] = await Promise.all([
            models_1.VehicleModel.aggregate([
                { $group: { _id: '$currentStatus', count: { $sum: 1 } } },
            ]),
            models_1.TripModel.countDocuments({ status: { $in: ['assigned', 'loading', 'loaded', 'in_transit', 'on_road', 'offloading', 'in_djibouti'] } }),
            models_1.TripModel.countDocuments({ status: 'delayed' }),
            models_1.MaintenancePlanModel.countDocuments({ status: { $in: ['due_soon', 'overdue'] } }),
            models_1.VehicleModel.countDocuments({ currentStatus: 'blocked' }),
            models_1.IncidentReportModel.countDocuments({ status: { $in: ['submitted', 'under_review', 'open'] } }),
            models_1.DriverReportModel.countDocuments({ status: { $in: ['submitted', 'under_review', 'approved'] } }),
            models_1.InvoiceModel.countDocuments({ status: 'overdue' }),
            models_1.NotificationModel.countDocuments({ type: { $in: ['collection_escalated', 'invoice_overdue'] } }),
            models_1.DocumentModel.countDocuments({ createdAt: { $gte: last24h } }),
            models_1.UploadedDocumentModel.countDocuments({ createdAt: { $gte: last24h } }),
            models_1.ActivityLogModel.countDocuments({ activityType: { $in: ['fuel_log', 'fuel_request'] }, createdAt: { $gte: last24h } }),
            models_1.NotificationModel.countDocuments({ isRead: false }),
            models_1.ActivityLogModel.countDocuments({ createdAt: { $gte: last24h } }),
            models_1.ChatMessageModel.countDocuments({ createdAt: { $gte: last24h } }),
            models_1.AgreementModel.countDocuments({ status: { $in: ['under_review', 'sent_for_signature'] } }),
            models_1.AgreementModel.countDocuments({ status: 'signed', updatedAt: { $gte: weekStart } }),
            models_1.CandidateModel.countDocuments({ status: { $in: ['applied', 'screening', 'under_review', 'interview_scheduled', 'interviewed', 'offered'] } }),
            models_1.EmployeePerformanceMetricModel.aggregate([
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
                notificationsOpen: await models_1.MaintenanceNotificationModel.countDocuments({ status: { $in: ['queued', 'sent'] } }),
            },
            incidents: {
                open: openIncidents,
                driverReportsOpen: openDriverReports,
            },
            finance: {
                overdueInvoices,
                escalatedCollections: collectionsEscalated,
                paymentsToday: await models_1.PaymentModel.countDocuments({ paymentDate: { $gte: last24h } }),
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
};
exports.ObservabilityService = ObservabilityService;
exports.ObservabilityService = ObservabilityService = __decorate([
    (0, common_1.Injectable)()
], ObservabilityService);
function toCountMap(rows) {
    return rows.reduce((accumulator, row) => {
        accumulator[row._id || 'unknown'] = row.count;
        return accumulator;
    }, {});
}
//# sourceMappingURL=observability.service.js.map