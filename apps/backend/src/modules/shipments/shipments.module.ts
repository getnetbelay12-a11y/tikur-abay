import { Module } from '@nestjs/common';
export class ShipmentsService {}
@Module({ providers: [ShipmentsService], exports: [ShipmentsService] })
export class ShipmentsModule {}

