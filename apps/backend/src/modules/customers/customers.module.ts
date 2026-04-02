import { Module } from '@nestjs/common';
export class CustomersService {}
@Module({ providers: [CustomersService], exports: [CustomersService] })
export class CustomersModule {}

