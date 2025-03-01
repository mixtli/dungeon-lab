import * as Minio from 'minio';
import dotenv from 'dotenv';

dotenv.config();

// Storage provider types
export enum StorageProvider {
  MINIO = 'minio',
  AWS_S3 = 'aws_s3',
  GOOGLE_CLOUD = 'google_cloud'
}

// Default to MinIO for local development
const storageProvider = (process.env.STORAGE_PROVIDER as StorageProvider) || StorageProvider.MINIO;

// Configuration for different storage providers
const storageConfig = {
  [StorageProvider.MINIO]: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    region: process.env.MINIO_REGION || '',
    bucketName: process.env.MINIO_BUCKET_NAME || 'dungeon-lab'
  },
  [StorageProvider.AWS_S3]: {
    endPoint: 's3.amazonaws.com',
    port: 443,
    useSSL: true,
    accessKey: process.env.AWS_ACCESS_KEY_ID || '',
    secretKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    bucketName: process.env.AWS_BUCKET_NAME || 'dungeon-lab'
  },
  [StorageProvider.GOOGLE_CLOUD]: {
    endPoint: 'storage.googleapis.com',
    port: 443,
    useSSL: true,
    accessKey: process.env.GCS_ACCESS_KEY || '',
    secretKey: process.env.GCS_SECRET_KEY || '',
    region: process.env.GCS_REGION || 'us',
    bucketName: process.env.GCS_BUCKET_NAME || 'dungeon-lab'
  }
};

// Get the configuration for the current provider
const currentConfig = storageConfig[storageProvider];

// Log the current storage configuration
console.log('Storage Configuration:');
console.log(`Provider: ${storageProvider}`);
console.log(`Endpoint: ${currentConfig.endPoint}`);
console.log(`Port: ${currentConfig.port}`);
console.log(`Use SSL: ${currentConfig.useSSL}`);
console.log(`Bucket: ${currentConfig.bucketName}`);

// Create and export the MinIO client
export const minioClient = new Minio.Client({
  endPoint: currentConfig.endPoint,
  port: currentConfig.port,
  useSSL: currentConfig.useSSL,
  accessKey: currentConfig.accessKey,
  secretKey: currentConfig.secretKey,
  region: currentConfig.region
});

// Export the bucket name
export const bucketName = currentConfig.bucketName;

// Helper function to check if bucket exists and create it if it doesn't
export const ensureBucketExists = async (): Promise<void> => {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      console.log(`Bucket ${bucketName} does not exist, creating it...`);
      await minioClient.makeBucket(bucketName, currentConfig.region);
      
      // Set the bucket policy to allow public read access
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`]
          }
        ]
      };
      
      await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      console.log(`Created bucket ${bucketName} with public read access`);
    } else {
      console.log(`Bucket ${bucketName} already exists`);
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    throw error;
  }
}; 