import * as Minio from 'minio';
import { minioClient, bucketName, ensureBucketExists } from '../config/storage';
import { Readable } from 'stream';
import crypto from 'crypto';
import path from 'path';

// Initialize the storage service
export const initializeStorage = async (): Promise<void> => {
  try {
    await ensureBucketExists();
    console.log('Storage service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize storage service:', error);
    throw error;
  }
};

// Generate a unique filename to prevent collisions
const generateUniqueFilename = (originalFilename: string): string => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalFilename);
  const basename = path.basename(originalFilename, extension);
  
  return `${basename}-${timestamp}-${randomString}${extension}`;
};

// Upload a file to the storage
export const uploadFile = async (
  fileBuffer: Buffer,
  originalFilename: string,
  contentType: string,
  folder = ''
): Promise<{ url: string; key: string }> => {
  try {
    const uniqueFilename = generateUniqueFilename(originalFilename);
    const objectKey = folder ? `${folder}/${uniqueFilename}` : uniqueFilename;
    
    // Convert buffer to readable stream
    const fileStream = new Readable();
    fileStream.push(fileBuffer);
    fileStream.push(null); // Signal the end of the stream
    
    // Set metadata
    const metaData = {
      'Content-Type': contentType,
      'X-Amz-Meta-Original-Filename': originalFilename
    };
    
    // Upload the file
    await minioClient.putObject(bucketName, objectKey, fileStream, fileBuffer.length, metaData);
    
    // Generate the public URL
    const url = await minioClient.presignedGetObject(bucketName, objectKey, 7 * 24 * 60 * 60); // 7 days expiry
    
    return {
      url,
      key: objectKey
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Get a file from the storage
export const getFileUrl = async (objectKey: string, expiryInSeconds = 7 * 24 * 60 * 60): Promise<string> => {
  try {
    return await minioClient.presignedGetObject(bucketName, objectKey, expiryInSeconds);
  } catch (error) {
    console.error('Error generating file URL:', error);
    throw error;
  }
};

// Delete a file from the storage
export const deleteFile = async (objectKey: string): Promise<void> => {
  try {
    await minioClient.removeObject(bucketName, objectKey);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// List files in a folder
export const listFiles = async (prefix = '', recursive = true): Promise<Minio.ItemBucketMetadata[]> => {
  try {
    const objectsStream = minioClient.listObjects(bucketName, prefix, recursive);
    const objects: Minio.ItemBucketMetadata[] = [];
    
    return new Promise((resolve, reject) => {
      objectsStream.on('data', (obj) => {
        objects.push(obj);
      });
      
      objectsStream.on('error', (err) => {
        reject(err);
      });
      
      objectsStream.on('end', () => {
        resolve(objects);
      });
    });
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}; 