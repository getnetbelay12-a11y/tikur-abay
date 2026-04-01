"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let GlobalExceptionFilter = class GlobalExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger('GlobalException');
    }
    catch(exception, host) {
        const context = host.switchToHttp();
        const response = context.getResponse();
        const request = context.getRequest();
        const isHttpException = exception instanceof common_1.HttpException;
        const status = isHttpException ? exception.getStatus() : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const exceptionResponse = isHttpException ? exception.getResponse() : null;
        const message = extractMessage(exceptionResponse, exception);
        const requestId = request?.headers?.['x-request-id'] || response?.getHeader?.('x-request-id') || 'unknown';
        this.logger.error(JSON.stringify({
            requestId,
            method: request?.method,
            path: request?.originalUrl,
            statusCode: status,
            message,
            ip: request?.ip,
            userAgent: request?.get?.('user-agent') || request?.headers?.['user-agent'] || 'unknown',
        }), exception instanceof Error ? exception.stack : undefined);
        response.status(status).json({
            statusCode: status,
            message,
            requestId,
            timestamp: new Date().toISOString(),
            path: request?.originalUrl,
        });
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
function extractMessage(exceptionResponse, exception) {
    if (typeof exceptionResponse === 'string') {
        return exceptionResponse;
    }
    if (exceptionResponse && typeof exceptionResponse === 'object') {
        const message = exceptionResponse.message;
        if (Array.isArray(message)) {
            return message.join(', ');
        }
        if (typeof message === 'string') {
            return message;
        }
    }
    if (exception instanceof Error) {
        return exception.message;
    }
    return 'Internal server error';
}
//# sourceMappingURL=global-exception.filter.js.map