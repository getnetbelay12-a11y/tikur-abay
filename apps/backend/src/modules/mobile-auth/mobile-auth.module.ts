import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MobileAuthController } from './mobile-auth.controller';
import { MobileAuthService } from './mobile-auth.service';

@Module({
  imports: [AuthModule],
  controllers: [MobileAuthController],
  providers: [MobileAuthService],
})
export class MobileAuthModule {}
