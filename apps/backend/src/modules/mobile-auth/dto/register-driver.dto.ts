import { IsIn, IsOptional, IsString } from 'class-validator';

export class RegisterDriverDto {
  @IsString()
  identifier!: string; // phone

  @IsString()
  fullName!: string;

  @IsString()
  @IsIn(['internal_driver', 'external_driver'])
  driverType!: string;

  @IsOptional()
  @IsString()
  partnerCompanyId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  language?: string;
}
