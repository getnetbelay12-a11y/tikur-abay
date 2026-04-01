import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../auth/permissions.decorator';
import { DashboardsService } from './dashboards.service';
import { ExecutiveCommunicationsService } from './executive-communications.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardAliasController {
  constructor(
    private readonly dashboardsService: DashboardsService,
    private readonly executiveCommunicationsService: ExecutiveCommunicationsService,
  ) {}

  @Get('executive-summary')
  @Permissions('dashboards:executive:view')
  async executiveSummary() {
    return this.dashboardsService.getExecutiveSummary();
  }

  @Get('executive/activity-feed')
  @Permissions('dashboards:executive:view')
  async activityFeed() {
    return this.dashboardsService.getExecutiveActivityFeed();
  }

  @Get('executive/incidents')
  @Permissions('dashboards:executive:view')
  async incidents() {
    return this.dashboardsService.getExecutiveIncidents();
  }

  @Get('executive/fuel-summary')
  @Permissions('dashboards:executive:view')
  async fuelSummary() {
    return this.dashboardsService.getExecutiveFuelSummary();
  }

  @Get('executive/document-summary')
  @Permissions('dashboards:executive:view')
  async documentSummary() {
    return this.dashboardsService.getExecutiveDocumentSummary();
  }

  @Get('executive/agreement-summary')
  @Permissions('dashboards:executive:view')
  async agreementSummary() {
    return this.dashboardsService.getExecutiveAgreementSummary();
  }

  @Get('executive/collection-escalations')
  @Permissions('dashboards:executive:view')
  async collectionEscalations() {
    return this.dashboardsService.getExecutiveCollectionEscalations();
  }

  @Get('ai-command-center')
  @Permissions('dashboards:executive:view')
  async aiCommandCenter() {
    return this.dashboardsService.getAiCommandCenter();
  }

  @Get('executive-workspace')
  @Permissions('dashboards:executive:view')
  async executiveWorkspace(@Query('tab') tab?: string) {
    return this.dashboardsService.getExecutiveWorkspace(tab as any);
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
