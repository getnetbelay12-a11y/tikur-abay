import { Module } from '@nestjs/common';
export class NotificationsService {}
@Module({ providers: [NotificationsService], exports: [NotificationsService] })
export class NotificationsModule {}

