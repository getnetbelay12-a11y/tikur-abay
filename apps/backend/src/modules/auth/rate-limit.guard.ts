import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, RouteRateLimit } from './rate-limit.decorator';

type CounterState = {
  count: number;
  resetAt: number;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly counters = new Map<string, CounterState>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      ip?: string;
      originalUrl?: string;
      method?: string;
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const response = context.switchToHttp().getResponse<{
      setHeader: (name: string, value: string | number) => void;
    }>();

    const config =
      this.reflector.getAllAndOverride<RouteRateLimit | undefined>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || this.resolveDefaultConfig(request.originalUrl || '');

    if (!config) {
      return true;
    }

    const now = Date.now();
    const clientId = this.resolveClientId(request);
    const scope = config.scope || `${request.method || 'GET'}:${request.originalUrl || 'unknown'}`;
    const key = `${scope}:${clientId}`;
    const current = this.counters.get(key);

    if (!current || current.resetAt <= now) {
      this.counters.set(key, { count: 1, resetAt: now + config.windowMs });
      this.setHeaders(response, config, 1, now + config.windowMs);
      this.cleanup(now);
      return true;
    }

    if (current.count >= config.max) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      response.setHeader('Retry-After', retryAfter);
      this.setHeaders(response, config, current.count, current.resetAt);
      throw new HttpException('Too many requests. Please try again shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }

    current.count += 1;
    this.counters.set(key, current);
    this.setHeaders(response, config, current.count, current.resetAt);
    this.cleanup(now);
    return true;
  }

  private resolveDefaultConfig(originalUrl: string): RouteRateLimit | undefined {
    if (originalUrl.includes('/api/v1/health')) {
      return undefined;
    }
    if (originalUrl.includes('/api/v1/auth/login')) {
      return { windowMs: 60_000, max: 10, scope: 'auth:login' };
    }
    if (originalUrl.includes('/api/v1/auth/register')) {
      return { windowMs: 15 * 60_000, max: 10, scope: 'auth:register' };
    }
    if (originalUrl.includes('/api/v1/auth/refresh-token')) {
      return { windowMs: 5 * 60_000, max: 30, scope: 'auth:refresh' };
    }
    if (originalUrl.includes('/api/v1/documents/') && originalUrl.includes('/download/')) {
      return { windowMs: 5 * 60_000, max: 60, scope: 'documents:download' };
    }
    return undefined;
  }

  private resolveClientId(request: { ip?: string; headers?: Record<string, string | string[] | undefined> }) {
    const forwarded = request.headers?.['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return (forwardedValue?.split(',')[0]?.trim() || request.ip || 'unknown-client').toLowerCase();
  }

  private setHeaders(
    response: { setHeader: (name: string, value: string | number) => void },
    config: RouteRateLimit,
    count: number,
    resetAt: number,
  ) {
    response.setHeader('X-RateLimit-Limit', config.max);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - count));
    response.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));
  }

  private cleanup(now: number) {
    for (const [key, value] of this.counters.entries()) {
      if (value.resetAt <= now) {
        this.counters.delete(key);
      }
    }
  }
}
