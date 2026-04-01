import { IsOptional, IsString, Matches } from 'class-validator';

export class RegisterCustomerDto {
  @IsString()
  identifier!: string; // phone or email

  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  @Matches(/^\d{4}$/)
  password!: string;

  @IsOptional()
  @IsString()
  language?: string;
}
