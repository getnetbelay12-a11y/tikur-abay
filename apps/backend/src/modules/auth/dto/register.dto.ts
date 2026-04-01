import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  fullName!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(['customer', 'driver'])
  role!: 'customer' | 'driver';

  @IsOptional()
  @IsIn(['customer', 'internal_driver', 'external_driver'])
  mobileRole?: 'customer' | 'internal_driver' | 'external_driver';

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  tradeLicense?: string;

  @IsOptional()
  @IsString()
  tin?: string;

  @IsOptional()
  @IsString()
  vat?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  faydaFrontDocumentId?: string;

  @IsOptional()
  @IsString()
  faydaBackDocumentId?: string;

  @IsOptional()
  @IsString()
  selfieDocumentId?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  partnerCompany?: string;

  @IsOptional()
  @IsString()
  partnerVehicleCode?: string;
}
