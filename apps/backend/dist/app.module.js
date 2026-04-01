"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const customers_module_1 = require("./modules/customers/customers.module");
const drivers_module_1 = require("./modules/drivers/drivers.module");
const vehicles_module_1 = require("./modules/vehicles/vehicles.module");
const trips_module_1 = require("./modules/trips/trips.module");
const gps_module_1 = require("./modules/gps/gps.module");
const maintenance_module_1 = require("./modules/maintenance/maintenance.module");
const agreements_module_1 = require("./modules/agreements/agreements.module");
const documents_module_1 = require("./modules/documents/documents.module");
const chat_module_1 = require("./modules/chat/chat.module");
const payments_module_1 = require("./modules/payments/payments.module");
const hr_module_1 = require("./modules/hr/hr.module");
const dashboards_module_1 = require("./modules/dashboards/dashboards.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const audit_logs_module_1 = require("./modules/audit-logs/audit-logs.module");
const health_controller_1 = require("./modules/health.controller");
const driver_reports_module_1 = require("./modules/driver-reports/driver-reports.module");
const jwt_auth_guard_1 = require("./modules/auth/jwt-auth.guard");
const permissions_guard_1 = require("./modules/auth/permissions.guard");
const rate_limit_guard_1 = require("./modules/auth/rate-limit.guard");
const finance_module_1 = require("./modules/finance/finance.module");
const incidents_module_1 = require("./modules/incidents/incidents.module");
const preferences_module_1 = require("./modules/preferences/preferences.module");
const activity_module_1 = require("./modules/activity/activity.module");
const fuel_module_1 = require("./modules/fuel/fuel.module");
const incident_reports_module_1 = require("./modules/incident-reports/incident-reports.module");
const commercial_module_1 = require("./modules/commercial/commercial.module");
const mobile_module_1 = require("./modules/mobile/mobile.module");
const realtime_module_1 = require("./modules/realtime/realtime.module");
const observability_module_1 = require("./modules/observability/observability.module");
const request_logging_middleware_1 = require("./modules/observability/request-logging.middleware");
const operations_module_1 = require("./modules/operations/operations.module");
const driving_school_module_1 = require("./modules/driving-school/driving-school.module");
const launch_module_1 = require("./modules/launch/launch.module");
const mobile_auth_module_1 = require("./modules/mobile-auth/mobile-auth.module");
const communications_module_1 = require("./modules/communications/communications.module");
const corridor_module_1 = require("./modules/corridor/corridor.module");
const import_settlement_module_1 = require("./modules/import-settlement/import-settlement.module");
const change_stream_watchers_service_1 = require("./modules/realtime/change-stream-watchers.service");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(request_logging_middleware_1.RequestLoggingMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            customers_module_1.CustomersModule,
            drivers_module_1.DriversModule,
            vehicles_module_1.VehiclesModule,
            trips_module_1.TripsModule,
            gps_module_1.GpsModule,
            maintenance_module_1.MaintenanceModule,
            agreements_module_1.AgreementsModule,
            documents_module_1.DocumentsModule,
            chat_module_1.ChatModule,
            payments_module_1.PaymentsModule,
            finance_module_1.FinanceModule,
            preferences_module_1.PreferencesModule,
            activity_module_1.ActivityModule,
            fuel_module_1.FuelModule,
            incident_reports_module_1.IncidentReportsModule,
            commercial_module_1.CommercialModule,
            mobile_module_1.MobileModule,
            realtime_module_1.RealtimeModule,
            observability_module_1.ObservabilityModule,
            operations_module_1.OperationsModule,
            driving_school_module_1.DrivingSchoolModule,
            launch_module_1.LaunchModule,
            mobile_auth_module_1.MobileAuthModule,
            communications_module_1.CommunicationsModule,
            corridor_module_1.CorridorModule,
            import_settlement_module_1.ImportSettlementModule,
            hr_module_1.HrModule,
            dashboards_module_1.DashboardsModule,
            notifications_module_1.NotificationsModule,
            audit_logs_module_1.AuditLogsModule,
            driver_reports_module_1.DriverReportsModule,
            incidents_module_1.IncidentsModule,
        ],
        controllers: [health_controller_1.HealthController],
        providers: [
            { provide: core_1.APP_GUARD, useClass: rate_limit_guard_1.RateLimitGuard },
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: permissions_guard_1.PermissionsGuard },
            change_stream_watchers_service_1.ChangeStreamWatchersService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map