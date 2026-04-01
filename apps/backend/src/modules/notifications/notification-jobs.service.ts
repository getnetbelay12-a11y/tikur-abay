import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import { connectToDatabase } from '../../database/mongo';
import { MaintenanceNotificationModel, OutboundNotificationModel } from '../../database/models';

type NotificationJobPayload =
  | { kind: 'maintenance'; id: string }
  | { kind: 'outbound'; id: string }
  | { kind: 'app'; id: string };

@Injectable()
export class NotificationJobsService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationJobsService.name);
  private readonly redisUrl = process.env.REDIS_URL;
  private queue: Queue | null = null;
  private worker: Worker<NotificationJobPayload> | null = null;
  private ready = false;

  private ensureInitialized() {
    if (this.ready || !this.redisUrl) {
      return;
    }

    const connection = this.parseRedisConnection(this.redisUrl);
    this.queue = new Queue('notification-delivery', {
      connection,
    });
    this.worker = new Worker<NotificationJobPayload>(
      'notification-delivery',
      async (job) => this.processJob(job),
      {
        connection,
      },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.error(`Notification job failed ${job?.id || 'unknown-job'}: ${error.message}`);
    });
    this.ready = true;
  }

  async enqueue(job: NotificationJobPayload) {
    if (!this.redisUrl) {
      await this.processPayload(job);
      return;
    }

    try {
      this.ensureInitialized();
      await this.queue!.add(job.kind, job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 500,
        removeOnFail: 500,
      });
    } catch (error) {
      this.logger.warn(`Redis queue unavailable, processing notification inline: ${(error as Error).message}`);
      await this.processPayload(job);
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  private async processJob(job: Job<NotificationJobPayload>) {
    await this.processPayload(job.data);
  }

  private async processPayload(job: NotificationJobPayload) {
    await connectToDatabase();

    if (job.kind === 'maintenance') {
      await MaintenanceNotificationModel.findByIdAndUpdate(job.id, {
        $set: { status: 'sent', sentAt: new Date(), updatedAt: new Date() },
      });
      return;
    }

    if (job.kind === 'outbound') {
      await OutboundNotificationModel.findByIdAndUpdate(job.id, {
        $set: { status: 'sent', sentAt: new Date(), updatedAt: new Date() },
      });
    }
  }

  private parseRedisConnection(redisUrl: string) {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: parsed.pathname ? Number(parsed.pathname.replace('/', '') || 0) : 0,
      maxRetriesPerRequest: null as null,
      enableReadyCheck: false,
    };
  }
}
