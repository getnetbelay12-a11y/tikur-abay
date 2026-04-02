import { Module } from '@nestjs/common';
export class TrackingService {}
@Module({ providers: [TrackingService], exports: [TrackingService] })
export class TrackingModule {}

