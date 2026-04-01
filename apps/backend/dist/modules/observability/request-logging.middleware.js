"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestLoggingMiddleware = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
let RequestLoggingMiddleware = class RequestLoggingMiddleware {
    constructor() {
        this.logger = new common_1.Logger('HttpRequest');
    }
    use(request, response, next) {
        const startedAt = process.hrtime.bigint();
        const requestId = request.headers['x-request-id'] || (0, node_crypto_1.randomUUID)();
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
};
exports.RequestLoggingMiddleware = RequestLoggingMiddleware;
exports.RequestLoggingMiddleware = RequestLoggingMiddleware = __decorate([
    (0, common_1.Injectable)()
], RequestLoggingMiddleware);
//# sourceMappingURL=request-logging.middleware.js.map