import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../auth/permissions.decorator';
import {
  assertCanSendCommunication,
  assertCanViewCommunicationHistory,
} from './communication-access';
import { CommunicationOrchestratorService } from './communication-orchestrator.service';

@ApiTags('communications')
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly communicationOrchestratorService: CommunicationOrchestratorService) {}

  @Post('send')
  @Permissions('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view')
  async send(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    assertCanSendCommunication(user, String(body.templateKey || ''), String(body.entityType || ''));
    return this.communicationOrchestratorService.send(body as any, user);
  }

  @Post('direct-send')
  @Permissions('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view')
  async directSend(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    assertCanSendCommunication(user, String(body.templateKey || 'custom_message'), 'custom');
    return this.communicationOrchestratorService.sendDirect(body as any, user);
  }

  @Post('draft')
  @Permissions('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view')
  async saveDraft(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    assertCanSendCommunication(user, String(body.templateKey || ''), String(body.entityType || ''));
    return this.communicationOrchestratorService.saveDraft(body as any, user);
  }

  @Post('schedule')
  @Permissions('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view')
  async schedule(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    assertCanSendCommunication(user, String(body.templateKey || ''), String(body.entityType || ''));
    return this.communicationOrchestratorService.schedule(body as any, user);
  }

  @Get('history')
  @Permissions('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view')
  async history(
    @CurrentUser() user: AuthenticatedUser,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('shipmentId') shipmentId?: string,
    @Query('tripId') tripId?: string,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    assertCanViewCommunicationHistory(user, entityType);
    return this.communicationOrchestratorService.history({
      entityType,
      entityId,
      shipmentId,
      tripId,
      status,
      channel,
      page: Number(page || 1),
      pageSize: Number(pageSize || 20),
    }, user);
  }

  @Get('templates')
  @Permissions('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view')
  async templates(
    @Query('entityType') entityType?: string,
    @Query('channel') channel?: string,
    @Query('language') language?: string,
  ) {
    return this.communicationOrchestratorService.templates({ entityType, channel, language });
  }

  @Get('drafts')
  @Permissions('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view')
  async drafts(
    @CurrentUser() user: AuthenticatedUser,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('shipmentId') shipmentId?: string,
  ) {
    assertCanViewCommunicationHistory(user, entityType);
    return this.communicationOrchestratorService.listDrafts({ entityType, entityId, shipmentId });
  }

  @Get('schedules')
  @Permissions('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view')
  async schedules(
    @CurrentUser() user: AuthenticatedUser,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('status') status?: string,
  ) {
    assertCanViewCommunicationHistory(user, entityType);
    return this.communicationOrchestratorService.listSchedules({ entityType, entityId, status });
  }

  @Get('automation-rules')
  @Permissions('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view')
  async automationRules(
    @Query('entityType') entityType?: string,
    @Query('triggerType') triggerType?: string,
  ) {
    return this.communicationOrchestratorService.automationRules({ entityType, triggerType });
  }

  @Post('preview')
  @Permissions('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view')
  async preview(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    assertCanSendCommunication(user, String(body.templateKey || ''), String(body.entityType || ''));
    return this.communicationOrchestratorService.preview(body as any);
  }

  @Post(':communicationLogId/retry')
  @Permissions('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view')
  async retry(@CurrentUser() user: AuthenticatedUser, @Param('communicationLogId') communicationLogId: string) {
    return this.communicationOrchestratorService.retry(communicationLogId, user);
  }

  @Post(':communicationLogId/cancel')
  @Permissions('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view')
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param('communicationLogId') communicationLogId: string) {
    return this.communicationOrchestratorService.cancel(communicationLogId, user);
  }

  @Post('events')
  @Permissions('dashboards:executive:view', 'payments:view', 'trips:view', 'drivers:view', 'maintenance:view', 'corridor:yard:view', 'corridor:dispatch:view', 'corridor:djibouti:view', 'corridor:supplier:view', 'corridor:finance:view', 'quotes:view', 'customers:view')
  async emitEvent(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    assertCanSendCommunication(user, String(body.templateKey || body.triggerType || ''), String(body.entityType || ''));
    return this.communicationOrchestratorService.emitEvent(body as any, user);
  }
}
