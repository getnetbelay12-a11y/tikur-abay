import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Permissions } from '../auth/permissions.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class AppNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Permissions('notifications:view')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.listApp(user);
  }

  @Patch(':id/read')
  @Permissions('notifications:update')
  read(@Param('id') id: string) {
    return this.notificationsService.readApp(id);
  }

  @Patch('read-all')
  @Permissions('notifications:update')
  readAll(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.readAllApp(user);
  }

  @Get('unread-count')
  @Permissions('notifications:view')
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.unreadCount(user);
  }
}
