import { Client } from 'minio';
import { logger } from '../utils/logger.js';
import path from 'path';

// Storage provider configuration
interface StorageConfig {
  provider: 'minio' | 's3';
  endpoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region?: string;
}

/**
 * Service for handling file storage operations
 * Currently supports MinIO and S3-compatible storage
 */
export class StorageService {
  private client: Client;
  private bucket: string;
  private config: StorageConfig;

  constructor() {
    // Load configuration from environment variables
    this.config = {
      provider: (process.env.STORAGE_PROVIDER as 'minio' | 's3') || 'minio',
      endpoint: process.env.STORAGE_ENDPOINT || 'localhost',
      port: parseInt(process.env.STORAGE_PORT || '9000', 10),
      useSSL: process.env.STORAGE_USE_SSL === 'true',
      accessKey: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.STORAGE_SECRET_KEY || 'minioadmin',
      bucket: process.env.STORAGE_BUCKET || 'dungeon-lab',
      region: process.env.STORAGE_REGION,
    };

    this.bucket = this.config.bucket;

    // Log storage configuration (without credentials)
    logger.info('Storage Configuration:');
    logger.info(`Provider: ${this.config.provider}`);
    logger.info(`Endpoint: ${this.config.endpoint}`);
    logger.info(`Port: ${this.config.port}`);
    logger.info(`Use SSL: ${this.config.useSSL}`);
    logger.info(`Bucket: ${this.config.bucket}`);

    // Initialize MinIO client
    this.client = new Client({
      endPoint: this.config.endpoint,
      port: this.config.port,
      useSSL: this.config.useSSL,
      accessKey: this.config.accessKey,
      secretKey: this.config.secretKey,
      region: this.config.region,
    });

    // Ensure bucket exists
    this.initializeBucket();
  }

  /**
   * Initialize the storage bucket
   */
  private async initializeBucket(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, this.config.region || 'us-east-1');
        logger.info(`Created bucket: ${this.bucket}`);
      }
    } catch (error) {
      logger.error(`Error initializing bucket: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Upload a file to storage
   */
  async uploadFile(buffer: Buffer, originalName: string, contentType: string, folder: string = ''): Promise<{key: string, size: number}> {
    // Generate a unique file name
    const fileExtension = path.extname(originalName);
    const fileName = `${path.basename(originalName, fileExtension)}_${Date.now()}${fileExtension}`;
    
    // Construct key with folder
    const key = folder ? `${folder}/${fileName}` : fileName;
    
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    
    return {
      key,
      size: buffer.length
    };
  }

  /**
   * Get a presigned URL for a file
   */
  async getFileUrl(key: string, expiryInSeconds = 3600): Promise<string> {
    return await this.client.presignedGetObject(this.bucket, key, expiryInSeconds);
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  /**
   * List all files in a directory
   */
  async listFiles(prefix = '', recursive = true): Promise<string[]> {
    const files: string[] = [];
    const stream = this.client.listObjects(this.bucket, prefix, recursive);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => {
        if (obj.name) {
          files.push(obj.name);
        }
      });
      
      stream.on('error', reject);
      stream.on('end', () => resolve(files));
    });
  }
}

// Create and export a singleton instance
const storageServiceInstance = new StorageService();

// Export standalone functions that use the singleton
export const uploadFile = (buffer: Buffer, originalName: string, contentType: string, folder: string = '') => 
  storageServiceInstance.uploadFile(buffer, originalName, contentType, folder);

export const getFileUrl = (key: string, expiryInSeconds = 3600) => 
  storageServiceInstance.getFileUrl(key, expiryInSeconds);

export const deleteFile = (key: string) => 
  storageServiceInstance.deleteFile(key);

export const listFiles = (prefix = '', recursive = true) => 
  storageServiceInstance.listFiles(prefix, recursive);

// Export the instance as default
export default storageServiceInstance; 