import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './public.decorator';
import { RateLimit } from './rate-limit.decorator';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './auth.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'superadmin@tikurabay.com' },
        password: { type: 'string', example: 'ChangeMe123!' },
      },
      required: ['email', 'password'],
    },
  })
  @RateLimit({ windowMs: 60_000, max: 10, scope: 'auth:login' })
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('refresh-token')
  @Public()
  @RateLimit({ windowMs: 5 * 60_000, max: 30, scope: 'auth:refresh' })
  refresh(@Body() body: { refreshToken?: string }) {
    return this.authService.refreshToken(body.refreshToken || '');
  }

  @Post('logout')
  @Public()
  @RateLimit({ windowMs: 5 * 60_000, max: 40, scope: 'auth:logout' })
  logout(@Body() body: { refreshToken?: string }) {
    return this.authService.logout(body.refreshToken || '');
  }

  @Post('register')
  @Public()
  @RateLimit({ windowMs: 15 * 60_000, max: 10, scope: 'auth:register' })
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      ...user,
      dashboardRoute: this.authService.dashboardRouteForRole(user.role),
    };
  }
}
