import { Module } from '@nestjs/common';
export class AuditService {}
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}

