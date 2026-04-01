import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Permissions } from '../auth/permissions.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';

@ApiTags('maintenance-notifications')
@Controller('maintenance-notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Permissions('notifications:update', 'maintenance:view')
  create(@Body() body: Record<string, unknown>) {
    return this.notificationsService.createMaintenance(body);
  }

  @Get()
  @Permissions('notifications:view', 'maintenance:view')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.listMaintenance(user);
  }

  @Patch(':id/read')
  @Permissions('notifications:update', 'maintenance:view')
  markRead(@Param('id') id: string) {
    return this.notificationsService.markMaintenanceRead(id);
  }
}
