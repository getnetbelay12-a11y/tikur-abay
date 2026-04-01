import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PerformanceQueryDto {
  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsIn(['driver', 'dispatcher', 'technical_manager', 'operations_manager', 'finance_officer'])
  role?: string;

  @IsOptional()
  @IsIn(['score', 'performanceScore', 'onTimeDeliveryRate', 'tripAssignmentSpeedMinutes', 'maintenanceCompletionHours', 'avgResponseMinutes'])
  sortBy?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  tripType?: string;

  @IsOptional()
  @IsIn(['djibouti', 'local'])
  routeScope?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsIn(['json', 'csv'])
  format?: 'json' | 'csv';

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  q?: string;
}
