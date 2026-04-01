import { IsBooleanString, IsIn, IsOptional, IsString } from 'class-validator';

export class MaintenanceAlertQueryDto {
  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsIn(['tire_inspection', 'full_service', 'oil_service', 'brake_service', 'battery_check'])
  maintenanceType?: string;

  @IsOptional()
  @IsBooleanString()
  overdueOnly?: string;

  @IsOptional()
  @IsBooleanString()
  blockedOnly?: string;
}
