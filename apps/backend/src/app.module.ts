import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { TripsModule } from './modules/trips/trips.module';
import { GpsModule } from './modules/gps/gps.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { AgreementsModule } from './modules/agreements/agreements.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ChatModule } from './modules/chat/chat.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { HrModule } from './modules/hr/hr.module';
import { DashboardsModule } from './modules/dashboards/dashboards.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { HealthController } from './modules/health.controller';
import { DriverReportsModule } from './modules/driver-reports/driver-reports.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { PermissionsGuard } from './modules/auth/permissions.guard';
import { RateLimitGuard } from './modules/auth/rate-limit.guard';
import { FinanceModule } from './modules/finance/finance.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { ActivityModule } from './modules/activity/activity.module';
import { FuelModule } from './modules/fuel/fuel.module';
import { IncidentReportsModule } from './modules/incident-reports/incident-reports.module';
import { CommercialModule } from './modules/commercial/commercial.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { RequestLoggingMiddleware } from './modules/observability/request-logging.middleware';
import { OperationsModule } from './modules/operations/operations.module';
import { DrivingSchoolModule } from './modules/driving-school/driving-school.module';
import { LaunchModule } from './modules/launch/launch.module';
import { MobileAuthModule } from './modules/mobile-auth/mobile-auth.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { CorridorModule } from './modules/corridor/corridor.module';
import { ImportSettlementModule } from './modules/import-settlement/import-settlement.module';
import { ChangeStreamWatchersService } from './modules/realtime/change-stream-watchers.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    CustomersModule,
    DriversModule,
    VehiclesModule,
    TripsModule,
    GpsModule,
    MaintenanceModule,
    AgreementsModule,
    DocumentsModule,
    ChatModule,
    PaymentsModule,
    FinanceModule,
    PreferencesModule,
    ActivityModule,
    FuelModule,
    IncidentReportsModule,
    CommercialModule,
    MobileModule,
    RealtimeModule,
    ObservabilityModule,
    OperationsModule,
    DrivingSchoolModule,
    LaunchModule,
    MobileAuthModule,
    CommunicationsModule,
    CorridorModule,
    ImportSettlementModule,
    HrModule,
    DashboardsModule,
    NotificationsModule,
    AuditLogsModule,
    DriverReportsModule,
    IncidentsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    ChangeStreamWatchersService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
