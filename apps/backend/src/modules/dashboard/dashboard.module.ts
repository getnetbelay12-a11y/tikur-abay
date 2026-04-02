import { Module } from '@nestjs/common';
export class DashboardService {}
@Module({ providers: [DashboardService], exports: [DashboardService] })
export class DashboardModule {}

