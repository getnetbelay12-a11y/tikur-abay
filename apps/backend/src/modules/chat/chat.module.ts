import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { CommunicationsModule } from '../communications/communications.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule, CommunicationsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
