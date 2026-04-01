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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const performance_service_1 = require("./performance.service");
const performance_query_dto_1 = require("./dto/performance-query.dto");
let PerformanceController = class PerformanceController {
    constructor(performanceService) {
        this.performanceService = performanceService;
    }
    async employeeSummary(query, user) {
        return this.performanceService.getEmployeeSummary(query, user);
    }
    async employees(query, user) {
        const result = await this.performanceService.getEmployeePerformance(query, user);
        if (query.format === 'csv') {
            return this.performanceService.exportCsv(result.items);
        }
        return result;
    }
    async employeeById(id) {
        return this.performanceService.getEmployeeById(id);
    }
    async employeeActivity(id) {
        return this.performanceService.getEmployeeActivity(id);
    }
    async employeeCustomers(id) {
        return this.performanceService.getEmployeeCustomers(id);
    }
    async employeeLoads(id) {
        return this.performanceService.getEmployeeLoads(id);
    }
    async driverSummary(query, user) {
        return this.performanceService.getDriverSummary(query, user);
    }
    async drivers(query, user) {
        const result = await this.performanceService.getDriverPerformance(query, user);
        if (query.format === 'csv') {
            return this.performanceService.exportCsv(result.items);
        }
        return result;
    }
    async driverById(id) {
        return this.performanceService.getDriverById(id);
    }
    async driverTrips(id) {
        return this.performanceService.getDriverTrips(id);
    }
    async driverCustomers(id) {
        return this.performanceService.getDriverCustomers(id);
    }
    async driverIncidents(id) {
        return this.performanceService.getDriverIncidents(id);
    }
};
exports.PerformanceController = PerformanceController;
__decorate([
    (0, common_1.Get)('employees/summary'),
    (0, permissions_decorator_1.Permissions)('performance:view', 'dashboards:executive:view'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [performance_query_dto_1.PerformanceQueryDto, Object]),
    __metadata("design:returntype", Promise)
], PerformanceController.prototype, "employeeSummary", null);
__decorate([
    (0, common_1.Get)('employees'),
    (0, permissions_decorator_1.Permissions)('performance:view', 'dashboards:executive:view'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [performance_query_dto_1.PerformanceQueryDto, Object]),
    __metadata("design:returntype", Promise)
], PerformanceController.prototype, "employees", null);
__decorate([
    (0, common_1.Get)('employees/:id'),
    (0, permissions_decorator_1.Permissions)('performance:view', 'dashboards:executive:view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PerformanceController.prototype, "employeeById", null);
__decorate([
    (0, common_1.Get)('employees/:id/activity'),
    (0, permissions_decorator_1.Permissions)('performance:view', 'dashboards:executive:view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PerformanceController.prototype, "employeeActivity", null);
__decorate([
    (0, common_1.Get)('employees/:id/customers'),
    (0, permissions_decorator_1.Permissions)('performance:view', 'dashboards:executive:view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PerformanceController.prototype, "employeeCustomers", null);
__decorate([
    (0, common_1.Get)('employees/:id/loads'),
    (0, permissions_decorator_1.Permissions)('performance:view', 'dashboards:executive:view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PerformanceController.prototype, "employeeLoads", null);
__decorate([
    (0, common_1.Get)('drivers/summary'),
    (0, permissions_decorator_1.Permissions)('performance:view', 'dashboards:executive:view'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [performance_query_dto_1.PerformanceQueryDto, Object]),
    __metadata("design:returntype", Promise)
], PerformanceController.prototype, "driverSummary", null);
__decorate([
    (0, common_1.Get)('drivers'),
    (0, permissions_decorator_1.Permissions)('performance:view', 'dashboards:executive:view'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [performance_query_dto_1.PerformanceQueryDto, Object]),
    __metadata("design:returntype", Promise)
], PerformanceController.prototype, "drivers", null);
__decorate([
    (0, common_1.Get)('drivers/:id'),
    (0, permissions_decorator_1.Permissions)('performance:view', 'dashboards:executive:view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PerformanceController.prototype, "driverById", null);
__decorate([
    (0, common_1.Get)('drivers/:id/trips'),
    (0, permissions_decorator_1.Permissions)('performance:view', 'dashboards:executive:view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PerformanceController.prototype, "driverTrips", null);
__decorate([
    (0, common_1.Get)('drivers/:id/customers'),
    (0, permissions_decorator_1.Permissions)('performance:view', 'dashboards:executive:view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PerformanceController.prototype, "driverCustomers", null);
__decorate([
    (0, common_1.Get)('drivers/:id/incidents'),
    (0, permissions_decorator_1.Permissions)('performance:view', 'dashboards:executive:view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PerformanceController.prototype, "driverIncidents", null);
exports.PerformanceController = PerformanceController = __decorate([
    (0, swagger_1.ApiTags)('performance'),
    (0, common_1.Controller)('performance'),
    __metadata("design:paramtypes", [performance_service_1.PerformanceService])
], PerformanceController);
//# sourceMappingURL=performance.controller.js.map