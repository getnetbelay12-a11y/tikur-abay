import { Module } from '@nestjs/common';
import { ImportSettlementController } from './import-settlement.controller';
import { ImportSettlementService } from './import-settlement.service';

@Module({
  controllers: [ImportSettlementController],
  providers: [ImportSettlementService],
})
export class ImportSettlementModule {}
