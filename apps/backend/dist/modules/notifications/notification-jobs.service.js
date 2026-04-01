"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var NotificationJobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationJobsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
let NotificationJobsService = NotificationJobsService_1 = class NotificationJobsService {
    constructor() {
        this.logger = new common_1.Logger(NotificationJobsService_1.name);
        this.redisUrl = process.env.REDIS_URL;
        this.queue = null;
        this.worker = null;
        this.ready = false;
    }
    ensureInitialized() {
        if (this.ready || !this.redisUrl) {
            return;
        }
        const connection = this.parseRedisConnection(this.redisUrl);
        this.queue = new bullmq_1.Queue('notification-delivery', {
            connection,
        });
        this.worker = new bullmq_1.Worker('notification-delivery', async (job) => this.processJob(job), {
            connection,
        });
        this.worker.on('failed', (job, error) => {
            this.logger.error(`Notification job failed ${job?.id || 'unknown-job'}: ${error.message}`);
        });
        this.ready = true;
    }
    async enqueue(job) {
        if (!this.redisUrl) {
            await this.processPayload(job);
            return;
        }
        try {
            this.ensureInitialized();
            await this.queue.add(job.kind, job, {
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnComplete: 500,
                removeOnFail: 500,
            });
        }
        catch (error) {
            this.logger.warn(`Redis queue unavailable, processing notification inline: ${error.message}`);
            await this.processPayload(job);
        }
    }
    async onModuleDestroy() {
        await this.worker?.close();
        await this.queue?.close();
    }
    async processJob(job) {
        await this.processPayload(job.data);
    }
    async processPayload(job) {
        await (0, mongo_1.connectToDatabase)();
        if (job.kind === 'maintenance') {
            await models_1.MaintenanceNotificationModel.findByIdAndUpdate(job.id, {
                $set: { status: 'sent', sentAt: new Date(), updatedAt: new Date() },
            });
            return;
        }
        if (job.kind === 'outbound') {
            await models_1.OutboundNotificationModel.findByIdAndUpdate(job.id, {
                $set: { status: 'sent', sentAt: new Date(), updatedAt: new Date() },
            });
        }
    }
    parseRedisConnection(redisUrl) {
        const parsed = new URL(redisUrl);
        return {
            host: parsed.hostname,
            port: Number(parsed.port || 6379),
            username: parsed.username || undefined,
            password: parsed.password || undefined,
            db: parsed.pathname ? Number(parsed.pathname.replace('/', '') || 0) : 0,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        };
    }
};
exports.NotificationJobsService = NotificationJobsService;
exports.NotificationJobsService = NotificationJobsService = NotificationJobsService_1 = __decorate([
    (0, common_1.Injectable)()
], NotificationJobsService);
//# sourceMappingURL=notification-jobs.service.js.map