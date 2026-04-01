import { Module } from '@nestjs/common';
import { DrivingSchoolController } from './driving-school.controller';
import { DrivingSchoolService } from './driving-school.service';

@Module({
  controllers: [DrivingSchoolController],
  providers: [DrivingSchoolService],
})
export class DrivingSchoolModule {}
