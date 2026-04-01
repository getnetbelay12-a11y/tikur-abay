import { Module } from '@nestjs/common';
import { CommercialController } from './commercial.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CommercialController],
})
export class CommercialModule {}
