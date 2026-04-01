import { Module } from '@nestjs/common';
import { DriverReportsController } from './driver-reports.controller';

@Module({
  controllers: [DriverReportsController],
})
export class DriverReportsModule {}
