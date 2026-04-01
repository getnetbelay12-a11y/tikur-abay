import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/permissions.decorator';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceAlertQueryDto } from './dto/maintenance-alert-query.dto';

@ApiTags('maintenance')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('alerts')
  @Permissions('maintenance:view')
  async alerts() {
    return this.maintenanceService.getDashboard();
  }

  @Get('dashboard')
  @Permissions('maintenance:view')
  async dashboard() {
    return this.maintenanceService.getDashboard();
  }

  @Get('due')
  @Permissions('maintenance:view')
  async due() {
    return this.maintenanceService.getDue();
  }

  @Get('due-vehicles')
  @Permissions('maintenance:view')
  async dueVehicles(@Query() query: MaintenanceAlertQueryDto) {
    return this.maintenanceService.getDueVehicles(query);
  }

  @Get('tire-inspection-due')
  @Permissions('maintenance:view')
  async tireInspectionDue() {
    return this.maintenanceService.getTireInspectionDue();
  }

  @Get('rules')
  @Permissions('maintenance:view')
  rules() {
    return this.maintenanceService.getRules();
  }

  @Get('overdue')
  @Permissions('maintenance:view')
  async overdue() {
    return this.maintenanceService.getOverdueVehicles();
  }

  @Get('blocked')
  @Permissions('maintenance:view')
  async blocked() {
    return this.maintenanceService.getBlockedVehicles();
  }

  @Get('vehicles/:id/history')
  @Permissions('maintenance:view')
  async vehicleHistory(@Param('id') id: string) {
    return this.maintenanceService.getVehicleHistory(id);
  }

  @Get('repair-orders')
  @Permissions('maintenance:view', 'repair-orders:view')
  async repairOrders(@Query('status') status?: string) {
    return this.maintenanceService.listRepairOrders(status);
  }

  @Post('repair-orders')
  @Permissions('maintenance:view', 'repair-orders:view')
  async createRepairOrder(@Body() body: Record<string, unknown>) {
    return this.maintenanceService.createRepairOrder(body);
  }

  @Get('repair-orders/:id')
  @Permissions('maintenance:view', 'repair-orders:view')
  async repairOrder(@Param('id') id: string) {
    return this.maintenanceService.getRepairOrder(id);
  }

  @Patch('repair-orders/:id/status')
  @Permissions('maintenance:view', 'repair-orders:view')
  async updateRepairOrderStatus(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.maintenanceService.updateRepairOrderStatus(id, body);
  }

  @Post('plans')
  @Permissions('maintenance:view')
  async createPlan(@Body() body: Record<string, unknown>) {
    return this.maintenanceService.createPlan(body);
  }

  @Get('plans')
  @Permissions('maintenance:view')
  async plans() {
    return this.maintenanceService.listPlans();
  }

  @Patch('plans/:id')
  @Permissions('maintenance:view')
  async updatePlan(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.maintenanceService.updatePlan(id, body);
  }

  @Get('notifications')
  @Permissions('maintenance:view')
  async notifications() {
    return this.maintenanceService.getNotifications();
  }

  @Get('spare-parts/low-stock')
  @Permissions('maintenance:view')
  async lowStockParts() {
    return this.maintenanceService.listLowStockParts();
  }

  @Post('notifications')
  @Permissions('maintenance:view')
  async createNotification(@Body() body: Record<string, unknown>) {
    return this.maintenanceService.createNotification(body);
  }

  @Patch('notifications/:id/read')
  @Permissions('maintenance:view')
  async markNotificationRead(@Param('id') id: string) {
    return this.maintenanceService.markNotificationRead(id);
  }
}
