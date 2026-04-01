import { Module } from '@nestjs/common';
import { GpsModule } from '../gps/gps.module';
import { HrModule } from '../hr/hr.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { AiCommandCenterService } from './ai-command-center.service';
import { DashboardAliasController } from './dashboard-alias.controller';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { ExecutiveCommunicationsService } from './executive-communications.service';

@Module({
  imports: [GpsModule, MaintenanceModule, HrModule],
  controllers: [DashboardsController, DashboardAliasController],
  providers: [DashboardsService, AiCommandCenterService, ExecutiveCommunicationsService],
  exports: [DashboardsService, AiCommandCenterService, ExecutiveCommunicationsService],
})
export class DashboardsModule {}
