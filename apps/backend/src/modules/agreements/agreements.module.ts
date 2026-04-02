import { Module } from '@nestjs/common';
export class AgreementsService {}
@Module({ providers: [AgreementsService], exports: [AgreementsService] })
export class AgreementsModule {}

