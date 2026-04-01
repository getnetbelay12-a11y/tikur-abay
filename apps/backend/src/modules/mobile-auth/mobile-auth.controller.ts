import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { MobileAuthService } from './mobile-auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { LoginDriverDto } from './dto/login-driver.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';

@Public()
@Controller('mobile-auth')
export class MobileAuthController {
  constructor(private readonly mobileAuthService: MobileAuthService) {}

  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.mobileAuthService.sendOtp(dto);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.mobileAuthService.verifyOtp(dto);
  }

  @Post('register-customer')
  registerCustomer(@Body() dto: RegisterCustomerDto) {
    return this.mobileAuthService.registerCustomer(dto);
  }

  @Post('login-customer')
  loginCustomer(@Body() dto: LoginCustomerDto) {
    return this.mobileAuthService.loginCustomer(dto);
  }

  @Post('register-driver')
  registerDriver(@Body() dto: RegisterDriverDto) {
    return this.mobileAuthService.registerDriver(dto);
  }

  @Post('login-driver')
  loginDriver(@Body() dto: LoginDriverDto) {
    return this.mobileAuthService.loginDriver(dto);
  }
}
