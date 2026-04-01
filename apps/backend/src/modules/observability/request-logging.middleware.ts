import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HttpRequest');

  use(request: any, response: any, next: () => void) {
    const startedAt = process.hrtime.bigint();
    const requestId = request.headers['x-request-id'] || randomUUID();

    response.setHeader('x-request-id', String(requestId));

    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const logPayload = {
        requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        ip: request.ip,
        userAgent: request.get('user-agent') || 'unknown',
      };

      this.logger.log(JSON.stringify(logPayload));
    });

    next();
  }
}
