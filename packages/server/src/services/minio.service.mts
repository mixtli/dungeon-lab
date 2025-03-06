import { Client } from 'minio';

export class MinioService {
  private client: Client;
  private bucket = 'dungeon-lab';

  constructor() {
    this.client = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
  }

  async uploadBuffer(buffer: Buffer, path: string, contentType: string): Promise<string> {
    await this.client.putObject(this.bucket, path, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    return path; // Return just the path instead of full URL
  }

  async deleteObject(path: string): Promise<void> {
    await this.client.removeObject(this.bucket, path);
  }

  async getPresignedUrl(path: string, expiryInSeconds: number = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, path, expiryInSeconds);
  }
} 