import { Module } from '@nestjs/common';
export class VehiclesService {}
@Module({ providers: [VehiclesService], exports: [VehiclesService] })
export class VehiclesModule {}

