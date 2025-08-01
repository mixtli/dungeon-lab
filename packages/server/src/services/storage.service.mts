import { Client } from 'minio';
import { logger } from '../utils/logger.mjs';

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
class StorageService {
  private client: Client;
  private bucket: string;
  private config: StorageConfig;
  private publicUrl: string;

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
    this.publicUrl = process.env.MINIO_PUBLIC_URL || `http://${this.config.endpoint}:${this.config.port}`;

    // Log storage configuration (without credentials)
    logger.info('Storage Configuration:');
    logger.info(`Provider: ${this.config.provider}`);
    logger.info(`Endpoint: ${this.config.endpoint}`);
    logger.info(`Port: ${this.config.port}`);
    logger.info(`Use SSL: ${this.config.useSSL}`);
    logger.info(`Bucket: ${this.config.bucket}`);
    logger.info(`Public URL: ${this.publicUrl}`);

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
    // Use the original filename without appending a timestamp
    const fileName = originalName;
    
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
   * Upload a buffer with a specific storage key
   */
  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void> {
    logger.info(`MinIO uploadBuffer - Bucket: ${this.bucket}, Key: ${key}, Size: ${buffer.length} bytes, ContentType: ${contentType}`);
    logger.info(`MinIO config - Endpoint: ${this.config.endpoint}:${this.config.port}, SSL: ${this.config.useSSL}`);
    
    try {
      await this.client.putObject(this.bucket, key, buffer, buffer.length, {
        'Content-Type': contentType,
      });
      logger.info(`MinIO putObject successful - Bucket: ${this.bucket}, Key: ${key}`);
    } catch (error) {
      logger.error(`MinIO putObject failed - Bucket: ${this.bucket}, Key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Download a buffer from storage
   */
  async downloadBuffer(key: string): Promise<Buffer> {
    logger.info(`MinIO downloadBuffer - Bucket: ${this.bucket}, Key: ${key}`);
    
    try {
      const stream = await this.client.getObject(this.bucket, key);
      const chunks: Buffer[] = [];
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', (error) => {
          logger.error(`MinIO downloadBuffer stream error - Bucket: ${this.bucket}, Key: ${key}`, error);
          reject(error);
        });
        stream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          logger.info(`MinIO downloadBuffer successful - Bucket: ${this.bucket}, Key: ${key}, Size: ${buffer.length} bytes`);
          resolve(buffer);
        });
      });
    } catch (error) {
      logger.error(`MinIO downloadBuffer failed - Bucket: ${this.bucket}, Key: ${key}`, error);
      throw error;
    }
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
   * Delete all files in a directory
   * @param prefix Directory path prefix to delete all files from
   */
  async deleteDirectory(prefix: string): Promise<void> {
    try {
      // List all objects in the directory
      const fileList = await this.listFiles(prefix);
      
      if (fileList.length === 0) {
        logger.info(`No files found in directory: ${prefix}`);
        return;
      }
      
      // Create an array of objects to delete
      const objectsToDelete = fileList.map(name => ({ name }));
      
      // Delete all objects in batch
      await this.client.removeObjects(this.bucket, objectsToDelete);
      
      logger.info(`Deleted ${fileList.length} files from directory: ${prefix}`);
    } catch (error) {
      logger.error(`Error deleting directory: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to delete directory: ${prefix}`);
    }
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

  /**
   * Get a public URL for a file
   */
  getPublicUrl(key: string): string {
    // Only encode parts of the key that need encoding, preserving slashes
    const encodedKey = key.split('/').map(part => encodeURIComponent(part)).join('/');
    return `${this.publicUrl}/${this.bucket}/${encodedKey}`;
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

export const deleteDirectory = (prefix: string) => 
  storageServiceInstance.deleteDirectory(prefix);

export const listFiles = (prefix = '', recursive = true) => 
  storageServiceInstance.listFiles(prefix, recursive);

export const getPublicUrl = (key: string) => 
  storageServiceInstance.getPublicUrl(key);

export const uploadBuffer = (key: string, buffer: Buffer, contentType: string) => 
  storageServiceInstance.uploadBuffer(key, buffer, contentType);

export const downloadBuffer = (key: string) => 
  storageServiceInstance.downloadBuffer(key);

// Export the instance as default
export default storageServiceInstance; 