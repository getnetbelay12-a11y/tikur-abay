import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from './current-user.decorator';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './auth.types';

@ApiTags('me')
@Controller('me')
export class MeController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      ...user,
      dashboardRoute: this.authService.dashboardRouteForRole(user.role),
    };
  }
}
