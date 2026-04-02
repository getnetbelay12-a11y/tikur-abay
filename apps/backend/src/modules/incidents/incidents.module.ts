import { Module } from '@nestjs/common';
export class IncidentsService {}
@Module({ providers: [IncidentsService], exports: [IncidentsService] })
export class IncidentsModule {}

