import { Module } from '@nestjs/common';
export class ComplianceService {}
@Module({ providers: [ComplianceService], exports: [ComplianceService] })
export class ComplianceModule {}

