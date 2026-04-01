import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { Permissions } from '../auth/permissions.decorator';
import { LaunchService } from './launch.service';

@ApiTags('launch')
@Controller('launch-center')
export class LaunchController {
  constructor(private readonly launchService: LaunchService) {}

  @Get()
  @Permissions('launch:view')
  list() {
    return this.launchService.list();
  }

  @Patch(':code')
  @Permissions('launch:update')
  update(
    @Param('code') code: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { status?: 'ready' | 'scheduled' | 'in_progress' | 'watch' | 'blocked'; notes?: string },
  ) {
    return this.launchService.update(code, user, body);
  }
}
