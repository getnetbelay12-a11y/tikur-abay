import { OnModuleDestroy } from '@nestjs/common';
type NotificationJobPayload = {
    kind: 'maintenance';
    id: string;
} | {
    kind: 'outbound';
    id: string;
} | {
    kind: 'app';
    id: string;
};
export declare class NotificationJobsService implements OnModuleDestroy {
    private readonly logger;
    private readonly redisUrl;
    private queue;
    private worker;
    private ready;
    private ensureInitialized;
    enqueue(job: NotificationJobPayload): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private processJob;
    private processPayload;
    private parseRedisConnection;
}
export {};
