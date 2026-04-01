import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DashboardsService } from '../dashboards/dashboards.service';
import { RealtimeGateway } from './realtime.gateway';
export declare class ChangeStreamWatchersService implements OnModuleInit, OnModuleDestroy {
    private readonly realtimeGateway;
    private readonly dashboardsService;
    private readonly logger;
    private readonly streams;
    private dashboardTimer;
    constructor(realtimeGateway: RealtimeGateway, dashboardsService: DashboardsService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private openStream;
    private tryOpenStream;
    private scheduleDashboardRefresh;
    private emitDashboardRefresh;
    private handleShipmentChange;
    private handleMilestoneChange;
    private handleCheckpointChange;
    private handleContainerChange;
    private handleDocumentChange;
    private handleUploadedDocumentChange;
    private handlePaymentChange;
    private handleDriverReimbursementChange;
    private handleExceptionChange;
    private resolveShipmentFromDocument;
    private resolveShipmentContext;
    private toIsoString;
}
