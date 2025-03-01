/**
 * Service for handling file storage operations
 * Currently supports MinIO and S3-compatible storage
 */
export declare class StorageService {
    private client;
    private bucket;
    private config;
    constructor();
    /**
     * Initialize the storage bucket
     */
    private initializeBucket;
    /**
     * Upload a file to storage
     */
    uploadFile(buffer: Buffer, originalName: string, contentType: string, folder?: string): Promise<{
        key: string;
        size: number;
    }>;
    /**
     * Get a presigned URL for a file
     */
    getFileUrl(key: string, expiryInSeconds?: number): Promise<string>;
    /**
     * Delete a file from storage
     */
    deleteFile(key: string): Promise<void>;
    /**
     * List all files in a directory
     */
    listFiles(prefix?: string, recursive?: boolean): Promise<string[]>;
}
declare const storageServiceInstance: StorageService;
export declare const uploadFile: (buffer: Buffer, originalName: string, contentType: string, folder?: string) => Promise<{
    key: string;
    size: number;
}>;
export declare const getFileUrl: (key: string, expiryInSeconds?: number) => Promise<string>;
export declare const deleteFile: (key: string) => Promise<void>;
export declare const listFiles: (prefix?: string, recursive?: boolean) => Promise<string[]>;
export default storageServiceInstance;
