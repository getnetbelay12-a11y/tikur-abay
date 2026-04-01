import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Permissions } from '../auth/permissions.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { PerformanceService } from './performance.service';
import { PerformanceQueryDto } from './dto/performance-query.dto';

@ApiTags('performance')
@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get('employees/summary')
  @Permissions('performance:view', 'dashboards:executive:view')
  async employeeSummary(@Query() query: PerformanceQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.performanceService.getEmployeeSummary(query, user);
  }

  @Get('employees')
  @Permissions('performance:view', 'dashboards:executive:view')
  async employees(@Query() query: PerformanceQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.performanceService.getEmployeePerformance(query, user);
    if (query.format === 'csv') {
      return this.performanceService.exportCsv(result.items);
    }
    return result;
  }

  @Get('employees/:id')
  @Permissions('performance:view', 'dashboards:executive:view')
  async employeeById(@Param('id') id: string) {
    return this.performanceService.getEmployeeById(id);
  }

  @Get('employees/:id/activity')
  @Permissions('performance:view', 'dashboards:executive:view')
  async employeeActivity(@Param('id') id: string) {
    return this.performanceService.getEmployeeActivity(id);
  }

  @Get('employees/:id/customers')
  @Permissions('performance:view', 'dashboards:executive:view')
  async employeeCustomers(@Param('id') id: string) {
    return this.performanceService.getEmployeeCustomers(id);
  }

  @Get('employees/:id/loads')
  @Permissions('performance:view', 'dashboards:executive:view')
  async employeeLoads(@Param('id') id: string) {
    return this.performanceService.getEmployeeLoads(id);
  }

  @Get('drivers/summary')
  @Permissions('performance:view', 'dashboards:executive:view')
  async driverSummary(@Query() query: PerformanceQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.performanceService.getDriverSummary(query, user);
  }

  @Get('drivers')
  @Permissions('performance:view', 'dashboards:executive:view')
  async drivers(@Query() query: PerformanceQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.performanceService.getDriverPerformance(query, user);
    if (query.format === 'csv') {
      return this.performanceService.exportCsv(result.items);
    }
    return result;
  }

  @Get('drivers/:id')
  @Permissions('performance:view', 'dashboards:executive:view')
  async driverById(@Param('id') id: string) {
    return this.performanceService.getDriverById(id);
  }

  @Get('drivers/:id/trips')
  @Permissions('performance:view', 'dashboards:executive:view')
  async driverTrips(@Param('id') id: string) {
    return this.performanceService.getDriverTrips(id);
  }

  @Get('drivers/:id/customers')
  @Permissions('performance:view', 'dashboards:executive:view')
  async driverCustomers(@Param('id') id: string) {
    return this.performanceService.getDriverCustomers(id);
  }

  @Get('drivers/:id/incidents')
  @Permissions('performance:view', 'dashboards:executive:view')
  async driverIncidents(@Param('id') id: string) {
    return this.performanceService.getDriverIncidents(id);
  }
}
