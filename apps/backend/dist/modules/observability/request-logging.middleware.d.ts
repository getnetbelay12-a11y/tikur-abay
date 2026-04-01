import { NestMiddleware } from '@nestjs/common';
export declare class RequestLoggingMiddleware implements NestMiddleware {
    private readonly logger;
    use(request: any, response: any, next: () => void): void;
}
