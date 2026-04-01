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
var ChangeStreamWatchersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeStreamWatchersService = void 0;
const common_1 = require("@nestjs/common");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const dashboards_service_1 = require("../dashboards/dashboards.service");
const realtime_gateway_1 = require("./realtime.gateway");
let ChangeStreamWatchersService = ChangeStreamWatchersService_1 = class ChangeStreamWatchersService {
    constructor(realtimeGateway, dashboardsService) {
        this.realtimeGateway = realtimeGateway;
        this.dashboardsService = dashboardsService;
        this.logger = new common_1.Logger(ChangeStreamWatchersService_1.name);
        this.streams = [];
        this.dashboardTimer = null;
    }
    async onModuleInit() {
        await (0, mongo_1.connectToDatabase)();
        this.tryOpenStream('corridor_shipments', () => models_1.CorridorShipmentModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handleShipmentChange(change));
        this.tryOpenStream('corridor_milestones', () => models_1.CorridorMilestoneModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handleMilestoneChange(change));
        this.tryOpenStream('corridor_checkpoint_events', () => models_1.CorridorCheckpointEventModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handleCheckpointChange(change));
        this.tryOpenStream('corridor_containers', () => models_1.CorridorContainerModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handleContainerChange(change));
        this.tryOpenStream('corridor_documents', () => models_1.CorridorDocumentModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handleDocumentChange(change));
        this.tryOpenStream('uploaded_documents', () => models_1.UploadedDocumentModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handleUploadedDocumentChange(change));
        this.tryOpenStream('payments', () => models_1.PaymentModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handlePaymentChange(change));
        this.tryOpenStream('driver_reimbursements', () => models_1.DriverReimbursementModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handleDriverReimbursementChange(change));
        this.tryOpenStream('corridor_exceptions', () => models_1.CorridorExceptionModel.watch([], { fullDocument: 'updateLookup' }), async (change) => this.handleExceptionChange(change));
    }
    async onModuleDestroy() {
        if (this.dashboardTimer) {
            clearTimeout(this.dashboardTimer);
            this.dashboardTimer = null;
        }
        await Promise.all(this.streams.map(async (stream) => {
            try {
                await stream.close();
            }
            catch (error) {
                this.logger.warn(`Change stream close failed: ${error.message}`);
            }
        }));
        this.streams.length = 0;
    }
    openStream(name, stream, handler) {
        this.streams.push(stream);
        stream.on('change', (change) => {
            void handler(change).catch((error) => {
                this.logger.warn(`${name} change handling failed: ${error.message}`);
            });
        });
        stream.on('error', (error) => {
            this.logger.warn(`${name} stream error: ${error.message}`);
        });
    }
    tryOpenStream(name, factory, handler) {
        try {
            this.openStream(name, factory(), handler);
        }
        catch (error) {
            this.logger.warn(`${name} stream unavailable: ${error.message}`);
        }
    }
    scheduleDashboardRefresh() {
        if (this.dashboardTimer) {
            clearTimeout(this.dashboardTimer);
        }
        this.dashboardTimer = setTimeout(() => {
            void this.emitDashboardRefresh();
        }, 500);
    }
    async emitDashboardRefresh() {
        this.dashboardTimer = null;
        const [kpis, status, trend, performance, alerts] = await Promise.all([
            this.dashboardsService.getTransportControlTowerSummary(),
            this.dashboardsService.getTransportControlTowerStatus(),
            this.dashboardsService.getTransportControlTowerTrend(),
            this.dashboardsService.getTransportControlTowerPerformance(),
            this.dashboardsService.getTransportControlTowerAlerts(),
        ]);
        this.realtimeGateway.emitDashboardKpis(kpis);
        this.realtimeGateway.emitDashboardStatus(status);
        this.realtimeGateway.emitDashboardTrend(trend);
        this.realtimeGateway.emitDashboardPerformance(performance);
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
    async handleShipmentChange(change) {
        const shipment = await this.resolveShipmentFromDocument(change.fullDocument);
        if (!shipment) {
            this.scheduleDashboardRefresh();
            return;
        }
        const payload = {
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
        const changeData = change.fullDocument;
        const severity = String(changeData?.riskLevel || '');
        const message = String(changeData?.latestExceptionSummary || changeData?.financeBlockReason || changeData?.closureBlockedReason || '');
        if (message) {
            const alertPayload = {
                severity: severity || 'warning',
                type: 'shipment_status',
                shipmentId: shipment.shipmentId,
                message,
            };
            this.realtimeGateway.emitAlert(alertPayload, shipment.shipmentId, undefined, shipment.customerCode);
        }
        this.scheduleDashboardRefresh();
    }
    async handleMilestoneChange(change) {
        const row = change.fullDocument;
        if (!row) {
            this.scheduleDashboardRefresh();
            return;
        }
        const shipment = await this.resolveShipmentContext(String(row.shipmentId || ''), String(row.shipmentRef || ''), String(row.containerNumber || ''));
        const payload = {
            shipmentId: shipment?.shipmentId || String(row.shipmentId || ''),
            containerNo: String(row.containerNumber || ''),
            eventType: String(row.code || row.label || row.stage || 'milestone'),
            location: String(row.location || shipment?.location || 'In corridor'),
            timestamp: this.toIsoString(row.occurredAt || row.updatedAt || row.createdAt),
        };
        this.realtimeGateway.emitTrackingEvent(payload, payload.shipmentId, payload.containerNo, shipment?.customerCode);
        this.scheduleDashboardRefresh();
    }
    async handleCheckpointChange(change) {
        const row = change.fullDocument;
        if (!row) {
            this.scheduleDashboardRefresh();
            return;
        }
        const shipment = await this.resolveShipmentContext(String(row.shipmentId || ''), String(row.shipmentRef || ''), String(row.containerNumber || ''));
        const payload = {
            shipmentId: shipment?.shipmentId || String(row.shipmentId || ''),
            containerNo: String(row.containerNumber || ''),
            eventType: String(row.eventType || 'checkpoint'),
            location: String(row.checkpointName || shipment?.location || 'Checkpoint'),
            timestamp: this.toIsoString(row.eventAt || row.updatedAt || row.createdAt),
        };
        this.realtimeGateway.emitTrackingEvent(payload, payload.shipmentId, payload.containerNo, shipment?.customerCode);
        this.scheduleDashboardRefresh();
    }
    async handleContainerChange(change) {
        const row = change.fullDocument;
        if (!row) {
            this.scheduleDashboardRefresh();
            return;
        }
        const shipment = await this.resolveShipmentContext(String(row.shipmentId || ''), String(row.shipmentRef || ''), String(row.containerNumber || ''));
        const eventType = String(row.emptyReturnStatus || row.releaseStatus || row.status || 'container_updated');
        const payload = {
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
    async handleDocumentChange(change) {
        const row = change.fullDocument;
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
    async handleUploadedDocumentChange(change) {
        const row = change.fullDocument;
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
    async handlePaymentChange(change) {
        const row = change.fullDocument;
        const customerCode = String(row?.customerCode || '');
        const payload = {
            shipmentId: '',
            financeStatus: String(row?.status || 'updated'),
            pendingAmount: Number(row?.amount ?? 0),
            receiptIssued: Boolean(row?.receiptUrl),
        };
        this.realtimeGateway.emitFinanceUpdated(payload, undefined, customerCode || undefined);
        this.scheduleDashboardRefresh();
    }
    async handleDriverReimbursementChange(change) {
        const row = change.fullDocument;
        const shipment = await this.resolveShipmentContext(String(row?.shipmentId || ''), String(row?.shipmentRef || ''), '');
        const payload = {
            shipmentId: shipment?.shipmentId || String(row?.shipmentId || ''),
            financeStatus: String(row?.status || 'pending'),
            pendingAmount: Number(row?.approvedAmount ?? row?.claimedAmount ?? 0),
            receiptIssued: false,
        };
        this.realtimeGateway.emitFinanceUpdated(payload, payload.shipmentId, shipment?.customerCode);
        this.scheduleDashboardRefresh();
    }
    async handleExceptionChange(change) {
        const row = change.fullDocument;
        if (!row) {
            this.scheduleDashboardRefresh();
            return;
        }
        const shipment = await this.resolveShipmentContext(String(row.shipmentId || ''), String(row.shipmentRef || ''), String(row.containerNumber || ''));
        const payload = {
            severity: String(row.severity || 'warning'),
            type: String(row.type || 'exception'),
            shipmentId: shipment?.shipmentId || String(row.shipmentId || ''),
            containerNo: String(row.containerNumber || ''),
            message: String(row.summary || row.title || row.details || 'Operational exception'),
        };
        this.realtimeGateway.emitAlert(payload, payload.shipmentId, payload.containerNo, shipment?.customerCode);
        this.scheduleDashboardRefresh();
    }
    async resolveShipmentFromDocument(document) {
        const row = document;
        if (!row) {
            return null;
        }
        return this.resolveShipmentContext(String(row.shipmentId || ''), String(row.shipmentRef || ''), '');
    }
    async resolveShipmentContext(shipmentId, shipmentRef, containerNumber) {
        await (0, mongo_1.connectToDatabase)();
        let shipment = shipmentId
            ? await models_1.CorridorShipmentModel.findOne({ shipmentId }).select('shipmentId bookingNumber shipmentRef customerId customerCode currentStage workflowState currentStatus corridorRoute inlandDestination destinationNode updatedAt').lean()
            : null;
        if (!shipment && shipmentRef) {
            shipment = await models_1.CorridorShipmentModel.findOne({ shipmentRef }).select('shipmentId bookingNumber shipmentRef customerId customerCode currentStage workflowState currentStatus corridorRoute inlandDestination destinationNode updatedAt').lean();
        }
        if (!shipment && containerNumber) {
            const container = await models_1.CorridorContainerModel.findOne({ containerNumber }).select('shipmentId').lean();
            if (container?.shipmentId) {
                shipment = await models_1.CorridorShipmentModel.findOne({ shipmentId: container.shipmentId }).select('shipmentId bookingNumber shipmentRef customerId customerCode currentStage workflowState currentStatus corridorRoute inlandDestination destinationNode updatedAt').lean();
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
    toIsoString(value) {
        if (!value) {
            return new Date().toISOString();
        }
        const date = value instanceof Date ? value : new Date(String(value));
        return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    }
};
exports.ChangeStreamWatchersService = ChangeStreamWatchersService;
exports.ChangeStreamWatchersService = ChangeStreamWatchersService = ChangeStreamWatchersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [realtime_gateway_1.RealtimeGateway,
        dashboards_service_1.DashboardsService])
], ChangeStreamWatchersService);
//# sourceMappingURL=change-stream-watchers.service.js.map