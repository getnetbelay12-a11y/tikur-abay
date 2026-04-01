// @ts-nocheck
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { connectToDatabase } from '../../database/mongo';
import {
  CorridorCheckpointEventModel,
  CorridorContainerModel,
  CorridorDocumentModel,
  CorridorExceptionModel,
  CorridorMilestoneModel,
  CorridorShipmentModel,
  DriverReimbursementModel,
  PaymentModel,
  UploadedDocumentModel,
} from '../../database/models';
import { DashboardsService } from '../dashboards/dashboards.service';
import { RealtimeGateway } from './realtime.gateway';

type DashboardKpisPayload = Awaited<ReturnType<DashboardsService['getTransportControlTowerSummary']>>;
type DashboardStatusPayload = Awaited<ReturnType<DashboardsService['getTransportControlTowerStatus']>>;
type DashboardTrendPayload = Awaited<ReturnType<DashboardsService['getTransportControlTowerTrend']>>;
type DashboardPerformancePayload = Awaited<ReturnType<DashboardsService['getTransportControlTowerPerformance']>>;
type DashboardAlertsPayload = Awaited<ReturnType<DashboardsService['getTransportControlTowerAlerts']>>;

type ShipmentRealtimePayload = {
  shipmentId: string;
  shipmentNo: string;
  status: string;
  stage: string;
  location: string;
  updatedAt: string;
};

type TrackingRealtimePayload = {
  shipmentId: string;
  containerNo: string;
  eventType: string;
  location: string;
  timestamp: string;
};

type FinanceRealtimePayload = {
  shipmentId: string;
  financeStatus: string;
  pendingAmount: number;
  receiptIssued: boolean;
};

type AlertRealtimePayload = {
  severity: string;
  type: string;
  shipmentId: string;
  message: string;
  containerNo?: string;
};

type ShipmentContext = {
  shipmentId: string;
  shipmentNo: string;
  customerCode: string;
  stage: string;
  location: string;
  status: string;
  updatedAt: string;
};

@Injectable()
export class ChangeStreamWatchersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChangeStreamWatchersService.name);
  private readonly streams: ChangeStream[] = [];
  private dashboardTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly realtimeGateway: RealtimeGateway,
    private readonly dashboardsService: DashboardsService,
  ) {}

  async onModuleInit() {
    await connectToDatabase();
    this.tryOpenStream('corridor_shipments', () => CorridorShipmentModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handleShipmentChange(change));
    this.tryOpenStream('corridor_milestones', () => CorridorMilestoneModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handleMilestoneChange(change));
    this.tryOpenStream('corridor_checkpoint_events', () => CorridorCheckpointEventModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handleCheckpointChange(change));
    this.tryOpenStream('corridor_containers', () => CorridorContainerModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handleContainerChange(change));
    this.tryOpenStream('corridor_documents', () => CorridorDocumentModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handleDocumentChange(change));
    this.tryOpenStream('uploaded_documents', () => UploadedDocumentModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handleUploadedDocumentChange(change));
    this.tryOpenStream('payments', () => PaymentModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handlePaymentChange(change));
    this.tryOpenStream('driver_reimbursements', () => DriverReimbursementModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handleDriverReimbursementChange(change));
    this.tryOpenStream('corridor_exceptions', () => CorridorExceptionModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handleExceptionChange(change));
  }

  async onModuleDestroy() {
    if (this.dashboardTimer) {
      clearTimeout(this.dashboardTimer);
      this.dashboardTimer = null;
    }

    await Promise.all(this.streams.map(async (stream) => {
      try {
        await stream.close();
      } catch (error) {
        this.logger.warn(`Change stream close failed: ${(error as Error).message}`);
      }
    }));
    this.streams.length = 0;
  }

  private openStream(name: string, stream: any, handler: (change: any) => Promise<void>) {
    this.streams.push(stream);
    stream.on('change', (change) => {
      void handler(change).catch((error) => {
        this.logger.warn(`${name} change handling failed: ${(error as Error).message}`);
      });
    });
    stream.on('error', (error) => {
      this.logger.warn(`${name} stream error: ${(error as Error).message}`);
    });
  }

  private tryOpenStream(name: string, factory: () => any, handler: (change: any) => Promise<void>) {
    try {
      this.openStream(name, factory(), handler);
    } catch (error) {
      this.logger.warn(`${name} stream unavailable: ${(error as Error).message}`);
    }
  }

  private scheduleDashboardRefresh() {
    if (this.dashboardTimer) {
      clearTimeout(this.dashboardTimer);
    }
    this.dashboardTimer = setTimeout(() => {
      void this.emitDashboardRefresh();
    }, 500);
  }

  private async emitDashboardRefresh() {
    this.dashboardTimer = null;
    const [kpis, status, trend, performance, alerts] = await Promise.all([
      this.dashboardsService.getTransportControlTowerSummary(),
      this.dashboardsService.getTransportControlTowerStatus(),
      this.dashboardsService.getTransportControlTowerTrend(),
      this.dashboardsService.getTransportControlTowerPerformance(),
      this.dashboardsService.getTransportControlTowerAlerts(),
    ]);

    this.realtimeGateway.emitDashboardKpis(kpis as DashboardKpisPayload);
    this.realtimeGateway.emitDashboardStatus(status as DashboardStatusPayload);
    this.realtimeGateway.emitDashboardTrend(trend as DashboardTrendPayload);
    this.realtimeGateway.emitDashboardPerformance(performance as DashboardPerformancePayload);

    const newestAlert = alerts[0];
    if (newestAlert) {
      this.realtimeGateway.emitAlert({
        severity: 'warning',
        type: 'dashboard_refresh',
        shipmentId: newestAlert.id,
        message: newestAlert.issue,
      }, newestAlert.id);
    }
  }

  private async handleShipmentChange(change: any) {
    const shipment = await this.resolveShipmentFromDocument(change.fullDocument);
    if (!shipment) {
      this.scheduleDashboardRefresh();
      return;
    }

    const payload: ShipmentRealtimePayload = {
      shipmentId: shipment.shipmentId,
      shipmentNo: shipment.shipmentNo,
      status: shipment.status,
      stage: shipment.stage,
      location: shipment.location,
      updatedAt: shipment.updatedAt,
    };

    this.realtimeGateway.emitShipmentUpdated(payload, shipment.shipmentId, shipment.customerCode);
    if (['inland_dispatch', 'inland_arrival', 'yard_processing', 'delivery_pod', 'empty_return'].includes(shipment.stage)) {
      this.realtimeGateway.emitDispatchUpdate(payload, shipment.shipmentId, shipment.customerCode);
    }

    const changeData = change.fullDocument as Record<string, unknown> | undefined;
    const severity = String(changeData?.riskLevel || '');
    const message = String(changeData?.latestExceptionSummary || changeData?.financeBlockReason || changeData?.closureBlockedReason || '');
    if (message) {
      const alertPayload: AlertRealtimePayload = {
        severity: severity || 'warning',
        type: 'shipment_status',
        shipmentId: shipment.shipmentId,
        message,
      };
      this.realtimeGateway.emitAlert(alertPayload, shipment.shipmentId, undefined, shipment.customerCode);
    }

    this.scheduleDashboardRefresh();
  }

  private async handleMilestoneChange(change: any) {
    const row = change.fullDocument as Record<string, unknown> | undefined;
    if (!row) {
      this.scheduleDashboardRefresh();
      return;
    }
    const shipment = await this.resolveShipmentContext(String(row.shipmentId || ''), String(row.shipmentRef || ''), String(row.containerNumber || ''));
    const payload: TrackingRealtimePayload = {
      shipmentId: shipment?.shipmentId || String(row.shipmentId || ''),
      containerNo: String(row.containerNumber || ''),
      eventType: String(row.code || row.label || row.stage || 'milestone'),
      location: String(row.location || shipment?.location || 'In corridor'),
      timestamp: this.toIsoString(row.occurredAt || row.updatedAt || row.createdAt),
    };

    this.realtimeGateway.emitTrackingEvent(payload, payload.shipmentId, payload.containerNo, shipment?.customerCode);
    this.scheduleDashboardRefresh();
  }

  private async handleCheckpointChange(change: any) {
    const row = change.fullDocument as Record<string, unknown> | undefined;
    if (!row) {
      this.scheduleDashboardRefresh();
      return;
    }
    const shipment = await this.resolveShipmentContext(String(row.shipmentId || ''), String(row.shipmentRef || ''), String(row.containerNumber || ''));
    const payload: TrackingRealtimePayload = {
      shipmentId: shipment?.shipmentId || String(row.shipmentId || ''),
      containerNo: String(row.containerNumber || ''),
      eventType: String(row.eventType || 'checkpoint'),
      location: String(row.checkpointName || shipment?.location || 'Checkpoint'),
      timestamp: this.toIsoString(row.eventAt || row.updatedAt || row.createdAt),
    };

    this.realtimeGateway.emitTrackingEvent(payload, payload.shipmentId, payload.containerNo, shipment?.customerCode);
    this.scheduleDashboardRefresh();
  }

  private async handleContainerChange(change: any) {
    const row = change.fullDocument as Record<string, unknown> | undefined;
    if (!row) {
      this.scheduleDashboardRefresh();
      return;
    }

    const shipment = await this.resolveShipmentContext(String(row.shipmentId || ''), String(row.shipmentRef || ''), String(row.containerNumber || ''));
    const eventType = String(row.emptyReturnStatus || row.releaseStatus || row.status || 'container_updated');
    const payload: TrackingRealtimePayload = {
      shipmentId: shipment?.shipmentId || String(row.shipmentId || ''),
      containerNo: String(row.containerNumber || row.containerId || ''),
      eventType,
      location: shipment?.location || 'Container status updated',
      timestamp: this.toIsoString(row.updatedAt || row.createdAt),
    };

    this.realtimeGateway.emitTrackingEvent(payload, payload.shipmentId, payload.containerNo, shipment?.customerCode);
    if (String(row.emptyReturnStatus || '').includes('overdue') || String(row.storageRiskLevel || '').toLowerCase() === 'critical') {
      this.realtimeGateway.emitAlert({
        severity: 'critical',
        type: 'container',
        shipmentId: payload.shipmentId,
        containerNo: payload.containerNo,
        message: `${payload.containerNo || 'Container'} requires immediate empty-return attention.`,
      }, payload.shipmentId, payload.containerNo, shipment?.customerCode);
    }
    this.scheduleDashboardRefresh();
  }

  private async handleDocumentChange(change: any) {
    const row = change.fullDocument as Record<string, unknown> | undefined;
    const shipment = await this.resolveShipmentContext(String(row?.shipmentId || ''), String(row?.shipmentRef || ''), String(row?.containerNumber || ''));
    if (shipment) {
      this.realtimeGateway.emitAlert({
        severity: String(row?.verificationStatus || row?.status || 'info'),
        type: 'document',
        shipmentId: shipment.shipmentId,
        containerNo: String(row?.containerNumber || ''),
        message: `${String(row?.documentType || 'Document')} ${String(row?.status || 'updated')}`,
      }, shipment.shipmentId, String(row?.containerNumber || ''), shipment.customerCode);
    }
    this.scheduleDashboardRefresh();
  }

  private async handleUploadedDocumentChange(change: any) {
    const row = change.fullDocument as Record<string, unknown> | undefined;
    const entityId = String(row?.entityId || '');
    if (!entityId) {
      this.scheduleDashboardRefresh();
      return;
    }

    const shipment = await this.resolveShipmentContext(entityId, entityId, '');
    if (shipment) {
      this.realtimeGateway.emitAlert({
        severity: 'info',
        type: 'uploaded_document',
        shipmentId: shipment.shipmentId,
        message: `${String(row?.documentType || 'Document')} uploaded`,
      }, shipment.shipmentId, undefined, shipment.customerCode);
    }
    this.scheduleDashboardRefresh();
  }

  private async handlePaymentChange(change: any) {
    const row = change.fullDocument as Record<string, unknown> | undefined;
    const customerCode = String(row?.customerCode || '');
    const payload: FinanceRealtimePayload = {
      shipmentId: '',
      financeStatus: String(row?.status || 'updated'),
      pendingAmount: Number(row?.amount ?? 0),
      receiptIssued: Boolean(row?.receiptUrl),
    };

    this.realtimeGateway.emitFinanceUpdated(payload, undefined, customerCode || undefined);
    this.scheduleDashboardRefresh();
  }

  private async handleDriverReimbursementChange(change: any) {
    const row = change.fullDocument as Record<string, unknown> | undefined;
    const shipment = await this.resolveShipmentContext(String(row?.shipmentId || ''), String(row?.shipmentRef || ''), '');
    const payload: FinanceRealtimePayload = {
      shipmentId: shipment?.shipmentId || String(row?.shipmentId || ''),
      financeStatus: String(row?.status || 'pending'),
      pendingAmount: Number(row?.approvedAmount ?? row?.claimedAmount ?? 0),
      receiptIssued: false,
    };

    this.realtimeGateway.emitFinanceUpdated(payload, payload.shipmentId, shipment?.customerCode);
    this.scheduleDashboardRefresh();
  }

  private async handleExceptionChange(change: any) {
    const row = change.fullDocument as Record<string, unknown> | undefined;
    if (!row) {
      this.scheduleDashboardRefresh();
      return;
    }

    const shipment = await this.resolveShipmentContext(String(row.shipmentId || ''), String(row.shipmentRef || ''), String(row.containerNumber || ''));
    const payload: AlertRealtimePayload = {
      severity: String(row.severity || 'warning'),
      type: String(row.type || 'exception'),
      shipmentId: shipment?.shipmentId || String(row.shipmentId || ''),
      containerNo: String(row.containerNumber || ''),
      message: String(row.summary || row.title || row.details || 'Operational exception'),
    };

    this.realtimeGateway.emitAlert(payload, payload.shipmentId, payload.containerNo, shipment?.customerCode);
    this.scheduleDashboardRefresh();
  }

  private async resolveShipmentFromDocument(document: unknown) {
    const row = document as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }

    return this.resolveShipmentContext(String(row.shipmentId || ''), String(row.shipmentRef || ''), '');
  }

  private async resolveShipmentContext(shipmentId: string, shipmentRef: string, containerNumber: string): Promise<ShipmentContext | null> {
    await connectToDatabase();

    let shipment = shipmentId
      ? await CorridorShipmentModel.findOne({ shipmentId }).select('shipmentId bookingNumber shipmentRef customerId customerCode currentStage workflowState currentStatus corridorRoute inlandDestination destinationNode updatedAt').lean()
      : null;

    if (!shipment && shipmentRef) {
      shipment = await CorridorShipmentModel.findOne({ shipmentRef }).select('shipmentId bookingNumber shipmentRef customerId customerCode currentStage workflowState currentStatus corridorRoute inlandDestination destinationNode updatedAt').lean();
    }

    if (!shipment && containerNumber) {
      const container = await CorridorContainerModel.findOne({ containerNumber }).select('shipmentId').lean();
      if (container?.shipmentId) {
        shipment = await CorridorShipmentModel.findOne({ shipmentId: container.shipmentId }).select('shipmentId bookingNumber shipmentRef customerId customerCode currentStage workflowState currentStatus corridorRoute inlandDestination destinationNode updatedAt').lean();
      }
    }

    if (!shipment) {
      return null;
    }

    return {
      shipmentId: String(shipment.shipmentId || ''),
      shipmentNo: String(shipment.bookingNumber || shipment.shipmentRef || shipment.shipmentId || ''),
      customerCode: String(shipment.customerCode || shipment.customerId || ''),
      stage: String(shipment.currentStage || ''),
      location: String(shipment.corridorRoute || shipment.inlandDestination || shipment.destinationNode || shipment.currentStage || 'In corridor'),
      status: String(shipment.workflowState || shipment.currentStatus || shipment.currentStage || ''),
      updatedAt: this.toIsoString(shipment.updatedAt),
    };
  }

  private toIsoString(value: unknown) {
    if (!value) {
      return new Date().toISOString();
    }
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }
}
