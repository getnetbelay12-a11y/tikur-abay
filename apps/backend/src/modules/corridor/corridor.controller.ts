import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { Public } from '../auth/public.decorator';
import { corridorActorFromUser, CorridorService } from './corridor.service';

@ApiTags('corridor')
@Controller('corridor')
export class CorridorController {
  constructor(private readonly corridorService: CorridorService) {}

  @Get('access-matrix')
  @Public()
  getAccessMatrix() {
    return this.corridorService.getRoleMatrix();
  }

  @Get('shipments')
  getShipments(@CurrentUser() user: AuthenticatedUser | undefined, @Query() query: Record<string, unknown>) {
    return this.corridorService.getShipments(corridorActorFromUser(user, query));
  }

  @Get('shipments/:shipmentRef')
  getShipment(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentRef') shipmentRef: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.getShipment(shipmentRef, corridorActorFromUser(user, query));
  }

  @Get('customer-portal')
  getCustomerPortal(@CurrentUser() user: AuthenticatedUser | undefined, @Query() query: Record<string, unknown>) {
    return this.corridorService.getCustomerPortal(corridorActorFromUser(user, query));
  }

  @Get('workspaces/:workspace')
  getWorkspace(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('workspace') workspace: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.getWorkspace(workspace as any, corridorActorFromUser(user, query));
  }

  @Get('driver/transit-pack')
  getDriverTransitPack(@CurrentUser() user: AuthenticatedUser | undefined, @Query() query: Record<string, unknown>) {
    return this.corridorService.getDriverTransitPack(corridorActorFromUser(user, query));
  }

  @Post('shipments/:shipmentRef/clearance/documents-ready')
  markDocumentsReady(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentRef') shipmentRef: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.markDocumentsReadyForClearance(corridorActorFromUser(user, query), shipmentRef, body);
  }

  @Post('shipments/:shipmentRef/clearance/acknowledge')
  acknowledgeClearance(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentRef') shipmentRef: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.acknowledgeClearanceDocuments(corridorActorFromUser(user, query), shipmentRef, body);
  }

  @Post('shipments/:shipmentRef/clearance/request-missing-docs')
  requestMissingDocs(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentRef') shipmentRef: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.requestMissingClearanceDocuments(corridorActorFromUser(user, query), shipmentRef, body);
  }

  @Post('shipments/:shipmentRef/clearance/start')
  startClearance(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentRef') shipmentRef: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.startClearance(corridorActorFromUser(user, query), shipmentRef, body);
  }

  @Post('shipments/:shipmentRef/clearance/complete')
  completeClearance(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentRef') shipmentRef: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.completeClearance(corridorActorFromUser(user, query), shipmentRef, body);
  }

  @Post('shipments/:shipmentRef/clearance-pack')
  generateClearancePack(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentRef') shipmentRef: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.generateClearancePack(corridorActorFromUser(user, query), shipmentRef, body);
  }

  @Post('shipments/:shipmentRef/documents/bulk-download')
  bulkDownloadDocuments(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentRef') shipmentRef: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.bulkDownloadDocuments(corridorActorFromUser(user, query), shipmentRef, body);
  }

  @Post('shipments/:shipmentRef/documents/:shipmentDocumentId/access-log')
  logDocumentAccess(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentRef') shipmentRef: string,
    @Param('shipmentDocumentId') shipmentDocumentId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.logDocumentAccess(corridorActorFromUser(user, query), shipmentRef, shipmentDocumentId, body);
  }

  @Get('shipments/:shipmentRef/document-access-log')
  getDocumentAccessLog(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('shipmentRef') shipmentRef: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.corridorService.getDocumentAccessLog(corridorActorFromUser(user, query), shipmentRef);
  }
}
