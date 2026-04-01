// @ts-nocheck
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { connectToDatabase } from '../../database/mongo';
import {
  AiInsightModel,
  AiSnapshotModel,
  BookingModel,
  CustomerModel,
  DriverKycRequestModel,
  DriverModel,
  DriverReportModel,
  GpsPointModel,
  InvoiceModel,
  NotificationModel,
  PaymentModel,
  QuoteModel,
  TripModel,
  VehicleModel,
  MaintenancePlanModel,
} from '../../database/models';

type InsightType = 'risk' | 'opportunity' | 'action';
type InsightSeverity = 'low' | 'medium' | 'high' | 'critical';

type InsightCandidate = {
  type: InsightType;
  category: 'trip' | 'vehicle' | 'maintenance' | 'finance' | 'kyc' | 'customer';
  severity: InsightSeverity;
  title: string;
  description: string;
  score: number;
  entityType: string;
  entityId: string;
  actionLabel: string;
  actionRoute: string;
  secondaryActionLabel?: string;
  secondaryActionTemplate?: string;
  status?: 'active' | 'dismissed' | 'resolved';
};

const FIFTEEN_MINUTES_MS = 15 * 60_000;
const THIRTY_MINUTES_MS = 30 * 60_000;
const TEN_MINUTES_MS = 10 * 60_000;

@Injectable()
export class AiCommandCenterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiCommandCenterService.name);
  private readonly timers: NodeJS.Timeout[] = [];

  async onModuleInit() {
    const queue = (delayMs: number, task: () => Promise<void>, label: string, intervalMs: number) => {
      const initial = setTimeout(async () => {
        await this.safeRun(task, label);
        const recurring = setInterval(() => void this.safeRun(task, label), intervalMs);
        this.timers.push(recurring);
      }, delayMs);
      this.timers.push(initial);
    };

    queue(2_000, () => this.generateRiskInsights(), 'generateRiskInsights', FIFTEEN_MINUTES_MS);
    queue(4_000, () => this.generateOpportunityInsights(), 'generateOpportunityInsights', THIRTY_MINUTES_MS);
    queue(6_000, () => this.generateRecommendedActions(), 'generateRecommendedActions', FIFTEEN_MINUTES_MS);
    queue(8_000, () => this.generateDashboardSnapshot(), 'generateDashboardSnapshot', TEN_MINUTES_MS);
  }

  onModuleDestroy() {
    this.timers.forEach((timer) => clearInterval(timer as NodeJS.Timeout));
    this.timers.length = 0;
  }

  async getCommandCenterPayload() {
    await connectToDatabase();
    const latestSnapshot = await AiSnapshotModel.findOne().sort({ generatedAt: -1 }).lean();
    if (!latestSnapshot) {
      await this.refreshAll();
    }
    const snapshot = latestSnapshot || await AiSnapshotModel.findOne().sort({ generatedAt: -1 }).lean();
    const [topRisks, topOpportunities, topActions] = await Promise.all([
      this.listInsights('risk'),
      this.listInsights('opportunity'),
      this.listInsights('action'),
    ]);

    return {
      greeting: 'Tikur Abay AI Command Center',
      topRisks,
      topOpportunities,
      topActions,
      summaryText: snapshot?.summaryText || this.buildSummaryText(topRisks, topOpportunities, topActions),
      stats: snapshot?.stats || this.buildStats(topRisks, topOpportunities, topActions),
    };
  }

  async refreshAll() {
    await this.generateRiskInsights();
    await this.generateOpportunityInsights();
    await this.generateRecommendedActions();
    await this.generateDashboardSnapshot();
  }

  async generateRiskInsights() {
    await connectToDatabase();
    const [tripRisks, staleGpsRisks, maintenanceRisks, invoiceRisks, kycRisks] = await Promise.all([
      this.computeDelayedTripRisks(),
      this.computeStaleGpsRisks(),
      this.computeMaintenanceRisks(),
      this.computeInvoiceRisks(),
      this.computeKycRisks(),
    ]);
    const insights = [...tripRisks, ...staleGpsRisks, ...maintenanceRisks, ...invoiceRisks, ...kycRisks]
      .sort((left, right) => right.score - left.score)
      .slice(0, 24);
    await this.replaceInsights('risk', insights);
  }

  async generateOpportunityInsights() {
    await connectToDatabase();
    const [idleFleetOpportunities, collections, quotes, branchCapacity] = await Promise.all([
      this.computeIdleFleetOpportunities(),
      this.computeCollectionOpportunities(),
      this.computeQuoteConversionOpportunities(),
      this.computeBranchCapacityOpportunities(),
    ]);
    const insights = [...idleFleetOpportunities, ...collections, ...quotes, ...branchCapacity]
      .sort((left, right) => right.score - left.score)
      .slice(0, 24);
    await this.replaceInsights('opportunity', insights);
  }

  async generateRecommendedActions() {
    await connectToDatabase();
    const [delayedTrips, overdueInvoices, kycQueue, idleFleet] = await Promise.all([
      AiInsightModel.find({ type: 'risk', category: 'trip', status: 'active' }).sort({ score: -1 }).limit(6).lean(),
      AiInsightModel.find({ type: 'risk', category: 'finance', status: 'active' }).sort({ score: -1 }).limit(6).lean(),
      AiInsightModel.find({ type: 'risk', category: 'kyc', status: 'active' }).sort({ score: -1 }).limit(6).lean(),
      AiInsightModel.find({ type: 'opportunity', category: 'vehicle', status: 'active' }).sort({ score: -1 }).limit(6).lean(),
    ]);

    const actions: InsightCandidate[] = [];
    if (delayedTrips.length) {
      const top = delayedTrips[0]!;
      actions.push({
        type: 'action',
        category: 'trip',
        severity: top.score >= 85 ? 'critical' : 'high',
        title: 'Stabilize delayed trips',
        description: `${delayedTrips.length} trip issues need dispatch stabilization now.`,
        score: Math.min(100, Number(top.score || 0) + 4),
        entityType: 'trip',
        entityId: String(top.entityId),
        actionLabel: 'Open trips',
        actionRoute: '/trips?status=delayed',
        secondaryActionLabel: 'Notify dispatch',
        secondaryActionTemplate: 'trip_delay_update',
      });
    }
    if (overdueInvoices.length) {
      const top = overdueInvoices[0]!;
      actions.push({
        type: 'action',
        category: 'finance',
        severity: top.score >= 85 ? 'critical' : 'high',
        title: 'Follow up overdue payments',
        description: `${overdueInvoices.length} invoice exposures need finance follow-up today.`,
        score: Math.min(100, Number(top.score || 0) + 3),
        entityType: 'invoice',
        entityId: String(top.entityId),
        actionLabel: 'Open payments',
        actionRoute: '/payments?status=overdue',
        secondaryActionLabel: 'Send reminder',
        secondaryActionTemplate: 'payment_reminder',
      });
    }
    if (kycQueue.length) {
      const top = kycQueue[0]!;
      actions.push({
        type: 'action',
        category: 'kyc',
        severity: top.score >= 85 ? 'high' : 'medium',
        title: 'Review driver risk queue',
        description: `${kycQueue.length} driver onboarding cases are waiting for approval.`,
        score: Math.min(100, Number(top.score || 0) + 2),
        entityType: 'driver_kyc_request',
        entityId: String(top.entityId),
        actionLabel: 'Open drivers',
        actionRoute: '/drivers',
        secondaryActionLabel: 'Escalate to HR',
        secondaryActionTemplate: 'kyc_reminder',
      });
    }
    if (idleFleet.length) {
      const top = idleFleet[0]!;
      actions.push({
        type: 'action',
        category: 'vehicle',
        severity: 'medium',
        title: 'Reassign ready fleet capacity',
        description: `${idleFleet.length} fleet opportunities can be converted into active trips.`,
        score: Math.min(100, Number(top.score || 0) + 1),
        entityType: 'vehicle',
        entityId: String(top.entityId),
        actionLabel: 'Open operations',
        actionRoute: '/operations',
        secondaryActionLabel: 'Escalate maintenance',
        secondaryActionTemplate: 'maintenance_escalation',
      });
    }

    await this.replaceInsights('action', actions.sort((left, right) => right.score - left.score).slice(0, 18));
  }

  async generateDashboardSnapshot() {
    await connectToDatabase();
    const [topRisks, topOpportunities, topActions] = await Promise.all([
      this.listInsights('risk'),
      this.listInsights('opportunity'),
      this.listInsights('action'),
    ]);
    await AiSnapshotModel.create({
      generatedAt: new Date(),
      topRisks,
      topOpportunities,
      topActions,
      summaryText: this.buildSummaryText(topRisks, topOpportunities, topActions),
      stats: this.buildStats(topRisks, topOpportunities, topActions),
    });
    const staleSnapshots = await AiSnapshotModel.find().sort({ generatedAt: -1 }).skip(24).select('_id').lean();
    if (staleSnapshots.length) {
      await AiSnapshotModel.deleteMany({ _id: { $in: staleSnapshots.map((item) => item._id) } });
    }
  }

  private async listInsights(type: InsightType) {
    const rows = await AiInsightModel.find({ type, status: 'active' }).sort({ score: -1, updatedAt: -1 }).limit(3).lean();
    return rows.map((row) => ({
      title: row.title,
      description: row.description,
      severity: row.severity,
      score: row.score,
      actionLabel: row.actionLabel,
      actionRoute: row.actionRoute,
      entityType: row.entityType,
      entityId: row.entityId,
      category: row.category,
      secondaryActionLabel: row.secondaryActionLabel,
      secondaryActionTemplate: row.secondaryActionTemplate,
    }));
  }

  private buildSummaryText(risks: any[], opportunities: any[], actions: any[]) {
    const topRisk = risks[0]?.title || 'No major risks detected';
    const topOpportunity = opportunities[0]?.title || 'No immediate opportunities detected';
    const topAction = actions[0]?.title || 'No urgent executive actions recommended';
    return `${topRisk}. ${topOpportunity}. ${topAction}.`;
  }

  private buildStats(risks: any[], opportunities: any[], actions: any[]) {
    return {
      riskCount: risks.length,
      opportunityCount: opportunities.length,
      actionCount: actions.length,
      highestRiskScore: risks[0]?.score ?? 0,
      highestOpportunityScore: opportunities[0]?.score ?? 0,
      highestActionScore: actions[0]?.score ?? 0,
    };
  }

  private async replaceInsights(type: InsightType, insights: InsightCandidate[]) {
    await AiInsightModel.deleteMany({ type });
    if (!insights.length) return;
    await AiInsightModel.insertMany(insights.map((item) => ({ ...item, status: item.status || 'active' })));
  }

  private async computeDelayedTripRisks(): Promise<InsightCandidate[]> {
    const delayedTrips = await TripModel.find({ status: 'delayed' })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('_id tripCode customerName routeName delayedMinutes plannedArrivalAt branchName updatedAt')
      .lean();
    return delayedTrips.map((trip) => {
      const delayedMinutes = Math.max(
        Number(trip.delayedMinutes ?? 0),
        trip.plannedArrivalAt ? Math.max(0, Math.round((Date.now() - new Date(trip.plannedArrivalAt).getTime()) / 60000)) : 0,
      );
      const routeImportance = /djibouti/i.test(String(trip.routeName || '')) ? 18 : 8;
      const staleMinutes = Math.max(0, Math.round((Date.now() - new Date(trip.updatedAt || Date.now()).getTime()) / 60000));
      const customerWeight = /logistics|industrial|export/i.test(String(trip.customerName || '')) ? 10 : 4;
      const score = Math.min(100, 30 + Math.round(delayedMinutes / 30) + routeImportance + customerWeight + Math.round(staleMinutes / 45));
      return {
        type: 'risk',
        category: 'trip',
        severity: score >= 85 ? 'critical' : score >= 65 ? 'high' : 'medium',
        title: `Delayed trip ${trip.tripCode}`,
        description: `${trip.routeName || trip.branchName || 'Priority route'} is delayed and needs dispatch recovery.`,
        score,
        entityType: 'trip',
        entityId: String(trip._id),
        actionLabel: 'Open trip',
        actionRoute: `/trips/${String(trip._id)}`,
      };
    });
  }

  private async computeStaleGpsRisks(): Promise<InsightCandidate[]> {
    const vehicles = await VehicleModel.find({
      currentTripId: { $ne: null },
      currentStatus: { $in: ['assigned', 'loading', 'loaded', 'in_transit', 'at_border', 'in_djibouti', 'offloading', 'delayed'] },
    })
      .sort({ lastGpsAt: 1 })
      .limit(20)
      .select('_id vehicleCode branchName lastGpsAt currentStatus currentTripId')
      .lean();
    return vehicles
      .map((vehicle) => {
        const staleMinutes = vehicle.lastGpsAt ? Math.round((Date.now() - new Date(vehicle.lastGpsAt).getTime()) / 60000) : 999;
        if (staleMinutes < 25) return null;
        const score = Math.min(100, 38 + Math.round(staleMinutes / 8));
        return {
          type: 'risk',
          category: 'vehicle',
          severity: score >= 85 ? 'critical' : score >= 65 ? 'high' : 'medium',
          title: `Stale GPS on ${vehicle.vehicleCode}`,
          description: `${vehicle.branchName || 'Fleet'} has no recent position update for ${staleMinutes} minutes.`,
          score,
          entityType: 'vehicle',
          entityId: String(vehicle._id),
          actionLabel: 'Open operations',
          actionRoute: '/operations',
        } as InsightCandidate;
      })
      .filter(Boolean);
  }

  private async computeMaintenanceRisks(): Promise<InsightCandidate[]> {
    const plans = await MaintenancePlanModel.find({
      status: { $in: ['active', 'due', 'overdue'] },
      $or: [{ overdue: true }, { blockedAssignment: true }],
    })
      .sort({ overdue: -1, updatedAt: -1 })
      .limit(20)
      .select('_id vehicleId vehicleCode serviceItemName nextDueKm currentOdometerKm overdue blockedAssignment')
      .lean();
    return plans.map((plan) => {
      const kmOverdue = Math.max(0, Number(plan.currentOdometerKm ?? 0) - Number(plan.nextDueKm ?? plan.currentOdometerKm ?? 0));
      const score = Math.min(100, 42 + (plan.overdue ? 24 : 0) + (plan.blockedAssignment ? 20 : 0) + Math.round(kmOverdue / 250));
      return {
        type: 'risk',
        category: 'maintenance',
        severity: score >= 85 ? 'critical' : score >= 65 ? 'high' : 'medium',
        title: `${plan.vehicleCode} maintenance overdue`,
        description: `${plan.serviceItemName || 'Critical service'} is blocking assignment readiness.`,
        score,
        entityType: 'maintenance_plan',
        entityId: String(plan._id),
        actionLabel: 'Open maintenance',
        actionRoute: '/maintenance-alerts',
      };
    });
  }

  private async computeInvoiceRisks(): Promise<InsightCandidate[]> {
    const invoices = await InvoiceModel.find({
      status: { $in: ['pending', 'partially_paid', 'overdue'] },
      outstandingAmount: { $gt: 0 },
    })
      .sort({ dueDate: 1, outstandingAmount: -1 })
      .limit(20)
      .select('_id invoiceCode customerName dueDate outstandingAmount')
      .lean();
    return invoices.map((invoice) => {
      const overdueDays = invoice.dueDate ? Math.max(0, Math.round((Date.now() - new Date(invoice.dueDate).getTime()) / 86_400_000)) : 0;
      const amountScore = Math.round(Math.min(Number(invoice.outstandingAmount || 0), 2_500_000) / 50_000);
      const score = Math.min(100, 28 + overdueDays * 2 + amountScore);
      return {
        type: 'risk',
        category: 'finance',
        severity: score >= 85 ? 'critical' : score >= 65 ? 'high' : 'medium',
        title: `Overdue invoice ${invoice.invoiceCode}`,
        description: `${invoice.customerName || 'Customer account'} has ${Number(invoice.outstandingAmount || 0).toLocaleString('en-US')} ETB overdue.`,
        score,
        entityType: 'invoice',
        entityId: String(invoice._id),
        actionLabel: 'Open payments',
        actionRoute: '/payments?status=overdue',
      };
    });
  }

  private async computeKycRisks(): Promise<InsightCandidate[]> {
    const rows = await DriverKycRequestModel.find({ status: { $in: ['submitted', 'under_review', 'draft'] } })
      .sort({ createdAt: 1 })
      .limit(12)
      .select('_id fullName status createdAt partnerCompany partnerVehicleCode')
      .lean();
    return rows.map((row) => {
      const waitingDays = Math.max(0, Math.round((Date.now() - new Date(row.createdAt || Date.now()).getTime()) / 86_400_000));
      const blockedWeight = row.partnerVehicleCode ? 12 : 5;
      const score = Math.min(100, 24 + waitingDays * 5 + blockedWeight);
      return {
        type: 'risk',
        category: 'kyc',
        severity: score >= 85 ? 'critical' : score >= 65 ? 'high' : 'medium',
        title: `Driver KYC pending for ${row.fullName || 'driver applicant'}`,
        description: `${waitingDays || 1} day review wait is blocking driver activation.`,
        score,
        entityType: 'driver_kyc_request',
        entityId: String(row._id),
        actionLabel: 'Open drivers',
        actionRoute: '/drivers',
      };
    });
  }

  private async computeIdleFleetOpportunities(): Promise<InsightCandidate[]> {
    const [idleVehicles, demandTrips] = await Promise.all([
      VehicleModel.find({
        readyForAssignment: true,
        currentTripId: null,
        currentStatus: { $in: ['available', 'idle', 'ready'] },
      })
        .sort({ updatedAt: -1 })
        .limit(20)
        .select('_id vehicleCode branchName type')
        .lean(),
      TripModel.find({ status: { $in: ['assigned', 'pending_dispatch'] } })
        .limit(40)
        .select('branchName routeName')
        .lean(),
    ]);
    const demandByBranch = new Map<string, number>();
    demandTrips.forEach((trip) => {
      const key = String(trip.branchName || 'unknown');
      demandByBranch.set(key, (demandByBranch.get(key) || 0) + 1);
    });
    return idleVehicles
      .filter((vehicle) => (demandByBranch.get(String(vehicle.branchName || 'unknown')) || 0) > 0)
      .map((vehicle) => {
        const branchDemand = demandByBranch.get(String(vehicle.branchName || 'unknown')) || 0;
        const score = Math.min(100, 35 + branchDemand * 8);
        return {
          type: 'opportunity',
          category: 'vehicle',
          severity: score >= 75 ? 'high' : 'medium',
          title: `Idle vehicle ${vehicle.vehicleCode} can be reassigned`,
          description: `${vehicle.branchName || 'Branch'} has trip demand and ready fleet capacity available.`,
          score,
          entityType: 'vehicle',
          entityId: String(vehicle._id),
          actionLabel: 'Open operations',
          actionRoute: '/operations',
        };
      });
  }

  private async computeCollectionOpportunities(): Promise<InsightCandidate[]> {
    const invoices = await InvoiceModel.find({
      status: { $in: ['pending', 'partially_paid', 'overdue'] },
      outstandingAmount: { $gt: 0 },
    })
      .sort({ outstandingAmount: -1, dueDate: 1 })
      .limit(15)
      .select('_id invoiceCode customerId customerName outstandingAmount dueDate')
      .lean();
    const payments = await PaymentModel.find().sort({ paymentDate: -1 }).limit(80).select('customerId customerName amount paymentDate status').lean();
    const customerRecoveryMap = new Map<string, number>();
    payments.forEach((payment) => {
      const key = String(payment.customerId || payment.customerName || '');
      if (!key || payment.status !== 'paid') return;
      customerRecoveryMap.set(key, (customerRecoveryMap.get(key) || 0) + Number(payment.amount || 0));
    });
    return invoices.map((invoice) => {
      const recoveryHistory = customerRecoveryMap.get(String(invoice.customerId || invoice.customerName || '')) || 0;
      const score = Math.min(100, 30 + Math.round(Number(invoice.outstandingAmount || 0) / 60_000) + (recoveryHistory > 0 ? 16 : 4));
      return {
        type: 'opportunity',
        category: 'finance',
        severity: score >= 75 ? 'high' : 'medium',
        title: `Collect ${invoice.invoiceCode}`,
        description: `${invoice.customerName || 'Customer'} has collectible overdue balance with payment history.`,
        score,
        entityType: 'invoice',
        entityId: String(invoice._id),
        actionLabel: 'Open payments',
        actionRoute: '/payments',
      };
    });
  }

  private async computeQuoteConversionOpportunities(): Promise<InsightCandidate[]> {
    const [quotes, bookings] = await Promise.all([
      QuoteModel.find({ status: { $in: ['approved', 'pending', 'requested'] } })
        .sort({ updatedAt: -1 })
        .limit(20)
        .select('_id quoteCode customerName quotedAmount status route requestedVehicleType')
        .lean(),
      BookingModel.find().select('quoteId').lean(),
    ]);
    const convertedQuoteIds = new Set(bookings.map((item) => String(item.quoteId || '')).filter(Boolean));
    return quotes
      .filter((quote) => !convertedQuoteIds.has(String(quote._id)))
      .map((quote) => {
        const statusWeight = quote.status === 'approved' ? 24 : quote.status === 'pending' ? 14 : 8;
        const score = Math.min(100, 28 + statusWeight + Math.round(Number(quote.quotedAmount || 0) / 80_000));
        return {
          type: 'opportunity',
          category: 'customer',
          severity: score >= 75 ? 'high' : 'medium',
          title: `Convert quote ${quote.quoteCode}`,
          description: `${quote.customerName || 'Customer'} is waiting on ${quote.requestedVehicleType || 'fleet'} confirmation.`,
          score,
          entityType: 'quote',
          entityId: String(quote._id),
          actionLabel: 'Open operations',
          actionRoute: '/operations',
        };
      });
  }

  private async computeBranchCapacityOpportunities(): Promise<InsightCandidate[]> {
    const [drivers, vehicles, notifications] = await Promise.all([
      DriverModel.find({ status: 'active' }).select('_id branchId driverCode').lean(),
      VehicleModel.find({ readyForAssignment: true, currentTripId: null }).select('_id branchId vehicleCode').lean(),
      NotificationModel.find({ isRead: false }).sort({ createdAt: -1 }).limit(30).select('type entityType entityId').lean(),
    ]);
    const driverByBranch = countByBranch(drivers);
    const vehicleByBranch = countByBranch(vehicles);
    const unreadDispatchPressure = notifications.filter((item) => ['trip', 'booking', 'dispatch'].includes(String(item.entityType || item.type || '').toLowerCase())).length;
    return Array.from(vehicleByBranch.keys())
      .map((branchId) => {
        const vehicleCount = vehicleByBranch.get(branchId) || 0;
        const driverCount = driverByBranch.get(branchId) || 0;
        if (!vehicleCount || !driverCount) return null;
        const score = Math.min(100, 26 + vehicleCount * 6 + driverCount * 4 + Math.min(12, unreadDispatchPressure));
        return {
          type: 'opportunity',
          category: 'customer',
          severity: score >= 75 ? 'high' : 'medium',
          title: 'Ready driver and fleet capacity aligned',
          description: `${driverCount} drivers and ${vehicleCount} vehicles can cover current branch demand.`,
          score,
          entityType: 'branch',
          entityId: branchId,
          actionLabel: 'Open operations',
          actionRoute: '/operations',
        } as InsightCandidate;
      })
      .filter(Boolean);
  }

  private async safeRun(task: () => Promise<void>, label: string) {
    try {
      await task();
    } catch (error) {
      this.logger.error(`${label} failed`, error instanceof Error ? error.stack : String(error));
    }
  }
}

function countByBranch(rows: Array<{ branchId?: any }>) {
  return rows.reduce((map, row) => {
    const key = String(row.branchId || 'unknown');
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map<string, number>());
}
