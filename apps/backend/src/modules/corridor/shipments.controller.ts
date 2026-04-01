import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { Public } from '../auth/public.decorator';
import { CorridorService, corridorActorFromUser } from './corridor.service';

@ApiTags('shipments')
@Public()
@Controller()
export class ShipmentsController {
  constructor(private readonly corridorService: CorridorService) {}

  @Get('shipments')
  async listShipments(@CurrentUser() user: AuthenticatedUser | undefined, @Query() query: Record<string, unknown>) {
    return this.corridorService.listShipments(corridorActorFromUser(user, query), query);
  }

  @Get('shipments/:shipmentId')
  async getShipment(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.getShipmentDetail(corridorActorFromUser(user, query), shipmentId);
  }

  @Get('shipment/:shipmentId')
  async getShipmentAlias(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.getShipmentDetail(corridorActorFromUser(user, query), shipmentId);
  }

  @Get('shipments/:shipmentId/cargo-items')
  async listCargoItems(@CurrentUser() user: AuthenticatedUser | undefined, @Param('shipmentId') shipmentId: string, @Query() query: Record<string, unknown>) {
    return this.corridorService.listCargoItems(corridorActorFromUser(user, query), shipmentId);
  }

  @Post('shipments/:shipmentId/cargo-items')
  async createCargoItem(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.createCargoItem(corridorActorFromUser(user, query), shipmentId, body);
  }

  @Patch('shipments/:shipmentId/cargo-items/:cargoItemId')
  async updateCargoItem(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Param('cargoItemId') cargoItemId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.updateCargoItem(corridorActorFromUser(user, query), shipmentId, cargoItemId, body);
  }

  @Delete('shipments/:shipmentId/cargo-items/:cargoItemId')
  async deleteCargoItem(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Param('cargoItemId') cargoItemId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.deleteCargoItem(corridorActorFromUser(user, query), shipmentId, cargoItemId);
  }

  @Get('shipments/:shipmentId/documents')
  async listDocuments(@CurrentUser() user: AuthenticatedUser | undefined, @Param('shipmentId') shipmentId: string, @Query() query: Record<string, unknown>) {
    return this.corridorService.listDocuments(corridorActorFromUser(user, query), shipmentId, query);
  }

  @Get('shipment/:shipmentId/documents')
  async listDocumentsAlias(@CurrentUser() user: AuthenticatedUser | undefined, @Param('shipmentId') shipmentId: string, @Query() query: Record<string, unknown>) {
    return this.corridorService.listDocuments(corridorActorFromUser(user, query), shipmentId, query);
  }

  @Post('shipments/:shipmentId/documents')
  async createDocument(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.createDocument(corridorActorFromUser(user, query), shipmentId, body);
  }

  @Patch('shipments/:shipmentId/documents/:shipmentDocumentId')
  async updateDocument(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Param('shipmentDocumentId') shipmentDocumentId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.updateDocument(corridorActorFromUser(user, query), shipmentId, shipmentDocumentId, body);
  }

  @Get('shipments/:shipmentId/documents/access-log')
  async documentAccessLog(@CurrentUser() user: AuthenticatedUser | undefined, @Param('shipmentId') shipmentId: string, @Query() query: Record<string, unknown>) {
    return this.corridorService.getDocumentAccessLog(corridorActorFromUser(user, query), shipmentId);
  }

  @Post('shipments/:shipmentId/documents/:shipmentDocumentId/log')
  async logDocumentAccess(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Param('shipmentDocumentId') shipmentDocumentId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.logDocumentAccess(corridorActorFromUser(user, query), shipmentId, shipmentDocumentId, body);
  }

  @Post('shipments/:shipmentId/documents/bulk-download')
  async bulkDownloadDocuments(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.bulkDownloadDocuments(corridorActorFromUser(user, query), shipmentId, body);
  }

  @Get('shipments/:shipmentId/clearance-readiness')
  async checkClearanceReadiness(@CurrentUser() user: AuthenticatedUser | undefined, @Param('shipmentId') shipmentId: string, @Query() query: Record<string, unknown>) {
    return this.corridorService.checkClearanceReadiness(corridorActorFromUser(user, query), shipmentId);
  }

  @Get('shipment/:shipmentId/tracking')
  async getTracking(@CurrentUser() user: AuthenticatedUser | undefined, @Param('shipmentId') shipmentId: string, @Query() query: Record<string, unknown>) {
    return this.corridorService.getShipmentTracking(corridorActorFromUser(user, query), shipmentId);
  }

  @Post('shipments/:shipmentId/clearance-pack/generate')
  async generateClearancePack(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.generateClearancePack(corridorActorFromUser(user, query), shipmentId, body);
  }

  @Post('shipments/:shipmentId/finance-clearance')
  async approveFinanceClearance(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.approveFinanceClearance(corridorActorFromUser(user, query), shipmentId, body);
  }

  @Post('shipments/:shipmentId/documents/:shipmentDocumentId/sign')
  async signDocument(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Param('shipmentDocumentId') shipmentDocumentId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.signDocument(corridorActorFromUser(user, query), shipmentId, shipmentDocumentId, body);
  }

  @Post('shipment/quote')
  async createQuote(@Body() body: Record<string, unknown>) {
    return this.corridorService.createQuote(body);
  }

  @Post('shipment/book')
  async createBooking(@Body() body: Record<string, unknown>) {
    return this.corridorService.createBooking(body);
  }

  @Post('document/verify')
  async verifyDocument(@Body() body: Record<string, unknown>) {
    return this.corridorService.verifyDocumentPublic(String(body.documentId || body.shipmentDocumentId || ''), body);
  }

  @Get('shipments/:shipmentId/containers')
  async listContainers(@CurrentUser() user: AuthenticatedUser | undefined, @Param('shipmentId') shipmentId: string, @Query() query: Record<string, unknown>) {
    return this.corridorService.listContainers(corridorActorFromUser(user, query), shipmentId);
  }

  @Patch('shipments/:shipmentId/containers/:containerId')
  async updateContainer(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Param('containerId') containerId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.updateContainer(corridorActorFromUser(user, query), shipmentId, containerId, body);
  }

  @Get('shipments/:shipmentId/trips')
  async listTrips(@CurrentUser() user: AuthenticatedUser | undefined, @Param('shipmentId') shipmentId: string, @Query() query: Record<string, unknown>) {
    return this.corridorService.listTrips(corridorActorFromUser(user, query), shipmentId);
  }

  @Post('shipments/:shipmentId/trips')
  async createTrip(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.createTrip(corridorActorFromUser(user, query), shipmentId, body);
  }

  @Patch('trips/:tripId')
  async updateTrip(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('tripId') tripId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.updateTrip(corridorActorFromUser(user, query), tripId, body);
  }

  @Post('corridor/manual-sync/dispatch-trip')
  async syncManualDispatchTrip(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.syncManualDispatchTrip(corridorActorFromUser(user, query), body);
  }

  @Get('shipments/:shipmentId/milestones')
  async listMilestones(@CurrentUser() user: AuthenticatedUser | undefined, @Param('shipmentId') shipmentId: string, @Query() query: Record<string, unknown>) {
    return this.corridorService.listMilestones(corridorActorFromUser(user, query), shipmentId);
  }

  @Post('shipments/:shipmentId/milestones')
  async createMilestone(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.createMilestone(corridorActorFromUser(user, query), shipmentId, body);
  }

  @Get('shipments/:shipmentId/exceptions')
  async listExceptions(@CurrentUser() user: AuthenticatedUser | undefined, @Param('shipmentId') shipmentId: string, @Query() query: Record<string, unknown>) {
    return this.corridorService.listExceptions(corridorActorFromUser(user, query), shipmentId);
  }

  @Post('shipments/:shipmentId/exceptions')
  async createException(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.createException(corridorActorFromUser(user, query), shipmentId, body);
  }

  @Patch('shipments/:shipmentId/exceptions/:exceptionId')
  async updateException(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Param('exceptionId') exceptionId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.updateException(corridorActorFromUser(user, query), shipmentId, exceptionId, body);
  }

  @Post('shipments/:shipmentId/actions/:action')
  async shipmentAction(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentId') shipmentId: string,
    @Param('action') action: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.performShipmentAction(corridorActorFromUser(user, query), shipmentId, action.replace(/-/g, '_'), body);
  }

  @Post('trips/:tripId/actions/:action')
  async tripAction(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('tripId') tripId: string,
    @Param('action') action: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.performTripAction(corridorActorFromUser(user, query), tripId, action.replace(/-/g, '_'), body);
  }
}
