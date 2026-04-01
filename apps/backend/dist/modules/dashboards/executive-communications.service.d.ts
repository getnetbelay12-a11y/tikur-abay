type Channel = 'email' | 'sms' | 'telegram' | 'in_app';
type ChannelSelection = Channel | 'all';
type TemplateType = 'payment_reminder' | 'thank_you' | 'trip_delay_update' | 'dispatch_action_notice' | 'maintenance_escalation' | 'driver_document_reminder';
type ScheduleOption = 'send_now' | 'today_5pm' | 'tomorrow_morning' | 'custom_time';
export declare class ExecutiveCommunicationsService {
    getHistory(entityType: string, entityId: string, user: {
        email?: string;
    }): Promise<{
        entity: {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: any;
            branchName: string;
            severity: string;
            recipients: {
                email: any;
                sms: any;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                customerName: any;
                invoiceCode: any;
                amountLabel: string;
                dueDateLabel: string;
                paymentCode: any;
                statusLabel: string;
            };
        } | {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: any;
            branchName: any;
            severity: string;
            recipients: {
                email: any;
                sms: any;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                customerName: any;
                tripCode: any;
                routeName: any;
                statusLabel: string;
            };
        } | {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: string;
            branchName: any;
            severity: string;
            recipients: {
                email: string;
                sms: string;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                vehicleCode: any;
                branchName: any;
                maintenanceItem: any;
                statusLabel: string;
            };
        } | {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: string;
            branchName: string;
            severity: string;
            recipients: {
                email: string;
                sms: any;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                driverName: any;
                partnerCompany: any;
                partnerVehicleCode: any;
                statusLabel: string;
            };
        } | {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: string;
            branchName: string;
            severity: string;
            recipients: {
                email: string;
                sms: string;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                vehicleCode: any;
                driverName: any;
                tripCode: any;
                statusLabel: string;
            };
        };
        history: {
            id: string;
            entityType: any;
            entityId: any;
            channel: any;
            recipient: any;
            template: any;
            subject: any;
            message: any;
            status: any;
            sentBy: any;
            sentAt: any;
            scheduledAt: any;
            severity: any;
            providerResponse: any;
        }[];
    }>;
    sendCommunication(body: {
        entityType?: string;
        entityId?: string;
        channel?: ChannelSelection;
        template?: TemplateType;
        recipients?: Partial<Record<Channel, string>>;
        subject?: string;
        message?: string;
        saveAsDraft?: boolean;
        scheduleOption?: ScheduleOption;
        scheduledAt?: string;
        severity?: string;
    }, user: {
        email?: string;
    }): Promise<{
        entity: {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: any;
            branchName: string;
            severity: string;
            recipients: {
                email: any;
                sms: any;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                customerName: any;
                invoiceCode: any;
                amountLabel: string;
                dueDateLabel: string;
                paymentCode: any;
                statusLabel: string;
            };
        } | {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: any;
            branchName: any;
            severity: string;
            recipients: {
                email: any;
                sms: any;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                customerName: any;
                tripCode: any;
                routeName: any;
                statusLabel: string;
            };
        } | {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: string;
            branchName: any;
            severity: string;
            recipients: {
                email: string;
                sms: string;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                vehicleCode: any;
                branchName: any;
                maintenanceItem: any;
                statusLabel: string;
            };
        } | {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: string;
            branchName: string;
            severity: string;
            recipients: {
                email: string;
                sms: any;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                driverName: any;
                partnerCompany: any;
                partnerVehicleCode: any;
                statusLabel: string;
            };
        } | {
            entityType: string;
            entityId: string;
            title: any;
            subtitle: string;
            defaultTemplate: string;
            customerName: string;
            branchName: string;
            severity: string;
            recipients: {
                email: string;
                sms: string;
                telegram: string;
                in_app: string;
            };
            fields: {
                label: string;
                value: any;
            }[];
            tokens: {
                vehicleCode: any;
                driverName: any;
                tripCode: any;
                statusLabel: string;
            };
        };
        records: {
            id: string;
            entityType: any;
            entityId: any;
            channel: any;
            recipient: any;
            template: any;
            subject: any;
            message: any;
            status: any;
            sentBy: any;
            sentAt: any;
            scheduledAt: any;
            severity: any;
            providerResponse: any;
        }[];
    }>;
    private resolveEntityContext;
    private resolveInvoiceContext;
    private resolveTripContext;
    private resolveVehicleContext;
    private resolveDriverKycContext;
    private resolveIncidentContext;
    private mapRecord;
}
export {};
