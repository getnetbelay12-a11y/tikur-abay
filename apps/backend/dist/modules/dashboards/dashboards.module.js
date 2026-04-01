"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardsModule = void 0;
const common_1 = require("@nestjs/common");
const gps_module_1 = require("../gps/gps.module");
const hr_module_1 = require("../hr/hr.module");
const maintenance_module_1 = require("../maintenance/maintenance.module");
const ai_command_center_service_1 = require("./ai-command-center.service");
const dashboard_alias_controller_1 = require("./dashboard-alias.controller");
const dashboards_controller_1 = require("./dashboards.controller");
const dashboards_service_1 = require("./dashboards.service");
const executive_communications_service_1 = require("./executive-communications.service");
let DashboardsModule = class DashboardsModule {
};
exports.DashboardsModule = DashboardsModule;
exports.DashboardsModule = DashboardsModule = __decorate([
    (0, common_1.Module)({
        imports: [gps_module_1.GpsModule, maintenance_module_1.MaintenanceModule, hr_module_1.HrModule],
        controllers: [dashboards_controller_1.DashboardsController, dashboard_alias_controller_1.DashboardAliasController],
        providers: [dashboards_service_1.DashboardsService, ai_command_center_service_1.AiCommandCenterService, executive_communications_service_1.ExecutiveCommunicationsService],
        exports: [dashboards_service_1.DashboardsService, ai_command_center_service_1.AiCommandCenterService, executive_communications_service_1.ExecutiveCommunicationsService],
    })
], DashboardsModule);
//# sourceMappingURL=dashboards.module.js.map