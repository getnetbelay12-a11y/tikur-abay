// @ts-nocheck
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Permissions } from '../auth/permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ImportSettlementService } from './import-settlement.service';

@ApiTags('import-settlement')
@Controller('import-settlement')
export class ImportSettlementController {
  constructor(private readonly importSettlementService: ImportSettlementService) {}

  @Get('shipments/queue')
  @Permissions('payments:view', 'payments:own:view', 'corridor:finance:view', 'corridor:yard:view', 'dashboard:customer:view', 'trips:view-assigned')
  async queue(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, any>) {
    return this.importSettlementService.listShipmentQueue(user, query);
  }

  @Get('shipments/:shipmentId/workspace')
  @Permissions('payments:view', 'payments:own:view', 'documents:own:view', 'documents:view', 'corridor:finance:view', 'corridor:yard:view', 'dashboard:customer:view', 'trips:view-assigned')
  async workspace(@CurrentUser() user: AuthenticatedUser, @Param('shipmentId') shipmentId: string) {
    return this.importSettlementService.getShipmentWorkspace(user, shipmentId);
  }

  @Post('shipments/:shipmentId/bank-documents')
  @Permissions('payments:view', 'payments:own:view', 'documents:own:view', 'documents:upload', 'corridor:finance:view')
  async createBankDocument(@CurrentUser() user: AuthenticatedUser, @Param('shipmentId') shipmentId: string, @Body() body: Record<string, any>) {
    return this.importSettlementService.createBankDocument(user, shipmentId, body);
  }

  @Patch('bank-documents/:bankDocumentId')
  @Permissions('payments:view', 'corridor:finance:view')
  async reviewBankDocument(@CurrentUser() user: AuthenticatedUser, @Param('bankDocumentId') bankDocumentId: string, @Body() body: Record<string, any>) {
    return this.importSettlementService.reviewBankDocument(user, bankDocumentId, body);
  }

  @Post('shipments/:shipmentId/invoices')
  @Permissions('payments:view', 'invoices:view', 'corridor:finance:view', 'customers:view')
  async createInvoice(@CurrentUser() user: AuthenticatedUser, @Param('shipmentId') shipmentId: string, @Body() body: Record<string, any>) {
    return this.importSettlementService.createChargeInvoice(user, shipmentId, body);
  }

  @Patch('invoices/:invoiceId')
  @Permissions('payments:view', 'invoices:view', 'corridor:finance:view', 'customers:view')
  async updateInvoice(@CurrentUser() user: AuthenticatedUser, @Param('invoiceId') invoiceId: string, @Body() body: Record<string, any>) {
    return this.importSettlementService.updateChargeInvoice(user, invoiceId, body);
  }

  @Post('shipments/:shipmentId/payment-receipts')
  @Permissions('payments:view', 'payments:own:view', 'documents:own:view', 'documents:upload')
  async createPaymentReceipt(@CurrentUser() user: AuthenticatedUser, @Param('shipmentId') shipmentId: string, @Body() body: Record<string, any>) {
    return this.importSettlementService.createCustomerPaymentReceipt(user, shipmentId, body);
  }

  @Patch('payment-receipts/:receiptId/verify')
  @Permissions('payments:view', 'corridor:finance:view')
  async verifyPaymentReceipt(@CurrentUser() user: AuthenticatedUser, @Param('receiptId') receiptId: string, @Body() body: Record<string, any>) {
    return this.importSettlementService.verifyPaymentReceipt(user, receiptId, body);
  }

  @Post('shipments/:shipmentId/official-receipts')
  @Permissions('payments:view', 'corridor:finance:view')
  async issueOfficialReceipt(@CurrentUser() user: AuthenticatedUser, @Param('shipmentId') shipmentId: string, @Body() body: Record<string, any>) {
    return this.importSettlementService.issueOfficialReceipt(user, shipmentId, body);
  }

  @Post('shipments/:shipmentId/financial-clearance')
  @Permissions('payments:view', 'corridor:finance:view')
  async approveFinancialClearance(@CurrentUser() user: AuthenticatedUser, @Param('shipmentId') shipmentId: string, @Body() body: Record<string, any>) {
    return this.importSettlementService.approveFinancialClearance(user, shipmentId, body);
  }

  @Post('shipments/:shipmentId/release-authorizations')
  @Permissions('payments:view', 'corridor:finance:view', 'corridor:yard:view', 'customers:view')
  async createReleaseAuthorization(@CurrentUser() user: AuthenticatedUser, @Param('shipmentId') shipmentId: string, @Body() body: Record<string, any>) {
    return this.importSettlementService.createReleaseAuthorization(user, shipmentId, body);
  }

  @Post('shipments/:shipmentId/dry-port-release')
  @Permissions('corridor:yard:view')
  async confirmDryPortRelease(@CurrentUser() user: AuthenticatedUser, @Param('shipmentId') shipmentId: string, @Body() body: Record<string, any>) {
    return this.importSettlementService.confirmDryPortRelease(user, shipmentId, body);
  }

  @Post('shipments/:shipmentId/container-interchanges')
  @Permissions('corridor:yard:view', 'corridor:finance:view', 'documents:upload', 'trips:view-assigned')
  async createInterchange(@CurrentUser() user: AuthenticatedUser, @Param('shipmentId') shipmentId: string, @Body() body: Record<string, any>) {
    return this.importSettlementService.createContainerInterchange(user, shipmentId, body);
  }

  @Post('shipments/:shipmentId/driver-expense-claims')
  @Permissions('documents:upload', 'trips:view-assigned')
  async createDriverExpenseClaim(@CurrentUser() user: AuthenticatedUser, @Param('shipmentId') shipmentId: string, @Body() body: Record<string, any>) {
    return this.importSettlementService.submitDriverExpenseClaim(user, shipmentId, body);
  }

  @Patch('driver-expense-claims/:claimId/review')
  @Permissions('payments:view', 'corridor:finance:view')
  async reviewDriverExpenseClaim(@CurrentUser() user: AuthenticatedUser, @Param('claimId') claimId: string, @Body() body: Record<string, any>) {
    return this.importSettlementService.reviewDriverExpenseClaim(user, claimId, body);
  }

  @Post('driver-expense-claims/:claimId/reimburse')
  @Permissions('payments:view', 'corridor:finance:view')
  async reimburseDriverExpenseClaim(@CurrentUser() user: AuthenticatedUser, @Param('claimId') claimId: string, @Body() body: Record<string, any>) {
    return this.importSettlementService.reimburseDriverExpenseClaim(user, claimId, body);
  }

  @Get('dashboards/finance')
  @Permissions('payments:view', 'corridor:finance:view')
  async financeDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.importSettlementService.financeDashboard(user);
  }

  @Get('dashboards/operations')
  @Permissions('payments:view', 'corridor:finance:view', 'corridor:yard:view', 'customers:view')
  async operationsDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.importSettlementService.operationsDashboard(user);
  }

  @Get('dashboards/reimbursements')
  @Permissions('payments:view', 'corridor:finance:view')
  async reimbursementDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.importSettlementService.reimbursementDashboard(user);
  }
}
