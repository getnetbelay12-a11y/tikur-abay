"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const promises_1 = require("node:fs/promises");
const path = require("node:path");
const config_1 = require("../../database/config");
let StorageService = class StorageService {
    constructor() {
        this.runtime = (0, config_1.getRuntimeConfig)();
        this.client = null;
    }
    async persistDocument(storageKey, input) {
        if (this.runtime.fileStorageMode === 's3') {
            await this.persistS3Object(storageKey, input);
            return { fileUrl: `s3://${this.runtime.s3Bucket}/${storageKey}`, storageMode: 's3' };
        }
        await this.persistLocalFile(storageKey, input);
        return { fileUrl: `local://${storageKey}`, storageMode: 'local' };
    }
    async createPresignedUpload(storageKey, input) {
        if (this.runtime.fileStorageMode !== 's3') {
            return {
                storageMode: 'local',
                uploadStrategy: 'direct-api-upload',
                storageKey,
                expiresInSeconds: 0,
            };
        }
        const url = await (0, s3_request_presigner_1.getSignedUrl)(this.getS3Client(), new client_s3_1.PutObjectCommand({
            Bucket: this.requireS3Value(this.runtime.s3Bucket, 'S3_BUCKET'),
            Key: storageKey,
            ContentType: input.mimeType,
        }), { expiresIn: 600 });
        return {
            storageMode: 's3',
            uploadStrategy: 'signed-put',
            storageKey,
            uploadUrl: url,
            expiresInSeconds: 600,
            requiredHeaders: { 'Content-Type': input.mimeType },
        };
    }
    async buildDownloadUrl(storageKey, fileName, mimeType) {
        if (this.runtime.fileStorageMode === 's3') {
            const url = await (0, s3_request_presigner_1.getSignedUrl)(this.getS3Client(), new client_s3_1.GetObjectCommand({
                Bucket: this.requireS3Value(this.runtime.s3Bucket, 'S3_BUCKET'),
                Key: storageKey,
                ResponseContentType: mimeType,
                ResponseContentDisposition: `inline; filename="${fileName}"`,
            }), { expiresIn: 600 });
            return { url, storageMode: 's3' };
        }
        return { url: '', storageMode: 'local' };
    }
    async resolveLocalFile(storageKey) {
        const absolutePath = this.resolveStoragePath(storageKey);
        await (0, promises_1.access)(absolutePath);
        return absolutePath;
    }
    async persistS3Object(storageKey, input) {
        const body = input.fileContentBase64
            ? Buffer.from(input.fileContentBase64.includes(',') ? input.fileContentBase64.split(',').pop() || '' : input.fileContentBase64, 'base64')
            : Buffer.from([
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
            ].join('\n'), 'utf8');
        await this.getS3Client().send(new client_s3_1.PutObjectCommand({
            Bucket: this.requireS3Value(this.runtime.s3Bucket, 'S3_BUCKET'),
            Key: storageKey,
            Body: body,
            ContentType: input.mimeType,
        }));
    }
    async persistLocalFile(storageKey, input) {
        const absolutePath = this.resolveStoragePath(storageKey);
        await (0, promises_1.mkdir)(path.dirname(absolutePath), { recursive: true });
        if (input.fileContentBase64) {
            const payload = input.fileContentBase64.includes(',')
                ? input.fileContentBase64.split(',').pop() || ''
                : input.fileContentBase64;
            await (0, promises_1.writeFile)(absolutePath, Buffer.from(payload, 'base64'));
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
        await (0, promises_1.writeFile)(absolutePath, placeholder, 'utf8');
    }
    resolveStoragePath(storageKey) {
        return path.resolve(process.cwd(), this.runtime.localStorageDir, storageKey);
    }
    getS3Client() {
        if (!this.client) {
            const endpoint = this.requireS3Value(this.runtime.s3Endpoint, 'S3_ENDPOINT');
            const region = this.requireS3Value(this.runtime.s3Region, 'S3_REGION');
            const accessKeyId = this.requireS3Value(this.runtime.s3AccessKey, 'S3_ACCESS_KEY');
            const secretAccessKey = this.requireS3Value(this.runtime.s3SecretKey, 'S3_SECRET_KEY');
            this.client = new client_s3_1.S3Client({
                endpoint,
                region,
                forcePathStyle: true,
                credentials: { accessKeyId, secretAccessKey },
            });
        }
        return this.client;
    }
    requireS3Value(value, key) {
        if (!value) {
            throw new common_1.ForbiddenException(`Missing ${key} for S3 storage mode`);
        }
        return value;
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)()
], StorageService);
//# sourceMappingURL=storage.service.js.map