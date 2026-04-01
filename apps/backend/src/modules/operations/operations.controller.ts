import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Permissions } from '../auth/permissions.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { OperationsService } from './operations.service';

@ApiTags('operations')
@Controller('operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('fleet-summary')
  @Permissions('trips:view', 'tracking:management:view', 'maintenance:view')
  async fleetSummary(@CurrentUser() user: AuthenticatedUser, @Query('branch') branch?: string) {
    return this.operationsService.getFleetSummary(user, branch);
  }

  @Get('available-vehicles')
  @Permissions('trips:view', 'tracking:management:view', 'maintenance:view')
  async availableVehicles(@CurrentUser() user: AuthenticatedUser, @Query('branch') branch?: string) {
    return this.operationsService.getAvailableVehicles(user, branch);
  }

  @Get('unavailable-vehicles')
  @Permissions('trips:view', 'tracking:management:view', 'maintenance:view')
  async unavailableVehicles(@CurrentUser() user: AuthenticatedUser, @Query('branch') branch?: string) {
    return this.operationsService.getUnavailableVehicles(user, branch);
  }

  @Get('fuel-logs')
  @Permissions('trips:view', 'tracking:management:view', 'maintenance:view')
  async fuelLogs(@CurrentUser() user: AuthenticatedUser, @Query('branch') branch?: string) {
    return this.operationsService.getFuelLogs(user, branch);
  }

  @Get('maintenance-due')
  @Permissions('trips:view', 'tracking:management:view', 'maintenance:view')
  async maintenanceDue(@CurrentUser() user: AuthenticatedUser, @Query('branch') branch?: string) {
    return this.operationsService.getMaintenanceDue(user, branch);
  }

  @Get('tire-due')
  @Permissions('trips:view', 'tracking:management:view', 'maintenance:view')
  async tireDue(@CurrentUser() user: AuthenticatedUser, @Query('branch') branch?: string) {
    return this.operationsService.getTireDue(user, branch);
  }

  @Get('parts-history')
  @Permissions('trips:view', 'tracking:management:view', 'maintenance:view')
  async partsHistory(@CurrentUser() user: AuthenticatedUser, @Query('branch') branch?: string) {
    return this.operationsService.getPartsHistory(user, branch);
  }

  @Get('vehicle-status-board')
  @Permissions('trips:view', 'tracking:management:view', 'maintenance:view')
  async vehicleStatusBoard(@CurrentUser() user: AuthenticatedUser, @Query('branch') branch?: string) {
    return this.operationsService.getVehicleStatusBoard(user, branch);
  }

  @Get('active-trips')
  @Permissions('trips:view', 'tracking:management:view', 'maintenance:view')
  async activeTrips(@CurrentUser() user: AuthenticatedUser, @Query('branch') branch?: string) {
    return this.operationsService.getActiveTrips(user, branch);
  }

  @Get('rental-partners/performance')
  @Permissions('trips:view', 'tracking:management:view', 'maintenance:view')
  async rentalPartnerPerformance(@CurrentUser() user: AuthenticatedUser, @Query('branch') branch?: string) {
    return this.operationsService.getRentalPartnerPerformance(user, branch);
  }

  @Get('rental-partners/recommended')
  @Permissions('trips:view', 'tracking:management:view', 'maintenance:view')
  async recommendedRentalPartners(@CurrentUser() user: AuthenticatedUser, @Query('branch') branch?: string) {
    return this.operationsService.getRecommendedRentalPartners(user, branch);
  }

  @Post('fuel-logs')
  @Permissions('trips:view', 'tracking:management:view', 'maintenance:view')
  async createFuelLog(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.operationsService.createFuelLog(user, body);
  }

  @Post('vehicle-service-history')
  @Permissions('trips:view', 'tracking:management:view', 'maintenance:view')
  async createVehicleServiceHistory(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.operationsService.createVehicleServiceHistory(user, body);
  }

  @Post('part-replacements')
  @Permissions('trips:view', 'tracking:management:view', 'maintenance:view')
  async createPartReplacement(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.operationsService.createPartReplacement(user, body);
  }
}
