"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceService = void 0;
const common_1 = require("@nestjs/common");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const MAINTENANCE_DASHBOARD_TTL_MS = 30_000;
let maintenanceDashboardCache = null;
let MaintenanceService = class MaintenanceService {
    async getDashboard() {
        if (maintenanceDashboardCache && maintenanceDashboardCache.expiresAt > Date.now()) {
            return maintenanceDashboardCache.payload;
        }
        await (0, mongo_1.connectToDatabase)();
        const activeStatuses = ['active', 'due', 'overdue'];
        const openRepairStatuses = ['reported', 'under_review', 'approved', 'scheduled', 'in_service'];
        const [dueCount, tireInspectionDue, overdueCount, blockedAssignments, recentAlerts, openRepairOrders, lowStockParts, recentRecords, costSummary, completedRepairOrders, recentPartUsage] = await Promise.all([
            models_1.MaintenancePlanModel.countDocuments({ status: { $in: activeStatuses } }),
            models_1.MaintenancePlanModel.countDocuments({ status: { $in: activeStatuses }, serviceItemName: 'Tire inspection' }),
            models_1.MaintenancePlanModel.countDocuments({ status: { $in: activeStatuses }, overdue: true }),
            models_1.MaintenancePlanModel.countDocuments({ status: { $in: activeStatuses }, blockedAssignment: true }),
            models_1.MaintenancePlanModel.find({ status: { $in: activeStatuses } })
                .sort({ overdue: -1, nextDueDate: 1, nextDueKm: 1 })
                .limit(6)
                .select('vehicleId vehicleCode serviceItemName nextDueDate nextDueKm overdue blockedAssignment')
                .lean(),
            models_1.RepairOrderModel.countDocuments({ status: { $in: openRepairStatuses } }),
            models_1.SparePartModel.countDocuments({ status: 'low_stock' }),
            models_1.MaintenanceRecordModel.aggregate([
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
            models_1.MaintenanceRecordModel.aggregate([
                {
                    $match: {
                        serviceDate: {
                            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                        },
                    },
                },
                { $group: { _id: null, total: { $sum: '$totalCost' } } },
            ]),
            models_1.RepairOrderModel.find({ status: 'completed', openedAt: { $ne: null }, completedAt: { $ne: null } })
                .sort({ completedAt: -1 })
                .limit(40)
                .select('openedAt completedAt')
                .lean(),
            models_1.PartReplacementModel.find()
                .sort({ replacementDate: -1 })
                .limit(12)
                .select('vehicleCode partName partCategory replacementDate replacementKm cost vendor')
                .lean(),
        ]);
        const averageFixHours = completedRepairOrders.length
            ? Number((completedRepairOrders.reduce((sum, item) => {
                const openedAt = item.openedAt ? new Date(String(item.openedAt)).getTime() : 0;
                const completedAt = item.completedAt ? new Date(String(item.completedAt)).getTime() : 0;
                if (!openedAt || !completedAt || completedAt <= openedAt)
                    return sum;
                return sum + ((completedAt - openedAt) / (1000 * 60 * 60));
            }, 0) / completedRepairOrders.length).toFixed(1))
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
    async getDueVehicles(filters = {}) {
        await (0, mongo_1.connectToDatabase)();
        const query = this.buildPlanQuery(filters);
        const rows = await models_1.MaintenancePlanModel.find(query)
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
        await (0, mongo_1.connectToDatabase)();
        const rows = await models_1.MaintenanceNotificationModel.find()
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
    async getVehicleHistory(vehicleId) {
        await (0, mongo_1.connectToDatabase)();
        const vehicle = await models_1.VehicleModel.findOne({ $or: [{ _id: vehicleId }, { vehicleCode: vehicleId }] }).lean();
        if (!vehicle)
            return null;
        const [plans, records, repairOrders, notifications] = await Promise.all([
            models_1.MaintenancePlanModel.find({ vehicleId: vehicle._id }).sort({ nextDueDate: -1, nextDueKm: -1 }).lean(),
            models_1.MaintenanceRecordModel.find({ vehicleId: vehicle._id }).sort({ serviceDate: -1 }).limit(100).lean(),
            models_1.RepairOrderModel.find({ vehicleId: vehicle._id }).sort({ updatedAt: -1 }).limit(100).lean(),
            models_1.MaintenanceNotificationModel.find({ vehicleId: vehicle._id }).sort({ createdAt: -1 }).limit(100).lean(),
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
    async listRepairOrders(status) {
        await (0, mongo_1.connectToDatabase)();
        const query = status ? { status } : {};
        return models_1.RepairOrderModel.find(query).sort({ openedAt: -1, updatedAt: -1 }).limit(100).lean();
    }
    async getRepairOrder(id) {
        await (0, mongo_1.connectToDatabase)();
        return models_1.RepairOrderModel.findOne({ $or: [{ _id: id }, { repairOrderCode: id }] }).lean();
    }
    async createRepairOrder(body) {
        await (0, mongo_1.connectToDatabase)();
        const count = await models_1.RepairOrderModel.countDocuments({});
        const doc = await models_1.RepairOrderModel.create({
            repairOrderCode: `RO-${String(count + 1).padStart(5, '0')}`,
            ...body,
            status: body.status ?? 'reported',
            openedAt: body.openedAt ?? new Date(),
            blockedAssignment: body.blockedAssignment ?? false,
        });
        if (doc.vehicleId && doc.blockedAssignment) {
            await models_1.VehicleModel.updateOne({ _id: doc.vehicleId }, { $set: { currentStatus: 'under_maintenance' } });
        }
        return doc.toObject();
    }
    async updateRepairOrderStatus(id, body) {
        await (0, mongo_1.connectToDatabase)();
        const status = String(body.status ?? 'under_review');
        const update = {
            status,
            notes: body.notes,
            workshop: body.workshop,
            technician: body.technician,
            blockedAssignment: body.blockedAssignment ?? ['blocked_assignment', 'approved', 'scheduled', 'in_service'].includes(status),
            performedOdometerKm: body.performedOdometerKm,
            performedBy: body.performedBy,
            actualCost: body.actualCost,
        };
        if (status === 'scheduled')
            update.scheduledAt = new Date();
        if (status === 'completed')
            update.completedAt = new Date();
        const doc = await models_1.RepairOrderModel.findOneAndUpdate({ $or: [{ _id: id }, { repairOrderCode: id }] }, { $set: update }, { new: true }).lean();
        if (doc?.vehicleId) {
            await models_1.VehicleModel.updateOne({ _id: doc.vehicleId }, { $set: { currentStatus: status === 'completed' ? 'available' : 'under_maintenance' } });
        }
        return doc;
    }
    async createPlan(body) {
        await (0, mongo_1.connectToDatabase)();
        const doc = await models_1.MaintenancePlanModel.create(body);
        return doc.toObject();
    }
    async listPlans() {
        await (0, mongo_1.connectToDatabase)();
        return models_1.MaintenancePlanModel.find({ status: { $in: ['active', 'due', 'overdue'] } })
            .sort({ overdue: -1, nextDueDate: 1, nextDueKm: 1 })
            .limit(200)
            .lean();
    }
    async updatePlan(id, body) {
        await (0, mongo_1.connectToDatabase)();
        return models_1.MaintenancePlanModel.findOneAndUpdate({ $or: [{ _id: id }, { vehicleCode: id }] }, { $set: body }, { new: true }).lean();
    }
    async createNotification(body) {
        await (0, mongo_1.connectToDatabase)();
        const doc = await models_1.MaintenanceNotificationModel.create({
            ...body,
            status: body.status ?? 'pending',
            sentAt: body.sentAt ?? new Date(),
        });
        return doc.toObject();
    }
    async markNotificationRead(id) {
        await (0, mongo_1.connectToDatabase)();
        return models_1.MaintenanceNotificationModel.findOneAndUpdate({ _id: id }, { $set: { status: 'read', readAt: new Date() } }, { new: true }).lean();
    }
    async listLowStockParts() {
        await (0, mongo_1.connectToDatabase)();
        return models_1.SparePartModel.find({ status: 'low_stock' }).sort({ stockQty: 1 }).limit(40).lean();
    }
    buildPlanQuery(filters = {}) {
        const query = {
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
};
exports.MaintenanceService = MaintenanceService;
exports.MaintenanceService = MaintenanceService = __decorate([
    (0, common_1.Injectable)()
], MaintenanceService);
//# sourceMappingURL=maintenance.service.js.map