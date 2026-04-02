import { Module } from '@nestjs/common';
export class DocumentsService {}
@Module({ providers: [DocumentsService], exports: [DocumentsService] })
export class DocumentsModule {}

