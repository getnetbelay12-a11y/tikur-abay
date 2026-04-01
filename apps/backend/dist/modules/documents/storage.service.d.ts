export declare class StorageService {
    private readonly runtime;
    private client;
    persistDocument(storageKey: string, input: {
        fileName: string;
        mimeType: string;
        fileContentBase64?: string;
        title?: string;
        category?: string;
        entityType?: string;
        entityId?: string;
        fileUrl?: string;
        actor: string;
    }): Promise<{
        fileUrl: string;
        storageMode: string;
    }>;
    createPresignedUpload(storageKey: string, input: {
        mimeType: string;
        fileSize?: number;
        fileName: string;
    }): Promise<{
        storageMode: string;
        uploadStrategy: string;
        storageKey: string;
        expiresInSeconds: number;
        uploadUrl?: undefined;
        requiredHeaders?: undefined;
    } | {
        storageMode: string;
        uploadStrategy: string;
        storageKey: string;
        uploadUrl: string;
        expiresInSeconds: number;
        requiredHeaders: {
            'Content-Type': string;
        };
    }>;
    buildDownloadUrl(storageKey: string, fileName: string, mimeType: string): Promise<{
        url: string;
        storageMode: string;
    }>;
    resolveLocalFile(storageKey: string): Promise<string>;
    private persistS3Object;
    private persistLocalFile;
    private resolveStoragePath;
    private getS3Client;
    private requireS3Value;
}
