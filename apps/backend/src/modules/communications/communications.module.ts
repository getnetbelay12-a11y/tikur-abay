import { Module } from '@nestjs/common';
import { CommunicationsController } from './communications.controller';
import { CommunicationOrchestratorService } from './communication-orchestrator.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { TelegramService } from './telegram.service';
import { InAppNotificationService } from './in-app-notification.service';

@Module({
  controllers: [CommunicationsController],
  providers: [
    CommunicationOrchestratorService,
    EmailService,
    SmsService,
    TelegramService,
    InAppNotificationService,
  ],
  exports: [CommunicationOrchestratorService],
})
export class CommunicationsModule {}
