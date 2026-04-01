export declare class InAppNotificationService {
    send(payload: {
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
    }): Promise<{
        status: string;
        providerMessage: string;
        providerMessageId: string;
        simulated: boolean;
        notification: any;
    }>;
}
