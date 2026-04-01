import { IsIn, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  identifier!: string;

  @IsString()
  @Length(6, 6)
  code!: string;

  @IsString()
  @IsIn(['customer', 'internal_driver', 'external_driver', 'driver'])
  role!: string;
}
