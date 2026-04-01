import { Module } from '@nestjs/common';
import { CommunicationsModule } from '../communications/communications.module';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [CommunicationsModule],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
