import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { BranchesModule } from './modules/branches/branches.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AgreementsModule } from './modules/agreements/agreements.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditModule } from './modules/audit/audit.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/tikur_abay_transport',
    ),
    BranchesModule,
    CustomersModule,
    DriversModule,
    VehiclesModule,
    JobsModule,
    ShipmentsModule,
    DocumentsModule,
    AgreementsModule,
    TrackingModule,
    IncidentsModule,
    NotificationsModule,
    DashboardModule,
    AuditModule,
    ComplianceModule,
    IntegrationsModule,
  ],
})
export class AppModule {}

