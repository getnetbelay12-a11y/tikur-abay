import { IsIn, IsOptional, IsString } from 'class-validator';

export class SendOtpDto {
  @IsString()
  identifier!: string; // phone or email

  @IsString()
  @IsIn(['customer', 'internal_driver', 'external_driver', 'driver'])
  role!: string;

  @IsOptional()
  @IsString()
  language?: string;
}
