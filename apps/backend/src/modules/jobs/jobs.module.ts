import { Module } from '@nestjs/common';
export class JobsService {}
@Module({ providers: [JobsService], exports: [JobsService] })
export class JobsModule {}

