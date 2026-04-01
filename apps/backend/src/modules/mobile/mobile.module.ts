import { Module } from '@nestjs/common';
import { CommunicationsModule } from '../communications/communications.module';
import { MobileController } from './mobile.controller';

@Module({
  imports: [CommunicationsModule],
  controllers: [MobileController],
})
export class MobileModule {}
