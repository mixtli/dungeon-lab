import { readFile, readdir } from 'fs/promises';
import { join, basename } from 'path';
import mongoose from 'mongoose';
import { VTTDocument } from '@dungeon-lab/server/src/features/documents/models/vtt-document.model.mjs';
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

interface ActorData {
  name: string;
  type: string;
  pluginId: string;
  gameSystemId: string;
  data: any;
  token?: string;
}

interface ItemData {
  name: string;
  type: string;
  image?: string;
  description?: string;
  weight?: number;
  cost?: number;
  data: any;
  pluginId: string;
  gameSystemId: string;
}

export async function runImport<T>({
  documentType,
  dataFile,
  dataKey,
  converter,
  sourceFilter,
  dirPath,
  isActor = false,
  isItem = false
}: {
  documentType: string;
  dataFile: string;
  dataKey: string;
  converter: (data: any) => Promise<T | ActorData | ItemData> | (T | ActorData | ItemData);
  sourceFilter?: string | ((source: string) => boolean);
  dirPath: string;
  isActor?: boolean;
  isItem?: boolean;
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
    
    // Filter items by source if a filter is provided
    const filteredItems = sourceFilter 
      ? items.filter((item: any) => {
          if (typeof sourceFilter === 'function') {
            return sourceFilter(item.source);
          }
          return item.source === sourceFilter;
        })
      : items;
    
    const sourceDescription = sourceFilter 
      ? (typeof sourceFilter === 'function' ? 'filtered' : sourceFilter) 
      : 'all';
    console.log(`Found ${filteredItems.length} ${sourceDescription} ${documentType} entries to import`);
    
    // Stats for reporting
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each item
    for (const item of filteredItems) {
      try {
        // Convert the item
        const convertedData = await Promise.resolve(converter(item));
        
        if (!convertedData) {
          console.log(`No valid data for ${documentType}: ${item.name}`);
          skipped++;
          continue;
        }

        if (isItem) {
          // Handle item import
          const { ItemModel } = await import('@dungeon-lab/server/src/features/items/models/item.model.mjs');
          const itemData = convertedData as ItemData;
          const existingItem = await ItemModel.findOne({
            name: itemData.name,
            type: itemData.type,
            pluginId: itemData.pluginId
          });

          if (existingItem) {
            await ItemModel.updateOne(
              { _id: existingItem._id },
              { 
                $set: { 
                  ...itemData,
                  updatedBy: userId
                }
              }
            );
            console.log(`Updated ${documentType}: ${item.name}`);
            updated++;
          } else {
            await ItemModel.create({
              ...itemData,
              createdBy: userId,
              updatedBy: userId
            });
            console.log(`Created ${documentType}: ${item.name}`);
            created++;
          }
        } else if (isActor) {
          // Handle actor import
          const { ActorModel } = await import('@dungeon-lab/server/src/features/actors/models/actor.model.mjs');
          const actorData = convertedData as ActorData;
          const existingActor = await ActorModel.findOne({
            name: actorData.name,
            type: actorData.type,
            pluginId: actorData.pluginId
          });

          if (existingActor) {
            await ActorModel.updateOne(
              { _id: existingActor._id },
              { 
                $set: { 
                  ...actorData,
                  updatedBy: userId
                }
              }
            );
            console.log(`Updated ${documentType}: ${item.name}`);
            updated++;
          } else {
            await ActorModel.create({
              ...actorData,
              createdBy: userId,
              updatedBy: userId
            });
            console.log(`Created ${documentType}: ${item.name}`);
            created++;
          }
        } else {
          // Handle VTTDocument import (existing behavior)
          const existingDoc = await findExistingDocument(documentType, item.name);
          
          if (existingDoc) {
            await updateDocument(existingDoc, convertedData as T, userId);
            console.log(`Updated ${documentType}: ${item.name}`);
            updated++;
          } else {
            await createDocument(documentType, item.name, convertedData as T, userId);
            console.log(`Created ${documentType}: ${item.name}`);
            created++;
          }
        }
      } catch (error) {
        console.error(`Error processing ${documentType} ${item.name}:`, error);
        errors++;
      }
    }
    
    // Print import summary
    console.log('\nImport Summary:');
    console.log(`- Created: ${created} new ${documentType} entries`);
    console.log(`- Updated: ${updated} existing ${documentType} entries`);
    console.log(`- Skipped: ${skipped} ${documentType} entries`);
    console.log(`- Errors: ${errors} ${documentType} entries`);
    
  } finally {
    // Always disconnect from database
    await disconnectFromDatabase();
  }
} 