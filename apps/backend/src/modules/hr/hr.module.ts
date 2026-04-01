import { Module } from '@nestjs/common';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { HrOperationsController } from './hr-operations.controller';

@Module({
  controllers: [PerformanceController, HrOperationsController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class HrModule {}
