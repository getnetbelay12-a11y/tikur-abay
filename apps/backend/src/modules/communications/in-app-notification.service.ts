// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { NotificationModel } from '../../database/models';
import { connectToDatabase } from '../../database/mongo';

@Injectable()
export class InAppNotificationService {
  async send(payload: {
    recipient: string;
    recipientName?: string;
    body: string;
    title?: string;
    category?: string;
    entityType: string;
    entityId: string;
    shipmentId?: string;
    tripId?: string;
    actionRoute?: string;
    actionLabel?: string;
  }) {
    await connectToDatabase();
    const notification = await NotificationModel.create({
      notificationId: `INAPP-${Date.now()}`,
      userId: payload.recipient,
      shipmentId: payload.shipmentId,
      tripId: payload.tripId,
      title: payload.title || 'Tikur Abay update',
      body: payload.body,
      message: payload.body,
      category: payload.category || 'general',
      type: payload.category || payload.entityType,
      status: 'unread',
      isRead: false,
      actionRoute: payload.actionRoute,
      actionLabel: payload.actionLabel,
      entityType: payload.entityType,
      entityId: payload.entityId,
    });

    return {
      status: 'sent',
      providerMessage: `in-app notification created for ${payload.recipient}`,
      providerMessageId: String(notification._id),
      simulated: false,
      notification: notification.toObject(),
    };
  }
}
