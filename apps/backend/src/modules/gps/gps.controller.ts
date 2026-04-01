import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Permissions } from '../auth/permissions.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { GpsService } from './gps.service';
import { LiveFleetQueryDto } from './dto/live-fleet-query.dto';

@ApiTags('tracking')
@Controller('tracking')
export class GpsController {
  constructor(private readonly gpsService: GpsService) {}

  @Get('live-map')
  @Permissions('tracking:management:view')
  async liveMap(@Query() query: LiveFleetQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const scopedQuery = {
      ...query,
      branch: user.permissions.includes('*') || ['super_admin', 'executive'].includes(user.role) ? query.branch : user.branch,
    };
    return this.gpsService.getMapWidgetData({
      ...scopedQuery,
    });
  }

  @Get('vehicles/:vehicleId/live')
  @Permissions('tracking:management:view')
  async vehicleLive(@Param('vehicleId') vehicleId: string) {
    return this.gpsService.getVehicleLive(vehicleId);
  }

  @Get('trips/:tripId/history')
  @Permissions('tracking:management:view')
  async tripHistory(@Param('tripId') tripId: string) {
    return this.gpsService.getTripHistory(tripId);
  }

  @Get('vehicles/offline')
  @Permissions('tracking:management:view')
  async offlineVehicles(@Query('minutes') minutes?: string) {
    return this.gpsService.getOfflineVehicles(minutes ? Number(minutes) : 20);
  }

  @Post('gps-points')
  @Permissions('trips:update-status', 'tracking:management:view')
  async createGpsPoint(
    @Body()
    body: {
      vehicleId?: string;
      tripId?: string;
      latitude?: number;
      longitude?: number;
      speed?: number;
      heading?: number;
      accuracy?: number;
      source?: string;
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.gpsService.recordGpsPoint(body, user);
  }
}
