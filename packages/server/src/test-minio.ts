import { minioClient, bucketName, ensureBucketExists } from './config/storage';
import * as storageService from './services/storage.service';
import fs from 'fs';
import path from 'path';

async function testMinioConnection() {
  try {
    console.log('Testing MinIO connection...');
    
    // Initialize storage
    await storageService.initializeStorage();
    
    // Check if bucket exists
    const bucketExists = await minioClient.bucketExists(bucketName);
    console.log(`Bucket ${bucketName} exists: ${bucketExists}`);
    
    // Create a test file
    const testFilePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'This is a test file for MinIO upload.');
    
    // Upload the test file
    const fileBuffer = fs.readFileSync(testFilePath);
    const result = await storageService.uploadFile(
      fileBuffer,
      'test-file.txt',
      'text/plain',
      'test-folder'
    );
    
    console.log('File uploaded successfully:');
    console.log(`Key: ${result.key}`);
    console.log(`URL: ${result.url}`);
    
    // List files
    const files = await storageService.listFiles();
    console.log('Files in bucket:');
    files.forEach(file => {
      console.log(`- ${file.name} (${file.size} bytes)`);
    });
    
    // Clean up
    fs.unlinkSync(testFilePath);
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Error testing MinIO connection:', error);
  }
}

testMinioConnection(); 