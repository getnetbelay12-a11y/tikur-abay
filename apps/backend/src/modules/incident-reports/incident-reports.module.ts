import { Module } from '@nestjs/common';
import { IncidentReportsController } from './incident-reports.controller';

@Module({
  controllers: [IncidentReportsController],
})
export class IncidentReportsModule {}
