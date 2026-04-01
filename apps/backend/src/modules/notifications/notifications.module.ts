import { Module } from '@nestjs/common';
import { AppNotificationsController } from './app-notifications.controller';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationJobsService } from './notification-jobs.service';

@Module({
  controllers: [NotificationsController, AppNotificationsController],
  providers: [NotificationsService, NotificationJobsService],
  exports: [NotificationJobsService, NotificationsService],
})
export class NotificationsModule {}
