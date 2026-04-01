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
exports.ObservabilityController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const observability_service_1 = require("./observability.service");
let ObservabilityController = class ObservabilityController {
    constructor(observabilityService) {
        this.observabilityService = observabilityService;
    }
    async getSummary() {
        return this.observabilityService.getSummary();
    }
    async getPrometheusText() {
        return this.observabilityService.getPrometheusText();
    }
};
exports.ObservabilityController = ObservabilityController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    (0, swagger_1.ApiOperation)({ summary: 'Get operational metrics summary for the local production stack' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ObservabilityController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('prometheus'),
    (0, permissions_decorator_1.Permissions)('dashboards:executive:view'),
    (0, common_1.Header)('Content-Type', 'text/plain; version=0.0.4'),
    (0, swagger_1.ApiOperation)({ summary: 'Get operational metrics in Prometheus text format' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ObservabilityController.prototype, "getPrometheusText", null);
exports.ObservabilityController = ObservabilityController = __decorate([
    (0, swagger_1.ApiTags)('observability'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('metrics'),
    __metadata("design:paramtypes", [observability_service_1.ObservabilityService])
], ObservabilityController);
//# sourceMappingURL=observability.controller.js.map