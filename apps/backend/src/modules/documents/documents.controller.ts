import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Permissions } from '../auth/permissions.decorator';
import { Public } from '../auth/public.decorator';
import { RateLimit } from '../auth/rate-limit.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @Permissions('documents:view', 'documents:own:view')
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.list(user);
  }

  @Get('policy')
  @Permissions('documents:view', 'documents:own:view')
  async policy(
    @Query('entityType') entityType?: string,
    @Query('mobileUploadOnly') mobileUploadOnly?: string,
  ) {
    return this.documentsService.listPolicy({
      entityType,
      mobileUploadOnly: mobileUploadOnly === 'true',
    });
  }

  @Post('upload')
  @Permissions('documents:upload', 'documents:own:view')
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      title?: string;
      entityType?: string;
      entityId?: string;
      category?: string;
      documentType?: string;
      referenceNo?: string;
      visibilityScope?: string;
      status?: string;
      fileName?: string;
      mimeType?: string;
      fileSize?: number;
      fileUrl?: string;
      fileContentBase64?: string;
    },
  ) {
    return this.documentsService.upload(user, body);
  }

  @Post('upload-url')
  @Permissions('documents:upload', 'documents:own:view')
  async createUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      title?: string;
      entityType?: string;
      entityId?: string;
      category?: string;
      documentType?: string;
      referenceNo?: string;
      visibilityScope?: string;
      status?: string;
      fileName?: string;
      mimeType?: string;
      fileSize?: number;
    },
  ) {
    return this.documentsService.createUploadUrl(user, body);
  }

  @Post('finalize-upload')
  @Permissions('documents:upload', 'documents:own:view')
  async finalizeUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      title?: string;
      entityType?: string;
      entityId?: string;
      category?: string;
      documentType?: string;
      referenceNo?: string;
      visibilityScope?: string;
      status?: string;
      fileName?: string;
      mimeType?: string;
      fileSize?: number;
      storageKey?: string;
      fileUrl?: string;
    },
  ) {
    return this.documentsService.finalizeUpload(user, body);
  }

  @Get(':id')
  @Permissions('documents:view', 'documents:own:view')
  async getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.documentsService.getOne(user, id);
  }

  @Get(':id/download')
  @Permissions('documents:view', 'documents:own:view')
  async download(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.documentsService.download(user, id);
  }

  @Get(':id/download/resolve')
  @Public()
  @RateLimit({ windowMs: 5 * 60_000, max: 60, scope: 'documents:resolve' })
  async resolveDownload(@Param('id') id: string, @Query('token') token?: string) {
    return this.documentsService.resolveSignedDownload(id, token || '');
  }

  @Get(':id/download/file')
  @Public()
  @RateLimit({ windowMs: 5 * 60_000, max: 60, scope: 'documents:file' })
  async downloadFile(@Param('id') id: string, @Query('token') token: string | undefined, @Res() response: any) {
    const file = await this.documentsService.resolveSignedDownloadFile(id, token || '');
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);
    return response.sendFile(file.absolutePath);
  }

  @Get('by-entity/:entityType/:entityId')
  @Permissions('documents:view', 'documents:own:view')
  async byEntity(@CurrentUser() user: AuthenticatedUser, @Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    return this.documentsService.byEntity(user, entityType, entityId);
  }
}
