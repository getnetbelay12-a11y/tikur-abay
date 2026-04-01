import { Module } from '@nestjs/common';
import { CommunicationsModule } from '../communications/communications.module';
import { CorridorController } from './corridor.controller';
import { ShipmentsController } from './shipments.controller';
import { CorridorService } from './corridor.service';

@Module({
  imports: [CommunicationsModule],
  controllers: [CorridorController, ShipmentsController],
  providers: [CorridorService],
  exports: [CorridorService],
})
export class CorridorModule {}
