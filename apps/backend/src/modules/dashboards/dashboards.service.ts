// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { connectToDatabase } from '../../database/mongo';
import {
  AgreementModel,
  ActivityLogModel,
  CollectionTaskModel,
  CorridorShipmentModel,
  CustomerModel,
  DriverPerformanceMetricModel,
  DriverExpenseClaimModel,
  DriverReimbursementModel,
  DriverReportModel,
  EmployeePerformanceMetricModel,
  InvoiceModel,
  MaintenancePlanModel,
  PaymentModel,
  TripModel,
  UploadedDocumentModel,
  VehicleModel,
  FuelLogModel,
  IncidentReportModel,
  LaunchChecklistItemModel,
} from '../../database/models';
import { GpsService } from '../gps/gps.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { AiCommandCenterService } from './ai-command-center.service';

const EXECUTIVE_SUMMARY_TTL_MS = 30_000;
const EXECUTIVE_WORKSPACE_TTL_MS = 15_000;
let executiveSummaryCache: { expiresAt: number; payload: unknown } | null = null;
let executiveWorkspaceCache: Record<string, { expiresAt: number; payload: unknown }> = {};

type ExecutiveWorkspaceTab = 'overview' | 'finance' | 'operations' | 'attention';

type ControlTowerStatusRow = { name: string; value: number };
type ControlTowerTrendRow = { day: string; shipments: number };
type ControlTowerPerformanceRow = { route: string; value: number };
type ControlTowerAlertRow = { id: string; issue: string };

@Injectable()
export class DashboardsService {
  constructor(
    private readonly gpsService: GpsService,
    private readonly maintenanceService: MaintenanceService,
    private readonly aiCommandCenterService: AiCommandCenterService,
  ) {}

  async getExecutiveSummary() {
    if (executiveSummaryCache && executiveSummaryCache.expiresAt > Date.now()) {
      return executiveSummaryCache.payload;
    }

    await connectToDatabase();
    const [liveFleet, totalVehicles, tripsInTransit, delayedTrips, vehiclesInDjibouti, maintenanceDue, overdueMaintenance, blockedVehicles, openDriverReports, accidentReports, outstandingInvoices, latestTrips, latestAgreements, latestPayments, topCustomers, revenueByRoute, maintenanceDueVehicles, lowPerformingDrivers, unpaidInvoices, employeeMetricRows, driverMetricRows, openIncidentRows] =
      await Promise.all([
        this.gpsService.getLiveFleet({}),
        VehicleModel.countDocuments({ currentStatus: { $ne: 'inactive' } }),
        TripModel.countDocuments({ status: { $in: ['in_transit', 'at_border', 'in_djibouti', 'offloading'] } }),
        TripModel.countDocuments({ status: 'delayed' }),
        TripModel.countDocuments({ status: 'in_djibouti' }),
        MaintenancePlanModel.countDocuments({ status: { $in: ['active', 'due', 'overdue'] } }),
        MaintenancePlanModel.countDocuments({ overdue: true }),
        MaintenancePlanModel.countDocuments({ blockedAssignment: true }),
        DriverReportModel.countDocuments({ status: { $in: ['submitted', 'under_review'] } }),
        DriverReportModel.countDocuments({ type: 'accident_report', status: { $in: ['submitted', 'under_review'] } }),
        InvoiceModel.countDocuments({ status: { $in: ['pending', 'partially_paid', 'overdue'] } }),
        TripModel.find()
          .sort({ createdAt: -1 })
          .limit(8)
          .select('tripCode customerName routeName status revenueAmount')
          .lean(),
        AgreementModel.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('agreementCode customerName status totalValue')
          .lean(),
        PaymentModel.find()
          .sort({ paymentDate: -1 })
          .limit(5)
          .select('paymentCode invoiceCode amount status paymentDate')
          .lean(),
        InvoiceModel.aggregate([
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
        TripModel.aggregate([
          { $match: { routeName: { $ne: null }, revenueAmount: { $gt: 0 } } },
          { $group: { _id: '$routeName', revenue: { $sum: '$revenueAmount' }, trips: { $sum: 1 } } },
          { $sort: { revenue: -1 } },
          { $limit: 6 },
        ]),
        MaintenancePlanModel.find({ status: { $in: ['active', 'due', 'overdue'] } })
          .sort({ overdue: -1, nextDueDate: 1 })
          .limit(8)
          .select('vehicleId vehicleCode serviceItemName overdue blockedAssignment')
          .lean(),
        DriverPerformanceMetricModel.find()
          .sort({ performanceScore: 1, periodEnd: -1 })
          .limit(6)
          .select('driverCode name performanceScore delayedTrips accidentCount')
          .lean(),
        InvoiceModel.find({ status: { $in: ['pending', 'partially_paid', 'overdue'] } })
          .sort({ dueDate: 1 })
          .limit(8)
          .select('invoiceCode customerName outstandingAmount status dueDate')
          .lean(),
        EmployeePerformanceMetricModel.find()
          .sort({ periodEnd: -1 })
          .limit(50)
          .select('performanceScore loadsHandled customersHandled role')
          .lean(),
        DriverPerformanceMetricModel.find()
          .sort({ periodEnd: -1 })
          .limit(50)
          .select('performanceScore loadsCompleted customersServed')
          .lean(),
        DriverReportModel.find({ status: { $in: ['submitted', 'under_review'] } })
          .sort({ createdAt: -1 })
          .limit(8)
          .select('reportCode type vehicleCode driverName urgency status')
          .lean(),
      ]);
    const [blockedShipments, readyForClearance, readyForRelease, pendingFinanceShipments, pendingReimbursement, containersNotReturned] = await Promise.all([
      CorridorShipmentModel.countDocuments({ readinessStatus: 'blocked' }),
      CorridorShipmentModel.countDocuments({ workflowState: { $in: ['clearance_ready', 'clearance_in_progress'] } }),
      CorridorShipmentModel.countDocuments({ workflowState: 'release_ready' }),
      CorridorShipmentModel.countDocuments({ financeClearanceApproved: { $ne: true } }),
      DriverExpenseClaimModel.countDocuments({ status: { $in: ['submitted', 'under_review', 'approved'] } }),
      CorridorShipmentModel.countDocuments({ emptyReturnClosed: { $ne: true } }),
    ]);

    const currentMonth = new Date();
    const monthStart = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth(), 1));
    const [revenueMtdRow, outstandingBalanceRow, onTimeRow] = await Promise.all([
      PaymentModel.aggregate([{ $match: { paymentDate: { $gte: monthStart }, status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      InvoiceModel.aggregate([{ $match: { status: { $in: ['pending', 'partially_paid', 'overdue'] } } }, { $group: { _id: null, total: { $sum: '$outstandingAmount' } } }]),
      TripModel.aggregate([
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
    await connectToDatabase();

    const [total, active, delayed, clearance, transit, release, returns, onTimeRow] = await Promise.all([
      CorridorShipmentModel.countDocuments(),
      CorridorShipmentModel.countDocuments({ currentStage: { $nin: ['closed', 'empty_return'] } }),
      CorridorShipmentModel.countDocuments({
        $or: [
          { hasExceptions: true },
          { activeExceptionCount: { $gt: 0 } },
          { riskLevel: { $in: ['high', 'critical'] } },
        ],
      }),
      CorridorShipmentModel.countDocuments({
        $or: [
          { currentStage: 'transitor_clearance' },
          { workflowState: { $in: ['clearance_ready', 'clearance_in_progress'] } },
          { clearanceWorkflowStatus: { $in: ['documents_ready', 'clearance_acknowledged', 'clearance_in_progress'] } },
        ],
      }),
      CorridorShipmentModel.countDocuments({
        currentStage: { $in: ['ocean_in_transit', 'inland_dispatch', 'inland_arrival'] },
      }),
      CorridorShipmentModel.countDocuments({
        $or: [
          { workflowState: 'release_ready' },
          { releaseStatus: 'ready_for_release' },
        ],
      }),
      CorridorShipmentModel.countDocuments({ emptyReturnClosed: { $ne: true } }),
      TripModel.aggregate([
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

  async getTransportControlTowerStatus(): Promise<ControlTowerStatusRow[]> {
    await connectToDatabase();

    const [transit, clearance, delivered, delayed] = await Promise.all([
      CorridorShipmentModel.countDocuments({ currentStage: { $in: ['ocean_in_transit', 'inland_dispatch', 'inland_arrival'] } }),
      CorridorShipmentModel.countDocuments({
        $or: [
          { currentStage: 'transitor_clearance' },
          { workflowState: { $in: ['clearance_ready', 'clearance_in_progress'] } },
          { clearanceWorkflowStatus: { $in: ['documents_ready', 'clearance_acknowledged', 'clearance_in_progress'] } },
        ],
      }),
      CorridorShipmentModel.countDocuments({ currentStage: 'closed' }),
      CorridorShipmentModel.countDocuments({
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

  async getTransportControlTowerTrend(): Promise<ControlTowerTrendRow[]> {
    await connectToDatabase();

    const from = new Date();
    from.setUTCDate(from.getUTCDate() - 29);
    from.setUTCHours(0, 0, 0, 0);

    const rows = await CorridorShipmentModel.aggregate([
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

  async getTransportControlTowerPerformance(): Promise<ControlTowerPerformanceRow[]> {
    await connectToDatabase();

    const rows = await CorridorShipmentModel.aggregate([
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

  async getTransportControlTowerAlerts(): Promise<ControlTowerAlertRow[]> {
    await connectToDatabase();

    const rows = await CorridorShipmentModel.find({
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
      issue: String(
        row.latestExceptionSummary
        || row.financeBlockReason
        || row.closureBlockedReason
        || row.currentStage
        || 'Operational exception',
      ),
    }));
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
    await connectToDatabase();
    return ActivityLogModel.find().sort({ createdAt: -1 }).limit(30).lean();
  }

  async getExecutiveIncidents() {
    await connectToDatabase();
    return IncidentReportModel.find().sort({ createdAt: -1 }).limit(25).lean();
  }

  async getExecutiveFuelSummary() {
    await connectToDatabase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [todayCount, latestFuelLogs] = await Promise.all([
      FuelLogModel.countDocuments({ date: { $gte: today } }),
      FuelLogModel.find().sort({ date: -1 }).limit(20).lean(),
    ]);
    return { fuelLogsToday: todayCount, latestFuelLogs };
  }

  async getExecutiveDocumentSummary() {
    await connectToDatabase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [uploadedToday, latestUploadedDocuments] = await Promise.all([
      UploadedDocumentModel.countDocuments({ createdAt: { $gte: today } }),
      UploadedDocumentModel.find().sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    return { documentsUploadedToday: uploadedToday, latestUploadedDocuments };
  }

  async getExecutiveAgreementSummary() {
    await connectToDatabase();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const [signedThisWeek, latestAgreements] = await Promise.all([
      AgreementModel.countDocuments({ status: 'signed', updatedAt: { $gte: weekStart } }),
      AgreementModel.find().sort({ updatedAt: -1 }).limit(20).lean(),
    ]);
    return { agreementsSignedThisWeek: signedThisWeek, latestAgreements };
  }

  async getExecutiveCollectionEscalations() {
    await connectToDatabase();
    return CollectionTaskModel.find({ escalationLevel: { $in: ['manager', 'director', 'ceo'] } })
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();
  }

  async getAiCommandCenter() {
    return this.aiCommandCenterService.getCommandCenterPayload();
  }

  async getExecutiveWorkspace(tab: ExecutiveWorkspaceTab = 'overview') {
    const normalizedTab: ExecutiveWorkspaceTab = ['overview', 'finance', 'operations', 'attention'].includes(tab) ? tab : 'overview';
    const cacheEntry = executiveWorkspaceCache[normalizedTab];
    if (cacheEntry && cacheEntry.expiresAt > Date.now()) {
      return cacheEntry.payload;
    }

    const summary: any = await this.getExecutiveSummary();
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
        LaunchChecklistItemModel.find()
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
}

function buildKpi(title: string, value: number, secondary: string, trend: number, href: string) {
  return {
    title,
    value,
    secondary,
    trend,
    href,
  };
}

function summarizeEmployeePerformance(rows: Array<Record<string, unknown>>) {
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

function summarizeDriverPerformance(rows: Array<Record<string, unknown>>) {
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
