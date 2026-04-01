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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const rate_limit_decorator_1 = require("./rate-limit.decorator");
let RateLimitGuard = class RateLimitGuard {
    constructor(reflector) {
        this.reflector = reflector;
        this.counters = new Map();
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const config = this.reflector.getAllAndOverride(rate_limit_decorator_1.RATE_LIMIT_KEY, [
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
            throw new common_1.HttpException('Too many requests. Please try again shortly.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        current.count += 1;
        this.counters.set(key, current);
        this.setHeaders(response, config, current.count, current.resetAt);
        this.cleanup(now);
        return true;
    }
    resolveDefaultConfig(originalUrl) {
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
    resolveClientId(request) {
        const forwarded = request.headers?.['x-forwarded-for'];
        const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        return (forwardedValue?.split(',')[0]?.trim() || request.ip || 'unknown-client').toLowerCase();
    }
    setHeaders(response, config, count, resetAt) {
        response.setHeader('X-RateLimit-Limit', config.max);
        response.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - count));
        response.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));
    }
    cleanup(now) {
        for (const [key, value] of this.counters.entries()) {
            if (value.resetAt <= now) {
                this.counters.delete(key);
            }
        }
    }
};
exports.RateLimitGuard = RateLimitGuard;
exports.RateLimitGuard = RateLimitGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RateLimitGuard);
//# sourceMappingURL=rate-limit.guard.js.map