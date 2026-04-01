// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { connectToDatabase } from '../../database/mongo';
import {
  MaintenanceNotificationModel,
  MaintenancePlanModel,
  MaintenanceRecordModel,
  PartReplacementModel,
  RepairOrderModel,
  SparePartModel,
  VehicleModel,
} from '../../database/models';
import { MaintenanceAlertQueryDto } from './dto/maintenance-alert-query.dto';

const MAINTENANCE_DASHBOARD_TTL_MS = 30_000;
let maintenanceDashboardCache: { expiresAt: number; payload: unknown } | null = null;

@Injectable()
export class MaintenanceService {
  async getDashboard() {
    if (maintenanceDashboardCache && maintenanceDashboardCache.expiresAt > Date.now()) {
      return maintenanceDashboardCache.payload;
    }

    await connectToDatabase();
    const activeStatuses = ['active', 'due', 'overdue'];
    const openRepairStatuses = ['reported', 'under_review', 'approved', 'scheduled', 'in_service'];
    const [dueCount, tireInspectionDue, overdueCount, blockedAssignments, recentAlerts, openRepairOrders, lowStockParts, recentRecords, costSummary, completedRepairOrders, recentPartUsage] = await Promise.all([
      MaintenancePlanModel.countDocuments({ status: { $in: activeStatuses } }),
      MaintenancePlanModel.countDocuments({ status: { $in: activeStatuses }, serviceItemName: 'Tire inspection' }),
      MaintenancePlanModel.countDocuments({ status: { $in: activeStatuses }, overdue: true }),
      MaintenancePlanModel.countDocuments({ status: { $in: activeStatuses }, blockedAssignment: true }),
      MaintenancePlanModel.find({ status: { $in: activeStatuses } })
        .sort({ overdue: -1, nextDueDate: 1, nextDueKm: 1 })
        .limit(6)
        .select('vehicleId vehicleCode serviceItemName nextDueDate nextDueKm overdue blockedAssignment')
        .lean(),
      RepairOrderModel.countDocuments({ status: { $in: openRepairStatuses } }),
      SparePartModel.countDocuments({ status: 'low_stock' }),
      MaintenanceRecordModel.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$serviceDate' } },
            total: { $sum: '$totalCost' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 6 },
      ]),
      MaintenanceRecordModel.aggregate([
        {
          $match: {
            serviceDate: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
        { $group: { _id: null, total: { $sum: '$totalCost' } } },
      ]),
      RepairOrderModel.find({ status: 'completed', openedAt: { $ne: null }, completedAt: { $ne: null } })
        .sort({ completedAt: -1 })
        .limit(40)
        .select('openedAt completedAt')
        .lean(),
      PartReplacementModel.find()
        .sort({ replacementDate: -1 })
        .limit(12)
        .select('vehicleCode partName partCategory replacementDate replacementKm cost vendor')
        .lean(),
    ]);

    const averageFixHours = completedRepairOrders.length
      ? Number((
        completedRepairOrders.reduce((sum, item) => {
          const openedAt = item.openedAt ? new Date(String(item.openedAt)).getTime() : 0;
          const completedAt = item.completedAt ? new Date(String(item.completedAt)).getTime() : 0;
          if (!openedAt || !completedAt || completedAt <= openedAt) return sum;
          return sum + ((completedAt - openedAt) / (1000 * 60 * 60));
        }, 0) / completedRepairOrders.length
      ).toFixed(1))
      : 0;

    const payload = {
      dueCount,
      tireInspectionDue,
      overdueCount,
      blockedAssignments,
      openRepairOrders,
      lowStockParts,
      averageFixHours,
      maintenanceCompletionTrend: recentRecords.map((item) => ({
        month: item._id,
        total: Number(item.total ?? 0),
        count: Number(item.count ?? 0),
      })),
      maintenanceCostSummary: Number(costSummary[0]?.total ?? 0),
      recentPartUsage: recentPartUsage.map((item) => ({
        id: String(item._id),
        vehicleCode: item.vehicleCode,
        partName: item.partName,
        partCategory: item.partCategory,
        replacementDate: item.replacementDate,
        replacementKm: item.replacementKm,
        cost: Number(item.cost ?? 0),
        vendor: item.vendor,
      })),
      recentAlerts: recentAlerts.map((item) => ({
        id: String(item._id),
        vehicleCode: item.vehicleCode,
        maintenanceType: item.serviceItemName,
        dueDate: item.nextDueDate,
        dueKm: item.nextDueKm,
        overdue: item.overdue,
        blockedAssignment: item.blockedAssignment,
      })),
    };
    maintenanceDashboardCache = {
      expiresAt: Date.now() + MAINTENANCE_DASHBOARD_TTL_MS,
      payload,
    };
    return payload;
  }

  async getDue() {
    return this.getDueVehicles({});
  }

  async getDueVehicles(filters: MaintenanceAlertQueryDto = {}) {
    await connectToDatabase();
    const query = this.buildPlanQuery(filters);
    const rows = await MaintenancePlanModel.find(query)
      .sort({ overdue: -1, nextDueDate: 1, nextDueKm: 1 })
      .limit(200)
      .select('vehicleId vehicleCode serviceItemName branchId overdue blockedAssignment nextDueDate nextDueKm currentOdometerKm criticalFlag')
      .lean();
    return rows.map((item) => ({
      id: String(item._id),
      vehicleId: String(item.vehicleId),
      vehicleLabel: item.vehicleCode,
      vehicleCode: item.vehicleCode,
      maintenanceType: item.serviceItemName,
      branchId: String(item.branchId ?? ''),
      overdue: Boolean(item.overdue),
      blockedForAssignment: Boolean(item.blockedAssignment),
      blockedAssignment: Boolean(item.blockedAssignment),
      dueDate: item.nextDueDate,
      dueKm: item.nextDueKm,
      currentOdometerKm: item.currentOdometerKm,
      critical: Boolean(item.criticalFlag),
    }));
  }

  async getTireInspectionDue() {
    return this.getDueVehicles({ maintenanceType: 'tire_inspection' });
  }

  async getNotifications() {
    await connectToDatabase();
    const rows = await MaintenanceNotificationModel.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select('vehicleId vehicleCode driverId maintenanceType dueKm dueDate message status sentAt')
      .lean();
    return rows.map((item) => ({
      id: String(item._id),
      vehicleId: String(item.vehicleId),
      vehicleCode: item.vehicleCode,
      driverId: String(item.driverId ?? ''),
      maintenanceType: item.maintenanceType,
      dueKm: item.dueKm,
      dueDate: item.dueDate,
      message: item.message,
      status: item.status,
      sentAt: item.sentAt,
    }));
  }

  getRules() {
    return [
      {
        key: 'tire_inspection_4000km',
        serviceItemName: 'Tire inspection',
        intervalKm: 4000,
        intervalDays: 30,
        criticalFlag: true,
        notificationDaysBeforeDue: 3,
        blockTripAssignmentIfOverdue: true,
      },
      {
        key: 'brake_service_10000km',
        serviceItemName: 'Brake service',
        intervalKm: 10000,
        intervalDays: 60,
        criticalFlag: false,
        notificationDaysBeforeDue: 5,
        blockTripAssignmentIfOverdue: false,
      },
      {
        key: 'oil_service_10000km',
        serviceItemName: 'Oil service',
        intervalKm: 10000,
        intervalDays: 60,
        criticalFlag: false,
        notificationDaysBeforeDue: 5,
        blockTripAssignmentIfOverdue: false,
      },
    ];
  }

  async getOverdueVehicles() {
    return this.getDueVehicles({ overdueOnly: 'true' });
  }

  async getBlockedVehicles() {
    return this.getDueVehicles({ blockedOnly: 'true' });
  }

  async getVehicleHistory(vehicleId: string) {
    await connectToDatabase();
    const vehicle = await VehicleModel.findOne({ $or: [{ _id: vehicleId }, { vehicleCode: vehicleId }] }).lean();
    if (!vehicle) return null;

    const [plans, records, repairOrders, notifications] = await Promise.all([
      MaintenancePlanModel.find({ vehicleId: vehicle._id }).sort({ nextDueDate: -1, nextDueKm: -1 }).lean(),
      MaintenanceRecordModel.find({ vehicleId: vehicle._id }).sort({ serviceDate: -1 }).limit(100).lean(),
      RepairOrderModel.find({ vehicleId: vehicle._id }).sort({ updatedAt: -1 }).limit(100).lean(),
      MaintenanceNotificationModel.find({ vehicleId: vehicle._id }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);

    return {
      vehicle: {
        id: String(vehicle._id),
        vehicleCode: vehicle.vehicleCode,
        branchName: vehicle.branchName,
        currentStatus: vehicle.currentStatus,
        currentOdometerKm: vehicle.currentOdometerKm,
      },
      plans,
      records,
      repairOrders,
      notifications,
      timeline: [
        ...records.map((item) => ({
          id: `record-${String(item._id)}`,
          type: 'service_record',
          title: item.serviceType,
          at: item.serviceDate,
          detail: `ETB ${Number(item.totalCost || 0).toLocaleString()}`,
        })),
        ...repairOrders.map((item) => ({
          id: `repair-${String(item._id)}`,
          type: 'repair_order',
          title: item.repairOrderCode,
          at: item.updatedAt ?? item.createdAt,
          detail: `${item.status} · ${item.workshop || 'Unassigned workshop'}`,
        })),
        ...notifications.map((item) => ({
          id: `notification-${String(item._id)}`,
          type: 'notification',
          title: item.maintenanceType,
          at: item.sentAt ?? item.createdAt,
          detail: item.message,
        })),
      ].sort((left, right) => new Date(String(right.at)).getTime() - new Date(String(left.at)).getTime()),
    };
  }

  async listRepairOrders(status?: string) {
    await connectToDatabase();
    const query = status ? { status } : {};
    return RepairOrderModel.find(query).sort({ openedAt: -1, updatedAt: -1 }).limit(100).lean();
  }

  async getRepairOrder(id: string) {
    await connectToDatabase();
    return RepairOrderModel.findOne({ $or: [{ _id: id }, { repairOrderCode: id }] }).lean();
  }

  async createRepairOrder(body: Record<string, unknown>) {
    await connectToDatabase();
    const count = await RepairOrderModel.countDocuments({});
    const doc = await RepairOrderModel.create({
      repairOrderCode: `RO-${String(count + 1).padStart(5, '0')}`,
      ...body,
      status: body.status ?? 'reported',
      openedAt: body.openedAt ?? new Date(),
      blockedAssignment: body.blockedAssignment ?? false,
    });
    if (doc.vehicleId && doc.blockedAssignment) {
      await VehicleModel.updateOne({ _id: doc.vehicleId }, { $set: { currentStatus: 'under_maintenance' } });
    }
    return doc.toObject();
  }

  async updateRepairOrderStatus(id: string, body: Record<string, unknown>) {
    await connectToDatabase();
    const status = String(body.status ?? 'under_review');
    const update: Record<string, unknown> = {
      status,
      notes: body.notes,
      workshop: body.workshop,
      technician: body.technician,
      blockedAssignment: body.blockedAssignment ?? ['blocked_assignment', 'approved', 'scheduled', 'in_service'].includes(status),
      performedOdometerKm: body.performedOdometerKm,
      performedBy: body.performedBy,
      actualCost: body.actualCost,
    };
    if (status === 'scheduled') update.scheduledAt = new Date();
    if (status === 'completed') update.completedAt = new Date();
    const doc = await RepairOrderModel.findOneAndUpdate(
      { $or: [{ _id: id }, { repairOrderCode: id }] },
      { $set: update },
      { new: true },
    ).lean();
    if (doc?.vehicleId) {
      await VehicleModel.updateOne(
        { _id: doc.vehicleId },
        { $set: { currentStatus: status === 'completed' ? 'available' : 'under_maintenance' } },
      );
    }
    return doc;
  }

  async createPlan(body: Record<string, unknown>) {
    await connectToDatabase();
    const doc = await MaintenancePlanModel.create(body);
    return doc.toObject();
  }

  async listPlans() {
    await connectToDatabase();
    return MaintenancePlanModel.find({ status: { $in: ['active', 'due', 'overdue'] } })
      .sort({ overdue: -1, nextDueDate: 1, nextDueKm: 1 })
      .limit(200)
      .lean();
  }

  async updatePlan(id: string, body: Record<string, unknown>) {
    await connectToDatabase();
    return MaintenancePlanModel.findOneAndUpdate({ $or: [{ _id: id }, { vehicleCode: id }] }, { $set: body }, { new: true }).lean();
  }

  async createNotification(body: Record<string, unknown>) {
    await connectToDatabase();
    const doc = await MaintenanceNotificationModel.create({
      ...body,
      status: body.status ?? 'pending',
      sentAt: body.sentAt ?? new Date(),
    });
    return doc.toObject();
  }

  async markNotificationRead(id: string) {
    await connectToDatabase();
    return MaintenanceNotificationModel.findOneAndUpdate(
      { _id: id },
      { $set: { status: 'read', readAt: new Date() } },
      { new: true },
    ).lean();
  }

  async listLowStockParts() {
    await connectToDatabase();
    return SparePartModel.find({ status: 'low_stock' }).sort({ stockQty: 1 }).limit(40).lean();
  }

  private buildPlanQuery(filters: MaintenanceAlertQueryDto = {}) {
    const query: Record<string, unknown> = {
      status: { $in: ['active', 'due', 'overdue'] },
    };

    if (filters.branch) {
      query.$or = [{ branchId: filters.branch }, { branchName: filters.branch }];
    }
    if (filters.maintenanceType) {
      query.serviceItemName = filters.maintenanceType === 'tire_inspection'
        ? 'Tire inspection'
        : filters.maintenanceType.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    }
    if (filters.overdueOnly === 'true') {
      query.overdue = true;
    }
    if (filters.blockedOnly === 'true') {
      query.blockedAssignment = true;
    }
    return query;
  }
}
