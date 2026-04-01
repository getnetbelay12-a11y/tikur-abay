import { IsString, Matches } from 'class-validator';

export class LoginCustomerDto {
  @IsString()
  identifier!: string;

  @IsString()
  @Matches(/^\d{4}$/)
  password!: string;
}
