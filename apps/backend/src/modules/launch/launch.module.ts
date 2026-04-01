import { Module } from '@nestjs/common';
import { LaunchController } from './launch.controller';
import { LaunchService } from './launch.service';

@Module({
  controllers: [LaunchController],
  providers: [LaunchService],
})
export class LaunchModule {}
