"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardsService = void 0;
const common_1 = require("@nestjs/common");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const gps_service_1 = require("../gps/gps.service");
const maintenance_service_1 = require("../maintenance/maintenance.service");
const ai_command_center_service_1 = require("./ai-command-center.service");
const EXECUTIVE_SUMMARY_TTL_MS = 30_000;
const EXECUTIVE_WORKSPACE_TTL_MS = 15_000;
const HEAD_OFFICE_COMMAND_CENTER_TTL_MS = 15_000;
let executiveSummaryCache = null;
let executiveWorkspaceCache = {};
let headOfficeCommandCenterCache = null;
let DashboardsService = class DashboardsService {
    constructor(gpsService, maintenanceService, aiCommandCenterService) {
        this.gpsService = gpsService;
        this.maintenanceService = maintenanceService;
        this.aiCommandCenterService = aiCommandCenterService;
    }
    async getExecutiveSummary() {
        if (executiveSummaryCache && executiveSummaryCache.expiresAt > Date.now()) {
            return executiveSummaryCache.payload;
        }
        await (0, mongo_1.connectToDatabase)();
        const [liveFleet, totalVehicles, tripsInTransit, delayedTrips, vehiclesInDjibouti, maintenanceDue, overdueMaintenance, blockedVehicles, openDriverReports, accidentReports, outstandingInvoices, latestTrips, latestAgreements, latestPayments, topCustomers, revenueByRoute, maintenanceDueVehicles, lowPerformingDrivers, unpaidInvoices, employeeMetricRows, driverMetricRows, openIncidentRows] = await Promise.all([
            this.gpsService.getLiveFleet({}),
            models_1.VehicleModel.countDocuments({ currentStatus: { $ne: 'inactive' } }),
            models_1.TripModel.countDocuments({ status: { $in: ['in_transit', 'at_border', 'in_djibouti', 'offloading'] } }),
            models_1.TripModel.countDocuments({ status: 'delayed' }),
            models_1.TripModel.countDocuments({ status: 'in_djibouti' }),
            models_1.MaintenancePlanModel.countDocuments({ status: { $in: ['active', 'due', 'overdue'] } }),
            models_1.MaintenancePlanModel.countDocuments({ overdue: true }),
            models_1.MaintenancePlanModel.countDocuments({ blockedAssignment: true }),
            models_1.DriverReportModel.countDocuments({ status: { $in: ['submitted', 'under_review'] } }),
            models_1.DriverReportModel.countDocuments({ type: 'accident_report', status: { $in: ['submitted', 'under_review'] } }),
            models_1.InvoiceModel.countDocuments({ status: { $in: ['pending', 'partially_paid', 'overdue'] } }),
            models_1.TripModel.find()
                .sort({ createdAt: -1 })
                .limit(8)
                .select('tripCode customerName routeName status revenueAmount')
                .lean(),
            models_1.AgreementModel.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select('agreementCode customerName status totalValue')
                .lean(),
            models_1.PaymentModel.find()
                .sort({ paymentDate: -1 })
                .limit(5)
                .select('paymentCode invoiceCode amount status paymentDate')
                .lean(),
            models_1.InvoiceModel.aggregate([
                { $match: { customerId: { $ne: null } } },
                {
                    $group: {
                        _id: '$customerId',
                        invoiceTotal: { $sum: '$totalAmount' },
                        outstandingAmount: { $sum: '$outstandingAmount' },
                        tripVolume: { $sum: 1 },
                    },
                },
                { $sort: { invoiceTotal: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'customers',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'customer',
                    },
                },
                { $unwind: '$customer' },
                {
                    $project: {
                        companyName: '$customer.companyName',
                        customerCode: '$customer.customerCode',
                        invoiceTotal: 1,
                        outstandingAmount: 1,
                        tripVolume: 1,
                    },
                },
            ]),
            models_1.TripModel.aggregate([
                { $match: { routeName: { $ne: null }, revenueAmount: { $gt: 0 } } },
                { $group: { _id: '$routeName', revenue: { $sum: '$revenueAmount' }, trips: { $sum: 1 } } },
                { $sort: { revenue: -1 } },
                { $limit: 6 },
            ]),
            models_1.MaintenancePlanModel.find({ status: { $in: ['active', 'due', 'overdue'] } })
                .sort({ overdue: -1, nextDueDate: 1 })
                .limit(8)
                .select('vehicleId vehicleCode serviceItemName overdue blockedAssignment')
                .lean(),
            models_1.DriverPerformanceMetricModel.find()
                .sort({ performanceScore: 1, periodEnd: -1 })
                .limit(6)
                .select('driverCode name performanceScore delayedTrips accidentCount')
                .lean(),
            models_1.InvoiceModel.find({ status: { $in: ['pending', 'partially_paid', 'overdue'] } })
                .sort({ dueDate: 1 })
                .limit(8)
                .select('invoiceCode customerName outstandingAmount status dueDate')
                .lean(),
            models_1.EmployeePerformanceMetricModel.find()
                .sort({ periodEnd: -1 })
                .limit(50)
                .select('performanceScore loadsHandled customersHandled role')
                .lean(),
            models_1.DriverPerformanceMetricModel.find()
                .sort({ periodEnd: -1 })
                .limit(50)
                .select('performanceScore loadsCompleted customersServed')
                .lean(),
            models_1.DriverReportModel.find({ status: { $in: ['submitted', 'under_review'] } })
                .sort({ createdAt: -1 })
                .limit(8)
                .select('reportCode type vehicleCode driverName urgency status')
                .lean(),
        ]);
        const [blockedShipments, readyForClearance, readyForRelease, pendingFinanceShipments, pendingReimbursement, containersNotReturned] = await Promise.all([
            models_1.CorridorShipmentModel.countDocuments({ readinessStatus: 'blocked' }),
            models_1.CorridorShipmentModel.countDocuments({ workflowState: { $in: ['clearance_ready', 'clearance_in_progress'] } }),
            models_1.CorridorShipmentModel.countDocuments({ workflowState: 'release_ready' }),
            models_1.CorridorShipmentModel.countDocuments({ financeClearanceApproved: { $ne: true } }),
            models_1.DriverExpenseClaimModel.countDocuments({ status: { $in: ['submitted', 'under_review', 'approved'] } }),
            models_1.CorridorShipmentModel.countDocuments({ emptyReturnClosed: { $ne: true } }),
        ]);
        const currentMonth = new Date();
        const monthStart = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth(), 1));
        const [revenueMtdRow, outstandingBalanceRow, onTimeRow] = await Promise.all([
            models_1.PaymentModel.aggregate([{ $match: { paymentDate: { $gte: monthStart }, status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
            models_1.InvoiceModel.aggregate([{ $match: { status: { $in: ['pending', 'partially_paid', 'overdue'] } } }, { $group: { _id: null, total: { $sum: '$outstandingAmount' } } }]),
            models_1.TripModel.aggregate([
                { $match: { status: 'completed', actualArrivalAt: { $ne: null }, plannedArrivalAt: { $ne: null } } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        onTime: {
                            $sum: {
                                $cond: [{ $lte: ['$actualArrivalAt', '$plannedArrivalAt'] }, 1, 0],
                            },
                        },
                    },
                },
            ]),
        ]);
        const revenueMtd = Number(revenueMtdRow[0]?.total ?? 0);
        const outstandingBalance = Number(outstandingBalanceRow[0]?.total ?? 0);
        const onTimeDelivery = Number(onTimeRow[0]?.total ?? 0)
            ? Math.round((Number(onTimeRow[0]?.onTime ?? 0) / Number(onTimeRow[0]?.total ?? 1)) * 100)
            : 0;
        const employeeSummary = summarizeEmployeePerformance(employeeMetricRows);
        const driverSummary = summarizeDriverPerformance(driverMetricRows);
        const payload = {
            urgentActions: [
                { key: 'delayed_trips', label: 'Delayed Trips', value: delayedTrips, tone: delayedTrips > 0 ? 'critical' : 'normal', href: '/trips?status=delayed' },
                { key: 'overdue_maintenance', label: 'Overdue Maintenance', value: overdueMaintenance, tone: overdueMaintenance > 0 ? 'critical' : 'normal', href: '/maintenance-alerts?status=overdue' },
                { key: 'blocked_vehicles', label: 'Blocked Vehicles', value: blockedVehicles, tone: blockedVehicles > 0 ? 'critical' : 'normal', href: '/maintenance-alerts?blocked=true' },
                { key: 'accident_reports', label: 'Accident Reports', value: accidentReports, tone: accidentReports > 0 ? 'critical' : 'normal', href: '/driver-reports?type=accident_report' },
                { key: 'outstanding_invoices', label: 'Outstanding Invoices', value: outstandingInvoices, tone: outstandingInvoices > 0 ? 'warning' : 'normal', href: '/payments?status=overdue' },
            ],
            kpis: [
                buildKpi('Fleet Active', totalVehicles - blockedVehicles, `${liveFleet.length} live tracked now`, Math.round(((liveFleet.length || 1) / Math.max(totalVehicles, 1)) * 100) - 50, '/tracking'),
                buildKpi('Trips In Transit', tripsInTransit, `${delayedTrips} delayed trips require follow-up`, 6, '/trips?status=in_transit'),
                buildKpi('Vehicles In Djibouti', vehiclesInDjibouti, 'Corridor operations in motion', 4, '/tracking?djiboutiOnly=true'),
                buildKpi('On-Time Delivery %', onTimeDelivery, `${100 - onTimeDelivery}% variance against plan`, onTimeDelivery - 82, '/dashboard/performance/drivers'),
                buildKpi('Maintenance Due', maintenanceDue, `${overdueMaintenance} overdue, ${blockedVehicles} blocked`, -3, '/maintenance-alerts'),
                buildKpi('Open Driver Reports', openDriverReports, `${accidentReports} accident reports unresolved`, 8, '/driver-reports'),
                buildKpi('Revenue MTD', revenueMtd, 'Customer receipts booked this month', 12, '/finance'),
                buildKpi('Outstanding Balance', outstandingBalance, `${outstandingInvoices} invoices still open`, -5, '/payments'),
                buildKpi('Shipments Blocked', blockedShipments, 'Blocked by docs, finance, or missing data', blockedShipments > 0 ? -4 : 2, '/shipments/enterprise'),
                buildKpi('Ready For Clearance', readyForClearance, 'Validation passed and awaiting execution', 7, '/shipments/enterprise?filter=clearance'),
                buildKpi('Ready For Release', readyForRelease, 'Cleared and finance-approved files', 5, '/shipments/enterprise?filter=release'),
                buildKpi('Pending Reimbursement', pendingReimbursement, 'Driver expenses waiting in finance', pendingReimbursement > 0 ? -2 : 1, '/shipments/enterprise?filter=reimbursement'),
            ],
            liveFleetMap: await this.gpsService.getMapWidgetData({}),
            alerts: maintenanceDueVehicles.slice(0, 6).map((item) => ({
                id: String(item._id),
                title: `${item.vehicleCode} ${item.serviceItemName}`,
                detail: item.overdue ? 'Overdue and blocking assignment' : 'Due soon',
                tone: item.overdue ? 'critical' : 'warning',
            })),
            highRiskItems: openIncidentRows.slice(0, 6).map((item) => ({
                id: String(item._id),
                title: `${item.type.replaceAll('_', ' ')} - ${item.vehicleCode}`,
                detail: `${item.driverName} · ${item.urgency}`,
                tone: ['accident_report', 'breakdown_report'].includes(String(item.type)) ? 'critical' : 'warning',
            })),
            performanceCards: {
                employeePerformance: employeeSummary,
                driverPerformance: driverSummary,
                dispatchEfficiency: {
                    averageScore: Math.round((employeeMetricRows.filter((item) => ['operations_manager', 'dispatcher'].includes(String(item.role))).reduce((sum, item) => sum + Number(item.performanceScore), 0)) / Math.max(employeeMetricRows.filter((item) => ['operations_manager', 'dispatcher'].includes(String(item.role))).length, 1)),
                    secondary: 'Trip assignment and issue response',
                    trend: 5,
                },
                vehicleUtilization: {
                    averageScore: Math.round((tripsInTransit / Math.max(totalVehicles, 1)) * 100),
                    secondary: `${blockedVehicles} blocked vehicles`,
                    trend: 3,
                },
            },
            topCustomers: topCustomers.map((customer) => ({
                id: String(customer._id),
                companyName: String(customer.companyName),
                invoiceTotal: Number(customer.invoiceTotal ?? 0),
                outstandingAmount: Number(customer.outstandingAmount ?? 0),
                tripVolume: Number(customer.tripVolume ?? 0),
            })),
            latestAgreements: latestAgreements.map((agreement) => ({
                id: String(agreement._id),
                agreementCode: agreement.agreementCode,
                customerName: agreement.customerName,
                status: agreement.status,
                totalValue: agreement.totalValue,
            })),
            latestPayments: latestPayments.map((payment) => ({
                id: String(payment._id),
                paymentCode: payment.paymentCode,
                invoiceCode: payment.invoiceCode,
                amount: payment.amount,
                status: payment.status,
                paymentDate: payment.paymentDate,
            })),
            revenueByRoute: revenueByRoute.map((row) => ({
                routeName: String(row._id),
                revenue: Number(row.revenue),
                trips: Number(row.trips),
            })),
            latestTrips: latestTrips.map((trip) => ({
                id: String(trip._id),
                tripCode: trip.tripCode,
                customer: trip.customerName,
                routeName: trip.routeName,
                status: trip.status,
                revenueAmount: trip.revenueAmount,
            })),
            maintenanceDueVehicles: maintenanceDueVehicles.map((item) => ({
                id: String(item._id),
                vehicleId: String(item.vehicleId),
                vehicleLabel: item.vehicleCode,
                maintenanceType: item.serviceItemName,
                overdue: item.overdue,
                blockedAssignment: item.blockedAssignment,
            })),
            openIncidents: openIncidentRows,
            lowPerformingDrivers: lowPerformingDrivers.map((item) => ({
                id: String(item._id),
                driverId: item.driverCode,
                name: item.name,
                performanceScore: item.performanceScore,
                delayedTrips: item.delayedTrips,
                accidentCount: item.accidentCount,
            })),
            unpaidInvoices: unpaidInvoices.map((invoice) => ({
                id: String(invoice._id),
                invoiceCode: invoice.invoiceCode,
                customerName: invoice.customerName,
                outstandingAmount: invoice.outstandingAmount,
                status: invoice.status,
                dueDate: invoice.dueDate,
            })),
            clearanceExecutive: {
                blockedShipments,
                readyForClearance,
                readyForRelease,
                pendingFinance: pendingFinanceShipments,
                pendingReimbursement,
                containersNotReturned,
            },
        };
        executiveSummaryCache = {
            expiresAt: Date.now() + EXECUTIVE_SUMMARY_TTL_MS,
            payload,
        };
        return payload;
    }
    async getTransportControlTowerSummary() {
        await (0, mongo_1.connectToDatabase)();
        const [total, active, delayed, clearance, transit, release, returns, onTimeRow] = await Promise.all([
            models_1.CorridorShipmentModel.countDocuments(),
            models_1.CorridorShipmentModel.countDocuments({ currentStage: { $nin: ['closed', 'empty_return'] } }),
            models_1.CorridorShipmentModel.countDocuments({
                $or: [
                    { hasExceptions: true },
                    { activeExceptionCount: { $gt: 0 } },
                    { riskLevel: { $in: ['high', 'critical'] } },
                ],
            }),
            models_1.CorridorShipmentModel.countDocuments({
                $or: [
                    { currentStage: 'transitor_clearance' },
                    { workflowState: { $in: ['clearance_ready', 'clearance_in_progress'] } },
                    { clearanceWorkflowStatus: { $in: ['documents_ready', 'clearance_acknowledged', 'clearance_in_progress'] } },
                ],
            }),
            models_1.CorridorShipmentModel.countDocuments({
                currentStage: { $in: ['ocean_in_transit', 'inland_dispatch', 'inland_arrival'] },
            }),
            models_1.CorridorShipmentModel.countDocuments({
                $or: [
                    { workflowState: 'release_ready' },
                    { releaseStatus: 'ready_for_release' },
                ],
            }),
            models_1.CorridorShipmentModel.countDocuments({ emptyReturnClosed: { $ne: true } }),
            models_1.TripModel.aggregate([
                { $match: { status: 'completed', actualArrivalAt: { $ne: null }, plannedArrivalAt: { $ne: null } } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        onTime: {
                            $sum: {
                                $cond: [{ $lte: ['$actualArrivalAt', '$plannedArrivalAt'] }, 1, 0],
                            },
                        },
                    },
                },
            ]),
        ]);
        const onTime = Number(onTimeRow[0]?.total ?? 0)
            ? Math.round((Number(onTimeRow[0]?.onTime ?? 0) / Number(onTimeRow[0]?.total ?? 1)) * 100)
            : 0;
        return { total, active, delayed, clearance, transit, release, returns, onTime };
    }
    async getTransportControlTowerStatus() {
        await (0, mongo_1.connectToDatabase)();
        const [transit, clearance, delivered, delayed] = await Promise.all([
            models_1.CorridorShipmentModel.countDocuments({ currentStage: { $in: ['ocean_in_transit', 'inland_dispatch', 'inland_arrival'] } }),
            models_1.CorridorShipmentModel.countDocuments({
                $or: [
                    { currentStage: 'transitor_clearance' },
                    { workflowState: { $in: ['clearance_ready', 'clearance_in_progress'] } },
                    { clearanceWorkflowStatus: { $in: ['documents_ready', 'clearance_acknowledged', 'clearance_in_progress'] } },
                ],
            }),
            models_1.CorridorShipmentModel.countDocuments({ currentStage: 'closed' }),
            models_1.CorridorShipmentModel.countDocuments({
                $or: [
                    { hasExceptions: true },
                    { activeExceptionCount: { $gt: 0 } },
                    { riskLevel: { $in: ['high', 'critical'] } },
                ],
            }),
        ]);
        return [
            { name: 'Transit', value: transit },
            { name: 'Clearance', value: clearance },
            { name: 'Delivered', value: delivered },
            { name: 'Delayed', value: delayed },
        ];
    }
    async getTransportControlTowerTrend() {
        await (0, mongo_1.connectToDatabase)();
        const from = new Date();
        from.setUTCDate(from.getUTCDate() - 29);
        from.setUTCHours(0, 0, 0, 0);
        const rows = await models_1.CorridorShipmentModel.aggregate([
            { $match: { createdAt: { $gte: from } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' },
                    },
                    shipments: { $sum: 1 },
                    createdAt: { $min: '$createdAt' },
                },
            },
            { $sort: { createdAt: 1 } },
        ]);
        return rows.map((row) => ({
            day: new Date(row.createdAt).toLocaleDateString('en-US', { weekday: 'short' }),
            shipments: Number(row.shipments ?? 0),
        }));
    }
    async getTransportControlTowerPerformance() {
        await (0, mongo_1.connectToDatabase)();
        const rows = await models_1.CorridorShipmentModel.aggregate([
            {
                $project: {
                    route: {
                        $ifNull: ['$corridorRoute', { $ifNull: ['$inlandDestination', '$destinationNode'] }],
                    },
                },
            },
            { $match: { route: { $nin: [null, ''] } } },
            { $group: { _id: '$route', value: { $sum: 1 } } },
            { $sort: { value: -1 } },
            { $limit: 5 },
        ]);
        return rows.map((row) => ({
            route: String(row._id),
            value: Number(row.value ?? 0),
        }));
    }
    async getTransportControlTowerAlerts() {
        await (0, mongo_1.connectToDatabase)();
        const rows = await models_1.CorridorShipmentModel.find({
            $or: [
                { hasExceptions: true },
                { activeExceptionCount: { $gt: 0 } },
                { riskLevel: { $in: ['high', 'critical'] } },
            ],
        })
            .sort({ riskLevel: -1, updatedAt: -1 })
            .limit(5)
            .select('bookingNumber shipmentRef latestExceptionSummary financeBlockReason closureBlockedReason currentStage')
            .lean();
        return rows.map((row) => ({
            id: String(row.bookingNumber || row.shipmentRef || row._id),
            issue: String(row.latestExceptionSummary
                || row.financeBlockReason
                || row.closureBlockedReason
                || row.currentStage
                || 'Operational exception'),
        }));
    }
    async getHeadOfficeCommandCenter() {
        if (headOfficeCommandCenterCache && headOfficeCommandCenterCache.expiresAt > Date.now()) {
            return headOfficeCommandCenterCache.payload;
        }
        await (0, mongo_1.connectToDatabase)();
        const now = new Date();
        const todayStart = startOfLocalDay();
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 6);
        const activeTripStatuses = ['assigned', 'loading', 'loaded', 'in_transit', 'at_checkpoint', 'at_border', 'offloading', 'in_djibouti', 'delayed'];
        const dispatchPipelineStatuses = ['assigned', 'loading', 'loaded', 'in_transit', 'offloading', 'completed'];
        const blockedShipmentMatch = {
            $or: [
                { readinessStatus: 'blocked' },
                { 'blockedReasons.0': { $exists: true } },
                { 'missingDocumentTags.0': { $exists: true } },
                { financeBlockReason: { $exists: true, $nin: [null, ''] } },
                { closureBlockedReason: { $exists: true, $nin: [null, ''] } },
                { riskLevel: { $in: ['high', 'critical'] } },
            ],
        };
        const trendStart = new Date(todayStart);
        trendStart.setDate(trendStart.getDate() - 6);
        const previousTrendStart = new Date(trendStart);
        previousTrendStart.setDate(previousTrendStart.getDate() - 7);
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const [totalShipments, activeShipments, delayedShipments, blockedShipments, todaysDispatches, revenueInMotionRows, revenueMonthRows, previousRevenueMonthRows, totalVehicles, availableVehicles, utilizedVehicles, maintenanceVehicles, blockedVehicles, totalDrivers, activeTripsByDriver, unavailableDrivers, leaveDrivers, incidentsToday, onTimeDeliveryRows, driverAttentionRows, attentionTripRows, blockerShipmentRows, dispatchFlowRows, shipmentTrendRows, routePerformanceRows, tripBranchRows, vehicleBranchRows, fleetReadyVehicles, incidentRows, delayedAlertRows, blockerAlertRows, revenueTrendRows, delayTrendRows, incidentTrendRows, branchRows, latestPayments, paidInvoices, maintenanceAttentionRows,] = await Promise.all([
            models_1.CorridorShipmentModel.countDocuments(),
            models_1.TripModel.countDocuments({ status: { $in: activeTripStatuses } }),
            models_1.TripModel.countDocuments({ status: 'delayed' }),
            models_1.CorridorShipmentModel.countDocuments(blockedShipmentMatch),
            models_1.TripModel.countDocuments({ actualStartAt: { $gte: todayStart } }),
            models_1.TripModel.aggregate([
                { $match: { status: { $in: activeTripStatuses }, revenueAmount: { $gt: 0 } } },
                { $group: { _id: null, total: { $sum: '$revenueAmount' } } },
            ]),
            models_1.PaymentModel.aggregate([
                { $match: { paymentDate: { $gte: monthStart }, status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            models_1.PaymentModel.aggregate([
                { $match: { paymentDate: { $gte: previousMonthStart, $lt: monthStart }, status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            models_1.VehicleModel.countDocuments({ currentStatus: { $ne: 'inactive' } }),
            models_1.VehicleModel.countDocuments({ readyForAssignment: true, currentStatus: 'available' }),
            models_1.VehicleModel.countDocuments({ currentStatus: { $in: activeTripStatuses } }),
            models_1.VehicleModel.countDocuments({ currentStatus: { $in: ['under_maintenance', 'breakdown'] } }),
            models_1.VehicleModel.countDocuments({
                $or: [
                    { currentStatus: 'blocked' },
                    { safetyStatus: 'blocked' },
                    { readyForAssignment: false },
                ],
            }),
            models_1.DriverModel.countDocuments({ status: 'active' }),
            models_1.TripModel.distinct('driverId', { status: { $in: activeTripStatuses }, driverId: { $ne: null } }),
            models_1.AvailabilityReportModel.distinct('driverId', {
                status: { $in: ['unavailable', 'off_duty', 'leave'] },
                dateFrom: { $lte: now },
                $or: [{ dateTo: null }, { dateTo: { $gte: todayStart } }],
            }),
            models_1.LeaveRequestModel.distinct('driverId', {
                status: { $in: ['approved', 'submitted'] },
                startDate: { $lte: now },
                endDate: { $gte: todayStart },
            }),
            models_1.IncidentReportModel.countDocuments({ createdAt: { $gte: todayStart } }),
            models_1.TripModel.aggregate([
                { $match: { status: 'completed', actualArrivalAt: { $ne: null }, plannedArrivalAt: { $ne: null } } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        onTime: {
                            $sum: {
                                $cond: [{ $lte: ['$actualArrivalAt', '$plannedArrivalAt'] }, 1, 0],
                            },
                        },
                    },
                },
            ]),
            models_1.DriverReportModel.find({ status: { $in: ['submitted', 'under_review'] } })
                .sort({ createdAt: -1 })
                .limit(8)
                .select('reportCode tripCode branchName driverName urgency status type createdAt')
                .lean(),
            models_1.TripModel.find({
                $or: [
                    { status: 'delayed' },
                    { delayedMinutes: { $gte: 120 } },
                ],
            })
                .sort({ delayedMinutes: -1, updatedAt: -1 })
                .limit(8)
                .select('tripCode routeName branchName status delayedMinutes plannedArrivalAt driverName updatedAt')
                .lean(),
            models_1.CorridorShipmentModel.find(blockedShipmentMatch)
                .sort({ updatedAt: -1 })
                .limit(8)
                .select('shipmentRef corridorRoute inlandDestination latestExceptionSummary financeBlockReason closureBlockedReason blockedReasons missingDocumentTags currentOwnerRole updatedAt riskLevel')
                .lean(),
            models_1.TripModel.aggregate([
                { $match: { status: { $in: dispatchPipelineStatuses } } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            models_1.TripModel.aggregate([
                { $match: { actualStartAt: { $gte: trendStart } } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$actualStartAt' },
                            month: { $month: '$actualStartAt' },
                            day: { $dayOfMonth: '$actualStartAt' },
                        },
                        dispatches: { $sum: 1 },
                        delayed: { $sum: { $cond: [{ $eq: ['$status', 'delayed'] }, 1, 0] } },
                        date: { $min: '$actualStartAt' },
                    },
                },
                { $sort: { date: 1 } },
            ]),
            models_1.TripModel.aggregate([
                { $match: { routeName: { $nin: [null, ''] } } },
                {
                    $group: {
                        _id: '$routeName',
                        active: { $sum: { $cond: [{ $in: ['$status', activeTripStatuses] }, 1, 0] } },
                        delayed: { $sum: { $cond: [{ $eq: ['$status', 'delayed'] }, 1, 0] } },
                        revenue: { $sum: { $ifNull: ['$revenueAmount', 0] } },
                        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                        onTime: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$status', 'completed'] },
                                            { $ne: ['$actualArrivalAt', null] },
                                            { $ne: ['$plannedArrivalAt', null] },
                                            { $lte: ['$actualArrivalAt', '$plannedArrivalAt'] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
                { $sort: { delayed: -1, revenue: -1 } },
                { $limit: 6 },
            ]),
            models_1.TripModel.aggregate([
                { $match: { branchName: { $nin: [null, ''] } } },
                {
                    $group: {
                        _id: '$branchName',
                        active: { $sum: { $cond: [{ $in: ['$status', activeTripStatuses] }, 1, 0] } },
                        delayed: { $sum: { $cond: [{ $eq: ['$status', 'delayed'] }, 1, 0] } },
                        revenue: { $sum: { $ifNull: ['$revenueAmount', 0] } },
                    },
                },
            ]),
            models_1.VehicleModel.aggregate([
                { $match: { branchName: { $nin: [null, ''] } } },
                {
                    $group: {
                        _id: '$branchName',
                        fleet: { $sum: 1 },
                        available: { $sum: { $cond: [{ $and: [{ $eq: ['$currentStatus', 'available'] }, { $eq: ['$readyForAssignment', true] }] }, 1, 0] } },
                        blocked: { $sum: { $cond: [{ $or: [{ $eq: ['$currentStatus', 'blocked'] }, { $eq: ['$safetyStatus', 'blocked'] }, { $eq: ['$readyForAssignment', false] }] }, 1, 0] } },
                    },
                },
            ]),
            models_1.VehicleModel.find({
                currentStatus: { $ne: 'inactive' },
            })
                .select('vehicleCode branchName currentStatus readyForAssignment safetyStatus')
                .lean(),
            models_1.IncidentReportModel.find()
                .sort({ createdAt: -1 })
                .limit(8)
                .select('tripId tripCode severity driverName status type createdAt')
                .lean(),
            models_1.TripModel.find({ status: 'delayed' })
                .sort({ updatedAt: -1 })
                .limit(6)
                .select('tripCode routeName branchName updatedAt status')
                .lean(),
            models_1.CorridorShipmentModel.find(blockedShipmentMatch)
                .sort({ updatedAt: -1 })
                .limit(6)
                .select('shipmentRef corridorRoute inlandDestination currentOwnerRole updatedAt riskLevel currentStage financeBlockReason closureBlockedReason')
                .lean(),
            models_1.PaymentModel.aggregate([
                { $match: { paymentDate: { $gte: weekStart }, status: 'paid' } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$paymentDate' },
                            month: { $month: '$paymentDate' },
                            day: { $dayOfMonth: '$paymentDate' },
                        },
                        total: { $sum: '$amount' },
                        date: { $min: '$paymentDate' },
                    },
                },
                { $sort: { date: 1 } },
            ]),
            models_1.TripModel.aggregate([
                { $match: { updatedAt: { $gte: weekStart }, status: 'delayed' } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$updatedAt' },
                            month: { $month: '$updatedAt' },
                            day: { $dayOfMonth: '$updatedAt' },
                        },
                        total: { $sum: 1 },
                        date: { $min: '$updatedAt' },
                    },
                },
                { $sort: { date: 1 } },
            ]),
            models_1.DriverReportModel.aggregate([
                { $match: { createdAt: { $gte: weekStart }, status: { $in: ['submitted', 'under_review'] } } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                            day: { $dayOfMonth: '$createdAt' },
                        },
                        total: { $sum: 1 },
                        date: { $min: '$createdAt' },
                    },
                },
                { $sort: { date: 1 } },
            ]),
            models_1.BranchModel.find({ status: 'active' }).select('name').sort({ name: 1 }).lean(),
            models_1.PaymentModel.find({ status: 'paid' }).sort({ paymentDate: -1 }).limit(10).select('paymentDate amount routeName').lean(),
            models_1.InvoiceModel.find({ status: 'paid' }).sort({ updatedAt: -1 }).limit(10).select('routeName totalAmount updatedAt').lean(),
            models_1.MaintenancePlanModel.find({ status: { $in: ['active', 'due', 'overdue'] }, $or: [{ overdue: true }, { blockedAssignment: true }] })
                .sort({ overdue: -1, updatedAt: -1 })
                .limit(8)
                .select('vehicleCode serviceItemName overdue blockedAssignment updatedAt')
                .lean(),
        ]);
        const revenueInMotion = Number(revenueInMotionRows[0]?.total ?? 0);
        const revenueMonth = Number(revenueMonthRows[0]?.total ?? 0);
        const previousRevenueMonth = Number(previousRevenueMonthRows[0]?.total ?? 0);
        const fleetAvailabilityPct = totalVehicles ? Math.round((availableVehicles / totalVehicles) * 100) : 0;
        const fleetUtilizationPct = totalVehicles ? Math.round((utilizedVehicles / totalVehicles) * 100) : 0;
        const readyFleetCount = fleetReadyVehicles.filter((vehicle) => vehicle.readyForAssignment && vehicle.currentStatus === 'available' && vehicle.safetyStatus !== 'blocked').length;
        const fleetReadinessPct = totalVehicles ? Math.round((readyFleetCount / totalVehicles) * 100) : 0;
        const driverUnavailableIds = new Set([...unavailableDrivers, ...leaveDrivers].map((id) => String(id)));
        const activeDriverIds = new Set(activeTripsByDriver.map((id) => String(id)));
        const driverAttentionCount = driverAttentionRows.filter((item) => ['high', 'critical'].includes(String(item.urgency || '').toLowerCase())).length;
        const readyDrivers = Math.max(totalDrivers - driverUnavailableIds.size - activeDriverIds.size - driverAttentionCount, 0);
        const driverReadinessPct = totalDrivers ? Math.round((readyDrivers / totalDrivers) * 100) : 0;
        const onTimeDeliveryPct = Number(onTimeDeliveryRows[0]?.total ?? 0)
            ? Math.round((Number(onTimeDeliveryRows[0]?.onTime ?? 0) / Number(onTimeDeliveryRows[0]?.total ?? 1)) * 100)
            : 0;
        const blockerCards = blockerShipmentRows.slice(0, 6).map((item) => ({
            id: String(item._id),
            shipmentId: String(item.shipmentRef),
            title: String(item.shipmentRef),
            route: String(item.corridorRoute || item.inlandDestination || 'Corridor'),
            owner: normalizeLabel(item.currentOwnerRole || 'dispatch'),
            issue: String(item.latestExceptionSummary || item.financeBlockReason || item.closureBlockedReason || (item.blockedReasons || []).join(', ') || (item.missingDocumentTags || []).join(', ') || 'Execution blocker'),
            severity: normalizeSeverity(item.riskLevel || 'warning'),
            href: `/shipments/enterprise?shipmentRef=${encodeURIComponent(String(item.shipmentRef))}`,
            timestamp: item.updatedAt,
        }));
        const attentionCards = [
            ...attentionTripRows.map((item) => ({
                id: String(item._id),
                shipmentId: String(item.tripCode),
                title: String(item.tripCode),
                route: String(item.routeName || item.branchName || 'Route pending'),
                owner: String(item.driverName || item.branchName || 'Dispatch'),
                issue: item.status === 'delayed'
                    ? `Delayed by ${Number(item.delayedMinutes ?? 0)} min`
                    : `Arrival at risk for ${formatDateShort(item.plannedArrivalAt)}`,
                severity: Number(item.delayedMinutes ?? 0) >= 240 ? 'critical' : 'warning',
                href: `/trips?trip=${encodeURIComponent(String(item.tripCode))}`,
                timestamp: item.updatedAt,
            })),
            ...maintenanceAttentionRows.map((item) => ({
                id: String(item._id),
                shipmentId: String(item.vehicleCode || 'VEHICLE'),
                title: String(item.vehicleCode || 'Vehicle'),
                route: 'Fleet readiness',
                owner: 'Workshop',
                issue: `${String(item.serviceItemName || 'Maintenance')} ${item.overdue ? 'overdue' : 'blocking assignment'}`,
                severity: item.overdue ? 'critical' : 'warning',
                href: '/maintenance-alerts',
                timestamp: item.updatedAt,
            })),
        ]
            .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
            .slice(0, 8);
        const dispatchFlow = dispatchPipelineStatuses.map((status) => {
            const count = Number(dispatchFlowRows.find((row) => row._id === status)?.count ?? 0);
            return {
                key: status,
                label: normalizeLabel(status),
                count,
                tone: status === 'completed' ? 'good' : status === 'offloading' ? 'info' : status === 'in_transit' ? 'info' : 'warning',
            };
        });
        const routePerformance = routePerformanceRows.map((row) => {
            const completed = Number(row.completed ?? 0);
            const onTimeRate = completed ? Math.round((Number(row.onTime ?? 0) / completed) * 100) : 0;
            const pressure = routePressureTone(Number(row.delayed ?? 0), onTimeRate);
            return {
                route: String(row._id),
                active: Number(row.active ?? 0),
                delayed: Number(row.delayed ?? 0),
                revenue: Number(row.revenue ?? 0),
                onTimeRate,
                pressure,
                href: `/trips?route=${encodeURIComponent(String(row._id))}`,
            };
        }).slice(0, 6);
        const vehicleBranchMap = new Map(vehicleBranchRows.map((row) => [String(row._id), row]));
        const branchPerformance = (tripBranchRows.length ? tripBranchRows : branchRows.map((branch) => ({ _id: branch.name, active: 0, delayed: 0, revenue: 0 }))).map((row) => {
            const vehicleRow = vehicleBranchMap.get(String(row._id)) ?? { fleet: 0, available: 0, blocked: 0 };
            const availability = Number(vehicleRow.fleet ?? 0) ? Math.round((Number(vehicleRow.available ?? 0) / Number(vehicleRow.fleet ?? 1)) * 100) : 0;
            return {
                branch: String(row._id),
                active: Number(row.active ?? 0),
                delayed: Number(row.delayed ?? 0),
                blocked: Number(vehicleRow.blocked ?? 0),
                availability,
                revenue: Number(row.revenue ?? 0),
                pressure: branchPressureTone(Number(row.delayed ?? 0), Number(vehicleRow.blocked ?? 0), availability),
                href: `/operations?branch=${encodeURIComponent(String(row._id))}`,
            };
        })
            .sort((left, right) => pressureWeight(right.pressure) - pressureWeight(left.pressure) || right.delayed - left.delayed || right.revenue - left.revenue)
            .slice(0, 6);
        const latestIncidentTripIds = incidentRows.map((item) => item.tripId).filter(Boolean);
        const incidentTrips = latestIncidentTripIds.length
            ? await models_1.TripModel.find({ _id: { $in: latestIncidentTripIds } }).select('_id routeName branchName').lean()
            : [];
        const incidentTripMap = new Map(incidentTrips.map((trip) => [String(trip._id), trip]));
        const alertRows = [
            ...incidentRows.map((item) => {
                const trip = incidentTripMap.get(String(item.tripId || ''));
                return {
                    id: `incident-${item._id}`,
                    severity: normalizeSeverity(item.severity || 'warning'),
                    shipmentId: String(item.tripCode || item.vehicleCode || item._id),
                    route: String(trip?.routeName || trip?.branchName || 'Incident route'),
                    reportedTime: item.createdAt,
                    owner: String(item.driverName || 'Safety desk'),
                    status: normalizeLabel(item.status || 'reported'),
                    issue: normalizeLabel(item.type || 'incident'),
                    href: item.tripCode ? `/trips?trip=${encodeURIComponent(String(item.tripCode))}` : '/driver-reports',
                };
            }),
            ...delayedAlertRows.map((item) => ({
                id: `delay-${item._id}`,
                severity: 'warning',
                shipmentId: String(item.tripCode),
                route: String(item.routeName || item.branchName || 'Route pending'),
                reportedTime: item.updatedAt,
                owner: String(item.branchName || 'Dispatch'),
                status: normalizeLabel(item.status || 'delayed'),
                issue: 'Delayed shipment',
                href: `/trips?trip=${encodeURIComponent(String(item.tripCode))}`,
            })),
            ...blockerAlertRows.map((item) => ({
                id: `blocker-${item._id}`,
                severity: normalizeSeverity(item.riskLevel || 'warning'),
                shipmentId: String(item.shipmentRef),
                route: String(item.corridorRoute || item.inlandDestination || 'Corridor'),
                reportedTime: item.updatedAt,
                owner: normalizeLabel(item.currentOwnerRole || 'dispatch'),
                status: normalizeLabel(item.currentStage || 'blocked'),
                issue: String(item.financeBlockReason || item.closureBlockedReason || 'Compliance / dispatch blocker'),
                href: `/shipments/enterprise?shipmentRef=${encodeURIComponent(String(item.shipmentRef))}`,
            })),
        ]
            .sort((left, right) => new Date(right.reportedTime).getTime() - new Date(left.reportedTime).getTime())
            .slice(0, 12);
        const dispatchQueue = attentionTripRows.map((item) => ({
            id: String(item._id),
            shipmentId: String(item.tripCode),
            route: String(item.routeName || item.branchName || 'Route pending'),
            branch: String(item.branchName || 'Dispatch'),
            owner: String(item.driverName || item.branchName || 'Dispatch'),
            status: normalizeLabel(item.status || 'active'),
            eta: formatDateShort(item.plannedArrivalAt),
            delayMinutes: Number(item.delayedMinutes ?? 0),
            href: `/trips?trip=${encodeURIComponent(String(item.tripCode))}`,
        }));
        const shipmentTrend = buildDailySeriesWithDelayed(trendStart, shipmentTrendRows);
        const revenueByRoute = routePerformance.map((item) => ({
            route: item.route,
            revenue: item.revenue,
            delayed: item.delayed,
            onTimeRate: item.onTimeRate,
            href: item.href,
        }));
        const branchChart = branchPerformance.map((item) => ({
            branch: item.branch,
            delayed: item.delayed,
            revenue: item.revenue,
            availability: item.availability,
            blocked: item.blocked,
            href: item.href,
        }));
        const fleetAvailabilityChart = [
            { label: 'Available', value: availableVehicles, tone: 'good' },
            { label: 'Utilized', value: utilizedVehicles, tone: 'info' },
            { label: 'Maintenance', value: maintenanceVehicles, tone: 'warning' },
            { label: 'Blocked', value: blockedVehicles, tone: 'critical' },
        ];
        const driverAvailabilityChart = [
            { label: 'Ready', value: readyDrivers, tone: 'good' },
            { label: 'On trip', value: activeDriverIds.size, tone: 'info' },
            { label: 'Unavailable', value: driverUnavailableIds.size, tone: 'warning' },
            { label: 'Attention', value: driverAttentionCount, tone: 'critical' },
        ];
        const currentDelayedShare = activeShipments ? Math.round((delayedShipments / activeShipments) * 100) : 0;
        const payload = {
            generatedAt: now.toISOString(),
            kpis: [
                { label: 'Total Shipments', value: totalShipments, tone: 'info', href: '/shipments/enterprise', helper: 'All tracked files across corridor operations', trend: totalShipments - activeShipments },
                { label: 'Active Shipments', value: activeShipments, tone: 'info', href: '/trips?status=in_transit', helper: `${todaysDispatches} dispatches pushed today`, trend: todaysDispatches },
                { label: 'Delayed Shipments', value: delayedShipments, tone: delayedShipments > 0 ? 'warning' : 'good', href: '/trips?status=delayed', helper: `${attentionTripRows.length} priority files require recovery`, trend: delayedShipments },
                { label: 'Revenue (ETB)', value: revenueMonth, tone: revenueMonth > 0 ? 'good' : 'info', href: '/finance', helper: `${latestPayments.length} recent paid movements across active files`, trend: revenueMonth - previousRevenueMonth },
                { label: 'Fleet Utilization %', value: fleetUtilizationPct, tone: fleetUtilizationPct >= 70 ? 'good' : fleetUtilizationPct >= 50 ? 'warning' : 'critical', href: '/tracking', helper: `${utilizedVehicles}/${totalVehicles} units engaged right now`, trend: utilizedVehicles - availableVehicles },
                { label: 'On-time Delivery %', value: onTimeDeliveryPct, tone: onTimeDeliveryPct >= 85 ? 'good' : onTimeDeliveryPct >= 70 ? 'warning' : 'critical', href: '/trips', helper: `${100 - onTimeDeliveryPct}% variance against plan`, trend: onTimeDeliveryPct - 85 },
                { label: 'Incidents Today', value: incidentsToday, tone: incidentsToday > 0 ? 'critical' : 'good', href: '/driver-reports', helper: `${incidentRows.length} latest incident and alert records`, trend: incidentsToday },
            ],
            charts: {
                shipmentTrend: {
                    href: '/operations',
                    points: shipmentTrend,
                },
                revenueByRoute: {
                    href: '/dashboards/executive/revenue-by-route',
                    points: revenueByRoute,
                },
                delayGauge: {
                    href: '/trips?status=delayed',
                    delayedPercentage: currentDelayedShare,
                    delayedCount: delayedShipments,
                    activeCount: activeShipments,
                },
            },
            performance: {
                route: {
                    href: '/dashboards/executive/revenue-by-route',
                    items: revenueByRoute,
                },
                branch: {
                    href: '/operations',
                    items: branchChart,
                },
            },
            dispatchFleet: {
                queue: {
                    href: '/operations',
                    rows: dispatchQueue,
                },
                fleetAvailability: {
                    href: '/tracking',
                    percent: fleetAvailabilityPct,
                    items: fleetAvailabilityChart,
                },
                driverAvailability: {
                    href: '/drivers',
                    percent: driverReadinessPct,
                    items: driverAvailabilityChart,
                },
            },
            alerts: alertRows,
            spotlight: {
                attention: {
                    href: '/trips?status=delayed',
                    items: attentionCards,
                },
                blockers: {
                    href: '/shipments/enterprise',
                    items: blockerCards,
                },
                dispatchFlow: {
                    href: '/operations',
                    items: dispatchFlow,
                },
                routePerformance: {
                    href: '/dashboards/executive/revenue-by-route',
                    items: routePerformance,
                },
                branchPerformance: {
                    href: '/operations',
                    items: branchPerformance,
                },
                fleetReadiness: {
                    href: '/tracking',
                    readinessPct: fleetReadinessPct,
                    stats: [
                        { label: 'Ready now', value: readyFleetCount, tone: 'good' },
                        { label: 'Available', value: availableVehicles, tone: 'info' },
                        { label: 'Under maintenance', value: maintenanceVehicles, tone: maintenanceVehicles > 0 ? 'warning' : 'good' },
                        { label: 'Blocked', value: blockedVehicles, tone: blockedVehicles > 0 ? 'critical' : 'good' },
                    ],
                },
                driverReadiness: {
                    href: '/drivers',
                    readinessPct: driverReadinessPct,
                    stats: [
                        { label: 'Ready for dispatch', value: readyDrivers, tone: 'good' },
                        { label: 'On active trips', value: activeDriverIds.size, tone: 'info' },
                        { label: 'Unavailable / leave', value: driverUnavailableIds.size, tone: driverUnavailableIds.size > 0 ? 'warning' : 'good' },
                        { label: 'Attention cases', value: driverAttentionCount, tone: driverAttentionCount > 0 ? 'critical' : 'good' },
                    ],
                },
            },
            executiveTrends: {
                revenue: {
                    href: '/finance',
                    total: Number(latestPayments.reduce((sum, item) => sum + Number(item.amount ?? 0), 0)),
                    points: buildDailySeries(weekStart, revenueTrendRows),
                },
                delay: {
                    href: '/trips?status=delayed',
                    total: delayedShipments,
                    points: buildDailySeries(weekStart, delayTrendRows),
                },
                incident: {
                    href: '/driver-reports',
                    total: alertRows.filter((item) => item.issue !== 'Delayed shipment').length,
                    points: buildDailySeries(weekStart, incidentTrendRows),
                },
            },
        };
        headOfficeCommandCenterCache = {
            expiresAt: Date.now() + HEAD_OFFICE_COMMAND_CENTER_TTL_MS,
            payload,
        };
        return payload;
    }
    async getManagementWidgets() {
        const executiveSummary = await this.getExecutiveSummary();
        return executiveSummary.kpis.map((item) => ({
            key: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
            label: item.title,
            value: item.value,
        }));
    }
    async getExecutiveActivityFeed() {
        await (0, mongo_1.connectToDatabase)();
        return models_1.ActivityLogModel.find().sort({ createdAt: -1 }).limit(30).lean();
    }
    async getExecutiveIncidents() {
        await (0, mongo_1.connectToDatabase)();
        return models_1.IncidentReportModel.find().sort({ createdAt: -1 }).limit(25).lean();
    }
    async getExecutiveFuelSummary() {
        await (0, mongo_1.connectToDatabase)();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [todayCount, latestFuelLogs] = await Promise.all([
            models_1.FuelLogModel.countDocuments({ date: { $gte: today } }),
            models_1.FuelLogModel.find().sort({ date: -1 }).limit(20).lean(),
        ]);
        return { fuelLogsToday: todayCount, latestFuelLogs };
    }
    async getExecutiveDocumentSummary() {
        await (0, mongo_1.connectToDatabase)();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [uploadedToday, latestUploadedDocuments] = await Promise.all([
            models_1.UploadedDocumentModel.countDocuments({ createdAt: { $gte: today } }),
            models_1.UploadedDocumentModel.find().sort({ createdAt: -1 }).limit(20).lean(),
        ]);
        return { documentsUploadedToday: uploadedToday, latestUploadedDocuments };
    }
    async getExecutiveAgreementSummary() {
        await (0, mongo_1.connectToDatabase)();
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const [signedThisWeek, latestAgreements] = await Promise.all([
            models_1.AgreementModel.countDocuments({ status: 'signed', updatedAt: { $gte: weekStart } }),
            models_1.AgreementModel.find().sort({ updatedAt: -1 }).limit(20).lean(),
        ]);
        return { agreementsSignedThisWeek: signedThisWeek, latestAgreements };
    }
    async getExecutiveCollectionEscalations() {
        await (0, mongo_1.connectToDatabase)();
        return models_1.CollectionTaskModel.find({ escalationLevel: { $in: ['manager', 'director', 'ceo'] } })
            .sort({ updatedAt: -1 })
            .limit(20)
            .lean();
    }
    async getAiCommandCenter() {
        return this.aiCommandCenterService.getCommandCenterPayload();
    }
    async getExecutiveWorkspace(tab = 'overview') {
        const normalizedTab = ['overview', 'finance', 'operations', 'attention'].includes(tab) ? tab : 'overview';
        const cacheEntry = executiveWorkspaceCache[normalizedTab];
        if (cacheEntry && cacheEntry.expiresAt > Date.now()) {
            return cacheEntry.payload;
        }
        const summary = await this.getExecutiveSummary();
        const basePayload = {
            generatedAt: new Date().toISOString(),
            hero: {
                slides: 'executive',
            },
            tab: normalizedTab,
        };
        if (normalizedTab === 'overview') {
            const ai = await this.aiCommandCenterService.getCommandCenterPayload();
            const payload = {
                ...basePayload,
                ai,
                core: {
                    urgentActions: (summary.urgentActions ?? [])
                        .filter((item) => ['Delayed Trips', 'Overdue Maintenance', 'Blocked Vehicles', 'Outstanding Invoices'].includes(item.label))
                        .slice(0, 4),
                    kpis: (summary.kpis ?? [])
                        .filter((item) => ['Fleet Active', 'Trips In Transit', 'Vehicles In Djibouti', 'On-Time Delivery %'].includes(item.title))
                        .slice(0, 4),
                },
                clearance: summary.clearanceExecutive ?? {
                    blockedShipments: 0,
                    readyForClearance: 0,
                    readyForRelease: 0,
                    pendingFinance: 0,
                    pendingReimbursement: 0,
                    containersNotReturned: 0,
                },
            };
            executiveWorkspaceCache[normalizedTab] = { expiresAt: Date.now() + EXECUTIVE_WORKSPACE_TTL_MS, payload };
            return payload;
        }
        if (normalizedTab === 'finance') {
            const payload = {
                ...basePayload,
                core: {
                    kpis: (summary.kpis ?? []).filter((item) => ['Revenue MTD', 'Outstanding Balance'].includes(item.title)).slice(0, 2),
                    latestPayments: (summary.latestPayments ?? []).slice(0, 5),
                },
                customers: (summary.topCustomers ?? []).slice(0, 5),
                invoices: (summary.unpaidInvoices ?? []).slice(0, 5),
            };
            executiveWorkspaceCache[normalizedTab] = { expiresAt: Date.now() + EXECUTIVE_WORKSPACE_TTL_MS, payload };
            return payload;
        }
        if (normalizedTab === 'operations') {
            const [maintenance, launchItems] = await Promise.all([
                this.maintenanceService.getDashboard(),
                models_1.LaunchChecklistItemModel.find()
                    .sort({ updatedAt: -1 })
                    .limit(5)
                    .select('code title track owner branch dueDate status')
                    .lean(),
            ]);
            const liveFleetMap = summary.liveFleetMap ?? { totalVehicles: 0, activeVehicles: 0, delayedVehicles: 0, inDjiboutiVehicles: 0, points: [] };
            const compactMap = {
                ...liveFleetMap,
                points: Array.isArray(liveFleetMap.points) ? liveFleetMap.points.slice(0, 20) : [],
            };
            const payload = {
                ...basePayload,
                map: compactMap,
                maintenance: {
                    recentAlerts: (maintenance.recentAlerts ?? []).slice(0, 5),
                },
                trips: (summary.latestTrips ?? []).slice(0, 5).map((item) => ({
                    id: item.id,
                    tripCode: item.tripCode,
                    customerName: item.customer,
                    routeName: item.routeName,
                    status: item.status,
                    revenueAmount: item.revenueAmount,
                })),
                incidents: (summary.openIncidents ?? []).slice(0, 5),
                launch: {
                    items: launchItems.map((item) => ({
                        id: String(item._id),
                        code: item.code,
                        title: item.title,
                        track: item.track,
                        owner: item.owner,
                        branch: item.branch,
                        dueDate: item.dueDate,
                        status: item.status,
                    })),
                },
            };
            executiveWorkspaceCache[normalizedTab] = { expiresAt: Date.now() + EXECUTIVE_WORKSPACE_TTL_MS, payload };
            return payload;
        }
        const maintenanceDue = await this.maintenanceService.getDueVehicles({});
        const payload = {
            ...basePayload,
            incidents: (summary.openIncidents ?? []).slice(0, 5),
            maintenanceDue: (summary.maintenanceDueVehicles ?? maintenanceDue ?? []).slice(0, 5),
            invoices: (summary.unpaidInvoices ?? []).slice(0, 5),
            trips: (summary.latestTrips ?? []).slice(0, 5).map((item) => ({
                id: item.id,
                tripCode: item.tripCode,
                customerName: item.customer,
                routeName: item.routeName,
                status: item.status,
                revenueAmount: item.revenueAmount,
            })),
            core: {
                latestPayments: (summary.latestPayments ?? []).slice(0, 5),
            },
        };
        executiveWorkspaceCache[normalizedTab] = { expiresAt: Date.now() + EXECUTIVE_WORKSPACE_TTL_MS, payload };
        return payload;
    }
};
exports.DashboardsService = DashboardsService;
exports.DashboardsService = DashboardsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gps_service_1.GpsService,
        maintenance_service_1.MaintenanceService,
        ai_command_center_service_1.AiCommandCenterService])
], DashboardsService);
function buildKpi(title, value, secondary, trend, href) {
    return {
        title,
        value,
        secondary,
        trend,
        href,
    };
}
function summarizeEmployeePerformance(rows) {
    const averageScore = rows.length
        ? Math.round(rows.reduce((sum, row) => sum + Number(row.performanceScore || 0), 0) / rows.length)
        : 0;
    const loads = rows.reduce((sum, row) => sum + Number(row.loadsHandled || 0), 0);
    const customers = rows.reduce((sum, row) => sum + Number(row.customersHandled || 0), 0);
    return {
        averageScore,
        totalLoadsHandled: loads,
        totalCustomersHandled: customers,
        secondary: 'Operations, finance, HR, and commercial teams',
        trend: averageScore - 75,
    };
}
function summarizeDriverPerformance(rows) {
    const averageScore = rows.length
        ? Math.round(rows.reduce((sum, row) => sum + Number(row.performanceScore || 0), 0) / rows.length)
        : 0;
    const loads = rows.reduce((sum, row) => sum + Number(row.loadsCompleted || 0), 0);
    const customers = rows.reduce((sum, row) => sum + Number(row.customersServed || 0), 0);
    return {
        averageScore,
        totalLoadsCompleted: loads,
        totalCustomersServed: customers,
        secondary: 'Trip delivery, POD, and incident discipline',
        trend: averageScore - 78,
    };
}
function startOfLocalDay() {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
}
function normalizeLabel(value) {
    return String(value || 'Unknown')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
function normalizeSeverity(value) {
    const normalized = String(value || '').toLowerCase();
    if (['critical', 'high', 'severe'].includes(normalized))
        return 'critical';
    if (['warning', 'medium', 'moderate', 'delayed'].includes(normalized))
        return 'warning';
    if (['good', 'normal', 'low', 'stable'].includes(normalized))
        return 'good';
    return 'info';
}
function routePressureTone(delayed, onTimeRate) {
    if (delayed >= 4 || (onTimeRate > 0 && onTimeRate < 70))
        return 'critical';
    if (delayed >= 2 || (onTimeRate > 0 && onTimeRate < 85))
        return 'warning';
    return 'good';
}
function branchPressureTone(delayed, blocked, availability) {
    if (blocked >= 3 || delayed >= 3 || availability < 45)
        return 'critical';
    if (blocked >= 1 || delayed >= 1 || availability < 65)
        return 'warning';
    return 'good';
}
function pressureWeight(value) {
    if (value === 'critical')
        return 3;
    if (value === 'warning')
        return 2;
    if (value === 'info')
        return 1;
    return 0;
}
function formatDateShort(value) {
    if (!value)
        return 'today';
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime()))
        return 'today';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function buildDailySeries(start, rows) {
    const byDay = new Map();
    for (const row of rows) {
        const date = row.date ? new Date(String(row.date)) : null;
        if (!date || Number.isNaN(date.getTime()))
            continue;
        const key = date.toISOString().slice(0, 10);
        byDay.set(key, Number(row.total ?? 0));
    }
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const key = date.toISOString().slice(0, 10);
        return {
            label: date.toLocaleDateString('en-US', { weekday: 'short' }),
            value: byDay.get(key) ?? 0,
        };
    });
}
function buildDailySeriesWithDelayed(start, rows) {
    const byDay = new Map();
    for (const row of rows) {
        const date = row.date ? new Date(String(row.date)) : null;
        if (!date || Number.isNaN(date.getTime()))
            continue;
        const key = date.toISOString().slice(0, 10);
        byDay.set(key, {
            total: Number(row.dispatches ?? 0),
            delayed: Number(row.delayed ?? 0),
        });
    }
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const key = date.toISOString().slice(0, 10);
        const row = byDay.get(key) ?? { total: 0, delayed: 0 };
        return {
            label: date.toLocaleDateString('en-US', { weekday: 'short' }),
            total: row.total,
            delayed: row.delayed,
        };
    });
}
//# sourceMappingURL=dashboards.service.js.map