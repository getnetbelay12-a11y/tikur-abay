import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/permissions.decorator';
import { DrivingSchoolService } from './driving-school.service';

@ApiTags('driving-school')
@Controller('driving-school')
export class DrivingSchoolController {
  constructor(private readonly drivingSchoolService: DrivingSchoolService) {}

  @Get('dashboard')
  @Permissions('employees:view', 'drivers:view')
  dashboard() {
    return this.drivingSchoolService.dashboard();
  }
}
