import { Module } from '@nestjs/common';
export class BranchesService {}
@Module({
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}

