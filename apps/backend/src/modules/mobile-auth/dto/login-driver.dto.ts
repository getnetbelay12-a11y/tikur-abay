import { IsString, Matches } from 'class-validator';

export class LoginDriverDto {
  @IsString()
  identifier!: string;

  @IsString()
  @Matches(/^\d{4}$/)
  password!: string;
}
