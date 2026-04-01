import { Module } from '@nestjs/common';
import { CorridorModule } from '../corridor/corridor.module';
import { TripsController } from './trips.controller';

@Module({
  imports: [CorridorModule],
  controllers: [TripsController],
})
export class TripsModule {}
