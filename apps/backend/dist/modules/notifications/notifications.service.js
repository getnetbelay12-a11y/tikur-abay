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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const notification_jobs_service_1 = require("./notification-jobs.service");
let NotificationsService = class NotificationsService {
    constructor(jobs) {
        this.jobs = jobs;
    }
    async listApp(user) {
        await (0, mongo_1.connectToDatabase)();
        const [branch, notifications] = await Promise.all([
            user.branchId ? models_1.BranchModel.findById(user.branchId).lean() : null,
            models_1.NotificationModel.find({ userId: user.id }).sort({ createdAt: -1 }).limit(100).lean(),
        ]);
        return notifications.map((notification) => {
            const category = mapNotificationCategory(notification.category || notification.type, notification.title);
            const severity = mapNotificationSeverity(notification.category || notification.type, notification.title);
            return {
                id: String(notification._id),
                title: notification.title || 'Operational update',
                secondaryText: notification.body || notification.message || 'Follow-up is required.',
                timestamp: notification.createdAt || notification.updatedAt || new Date(),
                isRead: notification.status ? notification.status !== 'unread' : Boolean(notification.isRead),
                category,
                severity,
                branch: branch?.name || 'All branches',
                linkedEntity: buildLinkedEntity(notification.entityType, notification.entityId),
                actionLabel: notification.actionLabel || defaultActionLabel(category, notification.entityType),
                actionRoute: notification.actionRoute || buildLinkedEntity(notification.entityType, notification.entityId).href,
                entityId: notification.entityId || null,
                entityType: notification.entityType || 'system',
            };
        });
    }
    async readApp(id) {
        await (0, mongo_1.connectToDatabase)();
        return models_1.NotificationModel.findByIdAndUpdate(id, { $set: { isRead: true, status: 'read', readAt: new Date(), updatedAt: new Date() } }, { new: true }).lean();
    }
    async readAllApp(user) {
        await (0, mongo_1.connectToDatabase)();
        await models_1.NotificationModel.updateMany({ userId: user.id, $or: [{ isRead: false }, { status: 'unread' }] }, { $set: { isRead: true, status: 'read', readAt: new Date(), updatedAt: new Date() } });
        return this.listApp(user);
    }
    async unreadCount(user) {
        await (0, mongo_1.connectToDatabase)();
        const count = await models_1.NotificationModel.countDocuments({ userId: user.id, $or: [{ isRead: false }, { status: 'unread' }] });
        return { count };
    }
    async listMaintenance(user) {
        await (0, mongo_1.connectToDatabase)();
        const query = {};
        if (user?.role === 'driver') {
            query.driverId = user.id;
        }
        else if (user?.branchId && !user.permissions.includes('*')) {
            query.branchId = user.branchId;
        }
        return models_1.MaintenanceNotificationModel.find(query).sort({ createdAt: -1 }).limit(100).lean();
    }
    async createMaintenance(body) {
        await (0, mongo_1.connectToDatabase)();
        const doc = await models_1.MaintenanceNotificationModel.create({
            ...body,
            status: body.status || 'queued',
        });
        await this.jobs.enqueue({ kind: 'maintenance', id: String(doc._id) });
        return models_1.MaintenanceNotificationModel.findById(doc._id).lean();
    }
    async markMaintenanceRead(id) {
        await (0, mongo_1.connectToDatabase)();
        return models_1.MaintenanceNotificationModel.findByIdAndUpdate(id, { $set: { status: 'read', readAt: new Date(), updatedAt: new Date() } }, { new: true }).lean();
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notification_jobs_service_1.NotificationJobsService])
], NotificationsService);
function mapNotificationCategory(type, title) {
    const value = `${type || ''} ${title || ''}`.toLowerCase();
    if (value.includes('driver') || value.includes('fuel') || value.includes('trip'))
        return 'driver';
    if (value.includes('maintenance') || value.includes('repair'))
        return 'maintenance';
    if (value.includes('invoice') || value.includes('payment'))
        return 'finance';
    if (value.includes('hr') || value.includes('leave') || value.includes('training'))
        return 'hr';
    if (value.includes('agreement') || value.includes('contract'))
        return 'agreements';
    if (value.includes('school') || value.includes('student'))
        return 'driving_school';
    if (value.includes('customer') || value.includes('user'))
        return 'customer_user';
    if (value.includes('compliance') || value.includes('kyc'))
        return 'compliance';
    return 'operations';
}
function mapNotificationSeverity(type, title) {
    const value = `${type || ''} ${title || ''}`.toLowerCase();
    if (value.includes('overdue') || value.includes('blocked') || value.includes('incident'))
        return 'critical';
    if (value.includes('delay') || value.includes('due') || value.includes('review'))
        return 'high';
    if (value.includes('payment') || value.includes('follow'))
        return 'medium';
    return 'info';
}
function buildLinkedEntity(entityType, entityId) {
    if (!entityType && !entityId) {
        return { label: 'System notification', href: '#' };
    }
    const cleanType = String(entityType || 'system');
    const cleanId = String(entityId || '');
    const routeMap = {
        trip: `/trips`,
        shipment: `/shipments`,
        support: `/support`,
        vehicle: `/vehicles`,
        driver_report: `/driver-reports`,
        invoice: `/finance-console`,
        agreement: `/agreements`,
        student: `/driving-school`,
        system: '/notifications',
    };
    return {
        label: cleanId ? `${cleanType.replace(/_/g, ' ')} ${cleanId}` : cleanType.replace(/_/g, ' '),
        href: routeMap[cleanType] || '/notifications',
    };
}
function defaultActionLabel(category, entityType) {
    if (entityType === 'trip')
        return 'Open trip';
    if (entityType === 'vehicle')
        return 'Open vehicle';
    if (entityType === 'agreement')
        return 'Open agreement';
    if (entityType === 'invoice')
        return 'Open invoice';
    if (category === 'maintenance')
        return 'Review issue';
    if (category === 'finance')
        return 'Review queue';
    return 'Open detail';
}
//# sourceMappingURL=notifications.service.js.map