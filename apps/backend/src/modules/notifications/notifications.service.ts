import { Injectable } from '@nestjs/common';
import { connectToDatabase } from '../../database/mongo';
import { BranchModel, MaintenanceNotificationModel, NotificationModel } from '../../database/models';
import { AuthenticatedUser } from '../auth/auth.types';
import { NotificationJobsService } from './notification-jobs.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly jobs: NotificationJobsService) {}

  async listApp(user: AuthenticatedUser) {
    await connectToDatabase();
    const [branch, notifications] = await Promise.all([
      user.branchId ? BranchModel.findById(user.branchId).lean<any>() : null,
      NotificationModel.find({ userId: user.id }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);

    return notifications.map((notification: any) => {
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

  async readApp(id: string) {
    await connectToDatabase();
    return NotificationModel.findByIdAndUpdate(
      id,
      { $set: { isRead: true, status: 'read', readAt: new Date(), updatedAt: new Date() } },
      { new: true },
    ).lean();
  }

  async readAllApp(user: AuthenticatedUser) {
    await connectToDatabase();
    await NotificationModel.updateMany(
      { userId: user.id, $or: [{ isRead: false }, { status: 'unread' }] },
      { $set: { isRead: true, status: 'read', readAt: new Date(), updatedAt: new Date() } },
    );
    return this.listApp(user);
  }

  async unreadCount(user: AuthenticatedUser) {
    await connectToDatabase();
    const count = await NotificationModel.countDocuments({ userId: user.id, $or: [{ isRead: false }, { status: 'unread' }] });
    return { count };
  }

  async listMaintenance(user?: AuthenticatedUser) {
    await connectToDatabase();
    const query: Record<string, unknown> = {};
    if (user?.role === 'driver') {
      query.driverId = user.id;
    } else if (user?.branchId && !user.permissions.includes('*')) {
      query.branchId = user.branchId;
    }
    return MaintenanceNotificationModel.find(query).sort({ createdAt: -1 }).limit(100).lean();
  }

  async createMaintenance(body: Record<string, unknown>) {
    await connectToDatabase();
    const doc = await MaintenanceNotificationModel.create({
      ...body,
      status: body.status || 'queued',
    });
    await this.jobs.enqueue({ kind: 'maintenance', id: String(doc._id) });
    return MaintenanceNotificationModel.findById(doc._id).lean();
  }

  async markMaintenanceRead(id: string) {
    await connectToDatabase();
    return MaintenanceNotificationModel.findByIdAndUpdate(
      id,
      { $set: { status: 'read', readAt: new Date(), updatedAt: new Date() } },
      { new: true },
    ).lean();
  }
}

function mapNotificationCategory(type?: string, title?: string) {
  const value = `${type || ''} ${title || ''}`.toLowerCase();
  if (value.includes('driver') || value.includes('fuel') || value.includes('trip')) return 'driver';
  if (value.includes('maintenance') || value.includes('repair')) return 'maintenance';
  if (value.includes('invoice') || value.includes('payment')) return 'finance';
  if (value.includes('hr') || value.includes('leave') || value.includes('training')) return 'hr';
  if (value.includes('agreement') || value.includes('contract')) return 'agreements';
  if (value.includes('school') || value.includes('student')) return 'driving_school';
  if (value.includes('customer') || value.includes('user')) return 'customer_user';
  if (value.includes('compliance') || value.includes('kyc')) return 'compliance';
  return 'operations';
}

function mapNotificationSeverity(type?: string, title?: string) {
  const value = `${type || ''} ${title || ''}`.toLowerCase();
  if (value.includes('overdue') || value.includes('blocked') || value.includes('incident')) return 'critical';
  if (value.includes('delay') || value.includes('due') || value.includes('review')) return 'high';
  if (value.includes('payment') || value.includes('follow')) return 'medium';
  return 'info';
}

function buildLinkedEntity(entityType?: string, entityId?: string) {
  if (!entityType && !entityId) {
    return { label: 'System notification', href: '#' };
  }
  const cleanType = String(entityType || 'system');
  const cleanId = String(entityId || '');
  const routeMap: Record<string, string> = {
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

function defaultActionLabel(category: string, entityType?: string) {
  if (entityType === 'trip') return 'Open trip';
  if (entityType === 'vehicle') return 'Open vehicle';
  if (entityType === 'agreement') return 'Open agreement';
  if (entityType === 'invoice') return 'Open invoice';
  if (category === 'maintenance') return 'Review issue';
  if (category === 'finance') return 'Review queue';
  return 'Open detail';
}
