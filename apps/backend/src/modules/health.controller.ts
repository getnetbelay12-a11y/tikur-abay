import { Controller, Get } from '@nestjs/common';
import { databaseHealth } from '../database/mongo';
import { Public } from './auth/public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  health() {
    return {
      status: 'ok',
      service: 'tikur-abay-backend',
      database: databaseHealth(),
    };
  }

  @Get('live')
  @Public()
  liveness() {
    return { status: 'live' };
  }

  @Get('ready')
  @Public()
  readiness() {
    const database = databaseHealth();
    return { status: database.connected ? 'ready' : 'degraded', database };
  }
}
