import { ForbiddenException, Injectable } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdir, writeFile, access } from 'node:fs/promises';
import * as path from 'node:path';
import { getRuntimeConfig } from '../../database/config';

@Injectable()
export class StorageService {
  private readonly runtime = getRuntimeConfig();
  private client: S3Client | null = null;

  async persistDocument(
    storageKey: string,
    input: {
      fileName: string;
      mimeType: string;
      fileContentBase64?: string;
      title?: string;
      category?: string;
      entityType?: string;
      entityId?: string;
      fileUrl?: string;
      actor: string;
    },
  ) {
    if (this.runtime.fileStorageMode === 's3') {
      await this.persistS3Object(storageKey, input);
      return { fileUrl: `s3://${this.runtime.s3Bucket}/${storageKey}`, storageMode: 's3' };
    }

    await this.persistLocalFile(storageKey, input);
    return { fileUrl: `local://${storageKey}`, storageMode: 'local' };
  }

  async createPresignedUpload(
    storageKey: string,
    input: { mimeType: string; fileSize?: number; fileName: string },
  ) {
    if (this.runtime.fileStorageMode !== 's3') {
      return {
        storageMode: 'local',
        uploadStrategy: 'direct-api-upload',
        storageKey,
        expiresInSeconds: 0,
      };
    }

    const url = await getSignedUrl(
      this.getS3Client(),
      new PutObjectCommand({
        Bucket: this.requireS3Value(this.runtime.s3Bucket, 'S3_BUCKET'),
        Key: storageKey,
        ContentType: input.mimeType,
      }),
      { expiresIn: 600 },
    );

    return {
      storageMode: 's3',
      uploadStrategy: 'signed-put',
      storageKey,
      uploadUrl: url,
      expiresInSeconds: 600,
      requiredHeaders: { 'Content-Type': input.mimeType },
    };
  }

  async buildDownloadUrl(storageKey: string, fileName: string, mimeType: string) {
    if (this.runtime.fileStorageMode === 's3') {
      const url = await getSignedUrl(
        this.getS3Client(),
        new GetObjectCommand({
          Bucket: this.requireS3Value(this.runtime.s3Bucket, 'S3_BUCKET'),
          Key: storageKey,
          ResponseContentType: mimeType,
          ResponseContentDisposition: `inline; filename="${fileName}"`,
        }),
        { expiresIn: 600 },
      );
      return { url, storageMode: 's3' };
    }

    return { url: '', storageMode: 'local' };
  }

  async resolveLocalFile(storageKey: string) {
    const absolutePath = this.resolveStoragePath(storageKey);
    await access(absolutePath);
    return absolutePath;
  }

  private async persistS3Object(
    storageKey: string,
    input: {
      fileName: string;
      mimeType: string;
      fileContentBase64?: string;
      title?: string;
      category?: string;
      entityType?: string;
      entityId?: string;
      fileUrl?: string;
      actor: string;
    },
  ) {
    const body = input.fileContentBase64
      ? Buffer.from(input.fileContentBase64.includes(',') ? input.fileContentBase64.split(',').pop() || '' : input.fileContentBase64, 'base64')
      : Buffer.from(
          [
            `Tikur Abay stored document placeholder`,
            `fileName=${input.fileName}`,
            `mimeType=${input.mimeType}`,
            `title=${input.title || input.fileName}`,
            `category=${input.category || 'document'}`,
            `entityType=${input.entityType || 'trip'}`,
            `entityId=${input.entityId || 'n/a'}`,
            `uploadedBy=${input.actor}`,
            `sourceUrl=${input.fileUrl || 'n/a'}`,
            `createdAt=${new Date().toISOString()}`,
          ].join('\n'),
          'utf8',
        );

    await this.getS3Client().send(
      new PutObjectCommand({
        Bucket: this.requireS3Value(this.runtime.s3Bucket, 'S3_BUCKET'),
        Key: storageKey,
        Body: body,
        ContentType: input.mimeType,
      }),
    );
  }

  private async persistLocalFile(
    storageKey: string,
    input: {
      fileName: string;
      mimeType: string;
      fileContentBase64?: string;
      title?: string;
      category?: string;
      entityType?: string;
      entityId?: string;
      fileUrl?: string;
      actor: string;
    },
  ) {
    const absolutePath = this.resolveStoragePath(storageKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });

    if (input.fileContentBase64) {
      const payload = input.fileContentBase64.includes(',')
        ? input.fileContentBase64.split(',').pop() || ''
        : input.fileContentBase64;
      await writeFile(absolutePath, Buffer.from(payload, 'base64'));
      return;
    }

    const placeholder = [
      `Tikur Abay local document placeholder`,
      `fileName=${input.fileName}`,
      `mimeType=${input.mimeType}`,
      `title=${input.title || input.fileName}`,
      `category=${input.category || 'document'}`,
      `entityType=${input.entityType || 'trip'}`,
      `entityId=${input.entityId || 'n/a'}`,
      `uploadedBy=${input.actor}`,
      `sourceUrl=${input.fileUrl || 'n/a'}`,
      `createdAt=${new Date().toISOString()}`,
    ].join('\n');
    await writeFile(absolutePath, placeholder, 'utf8');
  }

  private resolveStoragePath(storageKey: string) {
    return path.resolve(process.cwd(), this.runtime.localStorageDir, storageKey);
  }

  private getS3Client() {
    if (!this.client) {
      const endpoint = this.requireS3Value(this.runtime.s3Endpoint, 'S3_ENDPOINT');
      const region = this.requireS3Value(this.runtime.s3Region, 'S3_REGION');
      const accessKeyId = this.requireS3Value(this.runtime.s3AccessKey, 'S3_ACCESS_KEY');
      const secretAccessKey = this.requireS3Value(this.runtime.s3SecretKey, 'S3_SECRET_KEY');
      this.client = new S3Client({
        endpoint,
        region,
        forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
    return this.client;
  }

  private requireS3Value(value: string | undefined, key: string) {
    if (!value) {
      throw new ForbiddenException(`Missing ${key} for S3 storage mode`);
    }
    return value;
  }
}
