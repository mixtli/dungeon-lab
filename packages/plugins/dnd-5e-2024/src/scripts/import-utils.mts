/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import config from '../../manifest.json' with { type: 'json' };
import type { IVTTDocument } from '@dungeon-lab/shared/schemas/vtt-document.schema.mjs';
import fetch from 'node-fetch';
import * as mimeTypes from 'mime-types';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { IUser } from '@dungeon-lab/shared/schemas/user.schema.mjs';
// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
 * Delete all documents of a specific type for a plugin through the REST API
 * 
 * @param documentType Type of document to delete
 * @param pluginId Plugin ID owning the documents
 * @param apiBaseUrl Base URL for the API
 * @param authToken Optional authentication token
 * @returns Promise that resolves when all documents are deleted
 */
export async function deleteDocumentsViaAPI(
  documentType: string, 
  pluginId: string, 
  apiBaseUrl = 'http://localhost:3000',
  authToken?: string
): Promise<number> {
  try {
    // Setup headers with auth token if provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    // First fetch all documents of the given type and plugin
    const searchParams = new URLSearchParams({
      pluginId,
      documentType
    });
    
    const searchResponse = await fetch(`${apiBaseUrl}/api/documents?${searchParams}`, {
      method: 'GET',
      headers
    });
    
    if (!searchResponse.ok) {
      throw new Error(`Failed to search documents: ${searchResponse.statusText}`);
    }
    
    const documents = await searchResponse.json();
    console.log(`Found ${documents.length} ${documentType} documents to delete`);
    
    if (documents.length === 0) {
      return 0;
    }
    
    // Delete each document individually
    let deletedCount = 0;
    
    for (const document of documents) {
      try {
        const deleteResponse = await fetch(`${apiBaseUrl}/api/documents/${document.id}`, {
          method: 'DELETE',
          headers
        });
        
        if (deleteResponse.ok) {
          deletedCount++;
        } else {
          console.error(`Failed to delete document ${document.id}: ${deleteResponse.statusText}`);
        }
      } catch (error) {
        console.error(`Error deleting document ${document.id}:`, error);
      }
    }
    
    console.log(`Deleted ${deletedCount} ${documentType} documents via API`);
    return deletedCount;
  } catch (error) {
    console.error(`Error deleting ${documentType} documents:`, error);
    return 0;
  }
}

/**
 * Upload an image file to the API
 * @param imageFile Path to the image file
 * @param endpoint API endpoint to upload to
 * @param headers Request headers
 * @returns Promise resolving to success status
 */
async function uploadImageToAPI(
  imageFile: string,
  endpoint: string,
  headers: Record<string, string>,
): Promise<boolean> {
  try {
    // Get the file directory based on the type
    const imgDir = join(__dirname, '../../submodules/5etools-img');
    const fullPath = join(imgDir, imageFile);
    
    // Read the image file
    const buffer = await readFile(fullPath);
    
    // Determine content type
    const contentType = mimeTypes.lookup(imageFile) || 'image/jpeg';
    
    // Set content type header
    const imageHeaders = {
      ...headers,
      'Content-Type': contentType
    };
    
    // Upload the image
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: imageHeaders,
      body: buffer
    });
    
    return response.ok;
  } catch (error) {
    console.error(`Failed to upload image ${imageFile}:`, error);
    return false;
  }
}

/**
 * Run an import through the REST API instead of direct MongoDB access
 * 
 * @param options Import options similar to runImport but using REST API for database operations
 * @returns Promise that resolves when the import is complete
 */
export async function runImportViaAPI<T>({
  documentType,
  dataFile,
  dataKey,
  converter,
  sourceFilter,
  dirPath,
  isActor = false,
  isItem = false,
  apiBaseUrl = 'http://localhost:3000',
  authToken
}: {
  documentType: string;
  dataFile: string;
  dataKey: string;
  converter: (data: any) => Promise<T | ActorData | ItemData | IVTTDocument> | (T | ActorData | ItemData | IVTTDocument);
  sourceFilter?: string | ((source: string) => boolean);
  dirPath: string;
  isActor?: boolean;
  isItem?: boolean;
  apiBaseUrl?: string;
  authToken?: string;
}): Promise<void> {
  try {
    // Setup headers with auth token if provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    // Read data file (still need file system access)
    const data = await read5eToolsData(dirPath, dataFile);
    
    // Extract items array
    const items = data[dataKey] || [];
    
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
        
        // Check for _images field to handle separate image uploads
        interface WithImages {
          _images?: Record<string, string>;
        }
        
        const hasImages = convertedData && 
          typeof convertedData === 'object' && 
          '_images' in convertedData && 
          typeof (convertedData as WithImages)._images !== 'undefined';
          
        // Extract images if they exist
        let imagesToUpload: Record<string, string> | undefined;
        if (hasImages) {
          imagesToUpload = { ...(convertedData as WithImages)._images };
          // Remove _images field so it's not included in the API request
          delete (convertedData as WithImages)._images;
        }

        if (isActor) {
          // Handle actor import via API
          const actorData = convertedData as ActorData;
          
          // Check if actor already exists
          try {
            const searchParams = new URLSearchParams({
              name: actorData.name,
              type: actorData.type,
              pluginId: actorData.pluginId
            });
            
            const searchResponse = await fetch(`${apiBaseUrl}/api/actors?${searchParams}`, {
              method: 'GET',
              headers
            });
            
            const searchResults = await searchResponse.json();
            
            let actorId: string | undefined;
            
            if (searchResults && searchResults.length > 0) {
              // Update existing actor
              const existingActor = searchResults[0];
              actorId = existingActor.id;
              
              const updateResponse = await fetch(`${apiBaseUrl}/api/actors/${existingActor.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(actorData)
              });
              
              if (updateResponse.ok) {
                console.log(`Updated ${documentType}: ${item.name}`);
                updated++;
              } else {
                console.error(`Failed to update ${documentType}: ${item.name}`, await updateResponse.text());
                errors++;
                continue; // Skip image upload if actor update fails
              }
            } else {
              // Create new actor
              const createResponse = await fetch(`${apiBaseUrl}/api/actors`, {
                method: 'POST',
                headers,
                body: JSON.stringify(actorData)
              });
              
              if (createResponse.ok) {
                const createdActor = await createResponse.json();
                actorId = createdActor.id;
                console.log(`Created ${documentType}: ${item.name}`);
                created++;
              } else {
                console.error(`Failed to create ${documentType}: ${item.name}`, await createResponse.text());
                errors++;
                continue; // Skip image upload if actor creation fails
              }
            }
            
            // If we have images to upload and the actor was created/updated successfully
            if (imagesToUpload && actorId) {
              // Handle token image upload separately
              if (imagesToUpload.token) {
                console.log(`Uploading token image for ${item.name}...`);
                const success = await uploadImageToAPI(
                  imagesToUpload.token,
                  `${apiBaseUrl}/api/actors/${actorId}/token`,
                  headers
                );
                
                if (success) {
                  console.log(`Token image uploaded for ${item.name}`);
                } else {
                  console.error(`Failed to upload token image for ${item.name}`);
                }
              }
              
              // Handle any other image types in the future
              // For example, portrait, banner, etc.
            }
          } catch (error) {
            console.error(`Error processing actor ${item.name}:`, error);
            errors++;
          }
        } else if (isItem) {
          // Handle item import via API
          const itemData = convertedData as ItemData;
          
          // Check if item already exists
          try {
            const searchParams = new URLSearchParams({
              name: itemData.name,
              type: itemData.type,
              pluginId: itemData.pluginId
            });
            
            const searchResponse = await fetch(`${apiBaseUrl}/api/items?${searchParams}`, {
              method: 'GET',
              headers
            });
            
            const searchResults = await searchResponse.json();
            
            let itemId: string | undefined;
            
            if (searchResults && searchResults.length > 0) {
              // Update existing item
              const existingItem = searchResults[0];
              itemId = existingItem.id;
              
              const updateResponse = await fetch(`${apiBaseUrl}/api/items/${existingItem.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(itemData)
              });
              
              if (updateResponse.ok) {
                console.log(`Updated ${documentType}: ${item.name}`);
                updated++;
              } else {
                console.error(`Failed to update ${documentType}: ${item.name}`, await updateResponse.text());
                errors++;
                continue; // Skip image upload if item update fails
              }
            } else {
              // Create new item
              const createResponse = await fetch(`${apiBaseUrl}/api/items`, {
                method: 'POST',
                headers,
                body: JSON.stringify(itemData)
              });
              
              if (createResponse.ok) {
                const createdItem = await createResponse.json();
                itemId = createdItem.id;
                console.log(`Created ${documentType}: ${item.name}`);
                created++;
              } else {
                console.error(`Failed to create ${documentType}: ${item.name}`, await createResponse.text());
                errors++;
                continue; // Skip image upload if item creation fails
              }
            }
            
            // If we have images to upload and the item was created/updated successfully
            if (imagesToUpload && itemId) {
              // Handle image upload separately
              if (imagesToUpload.image) {
                console.log(`Uploading image for ${item.name}...`);
                const success = await uploadImageToAPI(
                  imagesToUpload.image,
                  `${apiBaseUrl}/api/items/${itemId}/image`,
                  headers
                );
                
                if (success) {
                  console.log(`Image uploaded for ${item.name}`);
                } else {
                  console.error(`Failed to upload image for ${item.name}`);
                }
              }
            }
          } catch (error) {
            console.error(`Error processing item ${item.name}:`, error);
            errors++;
          }
        } else {
          // Handle VTTDocument import via API
          try {
            // Check if document exists with this name and type
            const searchParams = new URLSearchParams({
              pluginId: config.id,
              documentType,
              name: item.name
            });
            
            const searchResponse = await fetch(`${apiBaseUrl}/api/documents?${searchParams}`, {
              method: 'GET',
              headers
            });
            
            const searchResults = await searchResponse.json();
            
            // Prepare document data
            const hasDataStructure = convertedData && 
              typeof convertedData === 'object' && 
              'data' in convertedData && 
              typeof (convertedData as { data: any }).data !== 'undefined';
              
            const documentData = hasDataStructure ? (convertedData as { data: any }).data : convertedData;
            const documentDescription = hasDataStructure 
              ? (convertedData as { description?: string }).description || ''
              : (convertedData as { description?: string }).description || '';
            
            const documentBody = {
              pluginId: config.id,
              documentType,
              name: item.name,
              slug: item.name.toLowerCase().replace(/[^\w-]/g, '-'),
              data: documentData,
              description: documentDescription
            };
            
            if (searchResults && searchResults.length > 0) {
              // Update existing document
              const existingDoc = searchResults[0];
              
              const updateResponse = await fetch(`${apiBaseUrl}/api/documents/${existingDoc.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(documentBody)
              });
              
              if (updateResponse.ok) {
                console.log(`Updated ${documentType}: ${item.name}`);
                updated++;
              } else {
                console.error(`Failed to update ${documentType}: ${item.name}`, await updateResponse.text());
                errors++;
              }
            } else {
              // Create new document
              const createResponse = await fetch(`${apiBaseUrl}/api/documents`, {
                method: 'POST',
                headers,
                body: JSON.stringify(documentBody)
              });
              
              if (createResponse.ok) {
                console.log(`Created ${documentType}: ${item.name}`);
                created++;
              } else {
                console.error(`Failed to create ${documentType}: ${item.name}`, await createResponse.text());
                errors++;
              }
            }
          } catch (error) {
            console.error(`Error processing ${documentType} ${item.name}:`, error);
            errors++;
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
    
  } catch (error) {
    console.error("Fatal error during import:", error);
  }
} 

const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  }
});

async function getAllUsers() {
  const authToken = process.env.API_AUTH_TOKEN;
  const response = await api.get('/api/users', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  return response.data as IUser[];
}
    
const userResponse  = await getAllUsers()
console.log(userResponse);
const users = userResponse.filter((user) => !user.isAdmin);
console.log(users);
function getNextUser() {
  // generator to return the next user.  Loop back to the first user after the last one
  let currentIndex = 0;
  return {
    next: () => {
      const user = users[currentIndex];
      currentIndex = (currentIndex + 1) % users.length;
      return user.id;
    }
  };
}
export const nextUser = getNextUser();
for(let i=0; i<20; i++) {
  console.log(nextUser.next());
}