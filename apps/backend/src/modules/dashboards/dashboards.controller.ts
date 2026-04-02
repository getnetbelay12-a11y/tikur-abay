import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../auth/permissions.decorator';
import { DashboardsService } from './dashboards.service';
import { ExecutiveCommunicationsService } from './executive-communications.service';

@ApiTags('dashboards')
@Controller('dashboards')
export class DashboardsController {
  constructor(
    private readonly dashboardsService: DashboardsService,
    private readonly executiveCommunicationsService: ExecutiveCommunicationsService,
  ) {}

  @Get('management/executive-summary')
  @Permissions('dashboards:executive:view')
  async executiveSummary() {
    return this.dashboardsService.getExecutiveSummary();
  }

  @Get('operations/summary')
  @Permissions('trips:view')
  async operationsSummary() {
    const summary: {
      latestTrips: Array<Record<string, unknown>>;
      urgentActions: Array<{ key: string; value: number }>;
      kpis: Array<{ title: string; value: number }>;
    } = await this.dashboardsService.getExecutiveSummary() as any;
    return {
      activeTrips: summary.latestTrips.length,
      delayedTrips: summary.urgentActions.find((item) => item.key === 'delayed_trips')?.value ?? 0,
      vehiclesInDjibouti: summary.kpis.find((item) => item.title === 'Vehicles In Djibouti')?.value ?? 0,
      trips: summary.latestTrips,
    };
  }

  @Get('management/widgets')
  @Permissions('dashboards:executive:view')
  async widgets() {
    return this.dashboardsService.getManagementWidgets();
  }

  @Get('management/ai-command-center')
  @Permissions('dashboards:executive:view')
  async aiCommandCenter() {
    return this.dashboardsService.getAiCommandCenter();
  }

  @Get('management/executive-workspace')
  @Permissions('dashboards:executive:view')
  async executiveWorkspace(@Query('tab') tab?: string) {
    return this.dashboardsService.getExecutiveWorkspace(tab as any);
  }

  @Get('management/head-office-command-center')
  @Permissions('dashboards:executive:view')
  async headOfficeCommandCenter() {
    return this.dashboardsService.getHeadOfficeCommandCenter();
  }

  @Get('transport-control-tower/summary')
  @Permissions('dashboards:executive:view')
  async transportControlTowerSummary() {
    return this.dashboardsService.getTransportControlTowerSummary();
  }

  @Get('transport-control-tower/status')
  @Permissions('dashboards:executive:view')
  async transportControlTowerStatus() {
    return this.dashboardsService.getTransportControlTowerStatus();
  }

  @Get('transport-control-tower/trend')
  @Permissions('dashboards:executive:view')
  async transportControlTowerTrend() {
    return this.dashboardsService.getTransportControlTowerTrend();
  }

  @Get('transport-control-tower/performance')
  @Permissions('dashboards:executive:view')
  async transportControlTowerPerformance() {
    return this.dashboardsService.getTransportControlTowerPerformance();
  }

  @Get('transport-control-tower/alerts')
  @Permissions('dashboards:executive:view')
  async transportControlTowerAlerts() {
    return this.dashboardsService.getTransportControlTowerAlerts();
  }

  @Get('communications/history')
  @Permissions('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view')
  async communicationHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.executiveCommunicationsService.getHistory(entityType, entityId, user);
  }

  @Post('communications/send')
  @Permissions('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view')
  async sendCommunication(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.executiveCommunicationsService.sendCommunication(body as any, user);
  }
}
