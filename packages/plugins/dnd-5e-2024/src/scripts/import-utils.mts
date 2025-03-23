import { readFile, readdir } from 'fs/promises';
import { join, basename } from 'path';
import mongoose from 'mongoose';
import { VTTDocument } from '@dungeon-lab/server/src/models/vtt-document.model.mjs';
import { pluginRegistry } from '@dungeon-lab/server/src/services/plugin-registry.service.mjs';
import config from '../../manifest.json' with { type: 'json' };

/**
 * Connect to MongoDB
 * @returns Promise that resolves when connected
 */
export async function connectToDatabase(): Promise<void> {
  // Initialize plugin registry so the VTTDocument model can validate plugin IDs
  pluginRegistry.initialize();
  console.log('Plugin registry initialized');
  
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dungeon-lab');
  console.log('Connected to MongoDB');
}

/**
 * Disconnect from MongoDB
 * @returns Promise that resolves when disconnected
 */
export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
}

/**
 * Find the first user to use as creator/updater ID
 * @returns Promise that resolves to user ID
 */
export async function getFirstUserId(): Promise<string> {
  const User = mongoose.connection.collection('users');
  const firstUser = await User.findOne({});
  const userId = firstUser ? firstUser._id.toString() : 'system';
  console.log(`Using user ID: ${userId} for import operations`);
  return userId;
}

/**
 * Read and parse a JSON file from the 5etools data directory
 * @param dirPath Directory path to start from
 * @param fileName Name of the JSON file to read, can include glob patterns
 * @returns Parsed JSON data
 */
export async function read5eToolsData(dirPath: string, fileName: string): Promise<any> {
  // Check if the fileName contains a glob pattern
  if (fileName.includes('*')) {
    // Split the path to handle directory and file pattern separately
    const lastSlashIndex = fileName.lastIndexOf('/');
    let directory = dirPath;
    let filePattern = fileName;
    
    // If there's a directory in the fileName, append it to dirPath
    if (lastSlashIndex !== -1) {
      directory = join(dirPath, fileName.substring(0, lastSlashIndex));
      filePattern = fileName.substring(lastSlashIndex + 1);
    }
    
    // For class files, we need to create a special structure
    if (filePattern.startsWith('class-')) {
      return await processClassFiles(directory, filePattern);
    }
    
    // Create a RegExp from the file pattern
    const patternParts = filePattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`^${patternParts.join('.*')}$`);
    
    // Read all files in the directory
    const files = await readdir(directory);
    
    // Find matching files
    const matchingFiles = files.filter(file => pattern.test(file));
    
    if (matchingFiles.length === 0) {
      throw new Error(`No files matching pattern "${filePattern}" found in ${directory}`);
    }
    
    // Combine data from all matching files
    const combinedData: Record<string, any[]> = {};
    
    for (const file of matchingFiles) {
      const filePath = join(directory, file);
      const fileData = JSON.parse(await readFile(filePath, 'utf-8'));
      
      // For each key in the file data, add to the combined data
      Object.entries(fileData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          if (!combinedData[key]) {
            combinedData[key] = [];
          }
          combinedData[key].push(...value);
        }
      });
      
      console.log(`Read data from ${file}`);
    }
    
    return combinedData;
  } else {
    // Simple case - just read the single file
    const filePath = join(dirPath, fileName);
    return JSON.parse(await readFile(filePath, 'utf-8'));
  }
}

/**
 * Process class files specifically since they need special handling
 * @param directory Directory containing class files
 * @param filePattern File pattern to match (e.g., class-*.json)
 * @returns Class data in a special format expected by the converter
 */
async function processClassFiles(directory: string, filePattern: string): Promise<any> {
  // Create a RegExp from the file pattern
  const patternParts = filePattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`^${patternParts.join('.*')}$`);
  
  // Read all files in the directory
  const files = await readdir(directory);
  
  // Find matching files
  const matchingFiles = files.filter(file => pattern.test(file));
  
  if (matchingFiles.length === 0) {
    throw new Error(`No files matching pattern "${filePattern}" found in ${directory}`);
  }
  
  console.log(`Found ${matchingFiles.length} class files to process`);
  
  // For class files, we'll return each file's data individually
  // instead of combining them
  const individualFiles = [];
  
  for (const file of matchingFiles) {
    const filePath = join(directory, file);
    const fileData = JSON.parse(await readFile(filePath, 'utf-8'));
    
    // For class files, we expect the data to be in a "class" array property
    if (fileData.class && Array.isArray(fileData.class) && fileData.class.length > 0) {
      // Take the first class from each file
      individualFiles.push(fileData.class[0]);
      console.log(`Read class data from ${file}`);
    }
  }
  
  // Return the classes directly
  return {
    class: individualFiles
  };
}

/**
 * Check if a document already exists in the database
 * @param documentType Type of document to check
 * @param name Name of the document to check
 * @returns Promise that resolves to the existing document or null
 */
export async function findExistingDocument(documentType: string, name: string): Promise<any> {
  return VTTDocument.findOne({
    pluginId: config.id,
    documentType,
    'data.name': name
  });
}

/**
 * Update an existing document in the database
 * @param document Existing document to update
 * @param data New data to save
 * @param userId User ID to attribute the update to
 * @returns Promise that resolves when the document is saved
 */
export async function updateDocument(document: any, data: any, userId: string): Promise<void> {
  document.data = data;
  document.updatedBy = userId;
  await document.save();
}

/**
 * Create a new document in the database
 * @param documentType Type of document to create
 * @param name Name of the document
 * @param data Data to save
 * @param userId User ID to attribute creation to
 * @returns Promise that resolves when the document is created
 */
export async function createDocument(documentType: string, name: string, data: any, userId: string): Promise<void> {
  await VTTDocument.create({
    documentType,
    pluginId: config.id,
    name,
    data,
    createdBy: userId,
    updatedBy: userId
  });
}

/**
 * Generic import function that helps reduce boilerplate
 * @param options Import options
 * @returns Promise that resolves when import is complete
 */
export async function runImport<T>({
  documentType,
  dataFile,
  dataKey,
  converter,
  sourceFilter = 'XPHB',
  dirPath,
}: {
  documentType: string;
  dataFile: string;
  dataKey: string;
  converter: (data: any) => T;
  sourceFilter?: string | ((source: string) => boolean);
  dirPath: string;
}): Promise<void> {
  try {
    // Connect to database
    await connectToDatabase();
    
    // Get user ID
    const userId = await getFirstUserId();
    
    // Read data file
    const data = await read5eToolsData(dirPath, dataFile);
    
    // Extract items array
    const items = data[dataKey] || [];
    console.log(`Found ${items.length} ${documentType} entries in source file`);
    
    // Filter items by source
    const filteredItems = items.filter((item: any) => {
      if (typeof sourceFilter === 'function') {
        return sourceFilter(item.source);
      }
      return item.source === sourceFilter;
    });
    
    const sourceDescription = typeof sourceFilter === 'function' ? 'filtered' : sourceFilter;
    console.log(`Found ${filteredItems.length} ${sourceDescription} ${documentType} entries to import`);
    
    // Stats for reporting
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each item
    for (const item of filteredItems) {
      try {
        // Convert data
        const normalizedData = converter(item) as T;
        
        // Skip if no valid data
        if (!normalizedData || Object.keys(normalizedData).length === 0) {
          console.log(`No valid data for ${documentType}: ${item.name || 'unknown'}`);
          skipped++;
          continue;
        }
        
        const name = (normalizedData as any).name;
        console.log(`Processing ${documentType}: ${name}`);
        
        // Check if document already exists
        const existingDoc = await findExistingDocument(documentType, name);
        
        if (existingDoc) {
          // Update existing document
          await updateDocument(existingDoc, normalizedData, userId);
          updated++;
          console.log(`Updated ${documentType}: ${name}`);
        } else {
          // Create new document
          await createDocument(documentType, name, normalizedData, userId);
          imported++;
          console.log(`Imported ${documentType}: ${name}`);
        }
      } catch (err) {
        console.error(`Error processing ${documentType} ${item.name}:`, err);
        errors++;
      }
    }
    
    // Report results
    console.log('\nImport Summary:');
    console.log(`- Imported: ${imported} new ${documentType} entries`);
    console.log(`- Updated: ${updated} existing ${documentType} entries`);
    console.log(`- Skipped: ${skipped} ${documentType} entries`);
    console.log(`- Errors: ${errors} ${documentType} entries`);
    
  } catch (err) {
    console.error(`Error importing ${documentType}:`, err);
  } finally {
    // Close database connection
    await disconnectFromDatabase();
  }
} 