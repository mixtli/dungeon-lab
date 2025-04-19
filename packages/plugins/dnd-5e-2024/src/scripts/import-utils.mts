/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import mongoose from 'mongoose';
import { VTTDocument } from '@dungeon-lab/server/src/features/documents/models/vtt-document.model.mjs';
import { pluginRegistry } from '@dungeon-lab/server/src/services/plugin-registry.service.mjs';
import config from '../../manifest.json' with { type: 'json' };
import type { IVTTDocument } from '@dungeon-lab/shared/schemas/vtt-document.schema.mjs';

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
  console.log("processing class files");
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
  
  // For class files, we'll collect all classes with source = XPHB
  const xphbClasses = [];
  // Also collect subclasses, classFeatures, and subclassFeatures
  const xphbSubclasses = [];
  const xphbClassFeatures = [];
  const xphbSubclassFeatures = [];
  
  for (const file of matchingFiles) {
    const filePath = join(directory, file);
    const fileData = JSON.parse(await readFile(filePath, 'utf-8'));
    
    // Process classes
    if (fileData.class && Array.isArray(fileData.class)) {
      // Find all classes with source = XPHB
      const xphbClassesInFile = fileData.class.filter((cls: any) => cls.source === 'XPHB');
      if (xphbClassesInFile.length > 0) {
        xphbClasses.push(...xphbClassesInFile);
        //console.log(`Read class data from ${file}`);
      }
    }
    
    // Process subclasses if present
    if (fileData.subclass && Array.isArray(fileData.subclass)) {
      // Find all subclasses with source = XPHB
      const xphbSubclassesInFile = fileData.subclass.filter((sc: any) => sc.source === 'XPHB');
      if (xphbSubclassesInFile.length > 0) {
        xphbSubclasses.push(...xphbSubclassesInFile);
        //console.log(`Read ${xphbSubclassesInFile.length} subclass(es) from ${file}`);
      }
    }
    
    // Process class features if present
    if (fileData.classFeature && Array.isArray(fileData.classFeature)) {
      const xphbClassFeaturesInFile = fileData.classFeature.filter((f: any) => f.classSource === 'XPHB');
      if (xphbClassFeaturesInFile.length > 0) {
        xphbClassFeatures.push(...xphbClassFeaturesInFile);
        //console.log(`Read ${xphbClassFeaturesInFile.length} class feature(s) from ${file}`);
      }
    }
    
    // Process subclass features if present
    if (fileData.subclassFeature && Array.isArray(fileData.subclassFeature)) {
      const xphbSubclassFeaturesInFile = fileData.subclassFeature.filter((f: any) => f.classSource === 'XPHB');
      if (xphbSubclassFeaturesInFile.length > 0) {
        xphbSubclassFeatures.push(...xphbSubclassFeaturesInFile);
        //console.log(`Read ${xphbSubclassFeaturesInFile.length} subclass feature(s) from ${file}`);
      }
    }
  }
  
  // Return all collected data
  return {
    class: xphbClasses,
    subclass: xphbSubclasses,
    classFeature: xphbClassFeatures,
    subclassFeature: xphbSubclassFeatures
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
  // Update document fields
  document.data = data;
  document.updatedBy = userId;
  
  // Save to trigger validators
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
  const document = new VTTDocument({
    documentType,
    pluginId: config.id,
    name,
    data,
    createdBy: userId,
    updatedBy: userId
  });
  
  // Save to trigger validators
  await document.save();
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
  converter: (data: any) => Promise<T | ActorData | ItemData | IVTTDocument> | (T | ActorData | ItemData | IVTTDocument);
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
    //console.log(`Found ${items.length} ${documentType} entries in source file`);
    
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
            // Update fields and save to trigger validation
            Object.assign(existingItem, {
              ...itemData,
              updatedBy: userId
            });
            await existingItem.save();
            console.log(`Updated ${documentType}: ${item.name}`);
            updated++;
          } else {
            // Create new item and save to trigger validation
            const newItem = new ItemModel({
              ...itemData,
              createdBy: userId,
              updatedBy: userId
            });
            await newItem.save();
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
            // Update fields and save to trigger validation
            Object.assign(existingActor, {
              ...actorData,
              updatedBy: userId
            });
            await existingActor.save();
            console.log(`Updated ${documentType}: ${item.name}`);
            updated++;
          } else {
            // Create new actor and save to trigger validation
            const newActor = new ActorModel({
              ...actorData,
              createdBy: userId,
              updatedBy: userId
            });
            await newActor.save();
            console.log(`Created ${documentType}: ${item.name}`);
            created++;
          }
        } else {
          // Handle VTTDocument import with save() to trigger validation
          const existingDoc = await VTTDocument.findOne({
            pluginId: config.id,
            documentType,
            name: item.name
          });

          console.log(`Checking for existing ${documentType}: ${item.name}`);
          
          // Check if convertedData has a structure with both data and description properties
          interface DataWithDescription {
            data: any;
            description?: string;
          }
          
          const hasDataStructure = convertedData && 
            typeof convertedData === 'object' && 
            'data' in convertedData && 
            typeof (convertedData as DataWithDescription).data !== 'undefined';
            
          const documentData = hasDataStructure ? (convertedData as DataWithDescription).data : convertedData;
          const documentDescription = hasDataStructure 
            ? (convertedData as DataWithDescription).description || ''
            : (convertedData as IVTTDocument).description || '';
          
          if (existingDoc) {
            console.log(`Found existing document with id: ${existingDoc._id}`);
            // Update existing document and save
            existingDoc.name = item.name;
            existingDoc.data = documentData;
            existingDoc.description = documentDescription;
            existingDoc.updatedBy = userId;
            await existingDoc.save();
            console.log(`Updated ${documentType}: ${item.name}`);
            updated++;
          } else {
            // Create new document and save
            const newDoc = new VTTDocument({
              pluginId: config.id,
              documentType,
              name: item.name,
              data: documentData,
              description: documentDescription,
              createdBy: userId,
              updatedBy: userId
            });
            await newDoc.save();
            console.log(`Created ${documentType}: ${item.name}`);
            created++;
          }
        }
      } catch (error) {
        console.error(`Error processing ${documentType} ${item.name}:`, (error as Error).stack);
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