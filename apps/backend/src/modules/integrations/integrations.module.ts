import { Module } from '@nestjs/common';
export class IntegrationsService {}
@Module({ providers: [IntegrationsService], exports: [IntegrationsService] })
export class IntegrationsModule {}

