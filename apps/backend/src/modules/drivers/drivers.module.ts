import { Module } from '@nestjs/common';
export class DriversService {}
@Module({ providers: [DriversService], exports: [DriversService] })
export class DriversModule {}

