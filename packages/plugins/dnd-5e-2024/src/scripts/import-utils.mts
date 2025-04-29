/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import type { IVTTDocument } from '@dungeon-lab/shared/schemas/vtt-document.schema.mjs';
import * as mimeTypes from 'mime-types';
import { fileURLToPath } from 'url';
// Import client classes
import {
  configureApiClient,
  ActorsClient,
  ItemsClient,
  DocumentsClient
} from '@dungeon-lab/client/index.mjs';

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
    const patternParts = filePattern
      .split('*')
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`^${patternParts.join('.*')}$`);

    // Read all files in the directory
    const files = await readdir(directory);

    // Find matching files
    const matchingFiles = files.filter((file) => pattern.test(file));

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
  console.log('processing class files');
  const patternParts = filePattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`^${patternParts.join('.*')}$`);

  // Read all files in the directory
  const files = await readdir(directory);

  // Find matching files
  const matchingFiles = files.filter((file) => pattern.test(file));

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
      const xphbClassFeaturesInFile = fileData.classFeature.filter(
        (f: any) => f.classSource === 'XPHB'
      );
      if (xphbClassFeaturesInFile.length > 0) {
        xphbClassFeatures.push(...xphbClassFeaturesInFile);
        //console.log(`Read ${xphbClassFeaturesInFile.length} class feature(s) from ${file}`);
      }
    }

    // Process subclass features if present
    if (fileData.subclassFeature && Array.isArray(fileData.subclassFeature)) {
      const xphbSubclassFeaturesInFile = fileData.subclassFeature.filter(
        (f: any) => f.classSource === 'XPHB'
      );
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
 * Delete all documents of a specific type for a plugin through the client
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
    // Configure API client
    configureApiClient(apiBaseUrl);

    // Create DocumentsClient instance
    const documentsClient = new DocumentsClient({
      baseURL: apiBaseUrl,
      apiKey: authToken
    });

    // First fetch all documents of the given type and plugin
    const documents = await documentsClient.getDocuments({
      pluginId,
      documentType
    });

    console.log(`Found ${documents.length} ${documentType} documents to delete`);

    if (documents.length === 0) {
      return 0;
    }

    // Delete each document individually
    let deletedCount = 0;

    for (const document of documents) {
      try {
        await documentsClient.deleteDocument(document.id);
        deletedCount++;
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
 * @param apiBaseUrl Base URL for the API
 * @param authToken Optional authentication token
 * @returns Promise resolving to success status
 */
async function uploadImageToAPI(
  imageFile: string,
  entityId: string,
  entityType: 'actor' | 'item',
  imageType: 'token' | 'image' | 'avatar',
  apiBaseUrl: string,
  authToken?: string
): Promise<boolean> {
  try {
    // Get the file directory based on the type
    const imgDir = join(__dirname, '../../submodules/5etools-img');
    const fullPath = join(imgDir, imageFile);

    // Read the image file
    const buffer = await readFile(fullPath);

    // Create a File object from the buffer
    const contentType = mimeTypes.lookup(imageFile) || 'image/jpeg';
    const file = new File([buffer], imageFile.split('/').pop() || 'image.jpg', {
      type: contentType
    });

    // Configure API client
    configureApiClient(apiBaseUrl);

    // Use the appropriate client based on entity type
    if (entityType === 'actor') {
      const actorsClient = new ActorsClient({
        baseURL: apiBaseUrl,
        apiKey: authToken
      });

      if (imageType === 'token') {
        await actorsClient.uploadActorToken(entityId, file);
        return true;
      } else if (imageType === 'avatar') {
        await actorsClient.uploadActorAvatar(entityId, file);
        return true;
      }
    } else if (entityType === 'item') {
      // Currently the ItemsClient might not have a direct method for image upload
      // This would need to be implemented in the client if not available
      console.warn('Image upload for items via client not yet implemented');
    }

    return false;
  } catch (error) {
    console.error(`Failed to upload image ${imageFile}:`, error);
    return false;
  }
}

/**
 * Run an import through the client API instead of direct MongoDB access
 *
 * @param options Import options similar to runImport but using client for database operations
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
  converter: (
    data: any
  ) => Promise<T | ActorData | ItemData | IVTTDocument> | (T | ActorData | ItemData | IVTTDocument);
  sourceFilter?: string | ((source: string) => boolean);
  dirPath: string;
  isActor?: boolean;
  isItem?: boolean;
  apiBaseUrl?: string;
  authToken?: string;
}): Promise<void> {
  try {
    // Configure API client
    configureApiClient(apiBaseUrl);

    // Create client instances
    const actorsClient = isActor
      ? new ActorsClient({
          baseURL: apiBaseUrl,
          apiKey: authToken
        })
      : null;

    const itemsClient = isItem
      ? new ItemsClient({
          baseURL: apiBaseUrl,
          apiKey: authToken
        })
      : null;

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
      ? typeof sourceFilter === 'function'
        ? 'filtered'
        : sourceFilter
      : 'all';
    console.log(
      `Found ${filteredItems.length} ${sourceDescription} ${documentType} entries to import`
    );

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

        const hasImages =
          convertedData &&
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

        if (isActor && actorsClient) {
          // Handle actor import via client
          const actorData = convertedData as ActorData;

          // Check if actor already exists by searching
          try {
            // Get all actors and filter manually by criteria
            const allActors = await actorsClient.getActors();
            const existingActor = allActors.find(
              (actor: any) =>
                actor.name === actorData.name &&
                actor.type === actorData.type &&
                actor.pluginId === actorData.pluginId
            );

            let actorId: string | undefined;

            if (existingActor) {
              // Update existing actor
              actorId = existingActor.id;

              try {
                await actorsClient.updateActor(existingActor.id, actorData);
                console.log(`Updated ${documentType}: ${item.name}`);
                updated++;
              } catch (error) {
                console.error(`Failed to update ${documentType}: ${item.name}`, error);
                errors++;
                continue; // Skip image upload if actor update fails
              }
            } else {
              // Create new actor
              try {
                const createdActor = await actorsClient.createActor(actorData);
                if (createdActor) {
                  actorId = createdActor.id;
                  console.log(`Created ${documentType}: ${item.name}`);
                  created++;
                } else {
                  console.error(
                    `Failed to create ${documentType}: ${item.name} - No actor returned`
                  );
                  errors++;
                  continue;
                }
              } catch (error) {
                console.error(`Failed to create ${documentType}: ${item.name}`, error);
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
                  actorId,
                  'actor',
                  'token',
                  apiBaseUrl,
                  authToken
                );

                if (success) {
                  console.log(`Token image uploaded for ${item.name}`);
                } else {
                  console.error(`Failed to upload token image for ${item.name}`);
                }
              }

              // Handle avatar image if present
              if (imagesToUpload.avatar) {
                console.log(`Uploading avatar image for ${item.name}...`);
                const success = await uploadImageToAPI(
                  imagesToUpload.avatar,
                  actorId,
                  'actor',
                  'avatar',
                  apiBaseUrl,
                  authToken
                );

                if (success) {
                  console.log(`Avatar image uploaded for ${item.name}`);
                } else {
                  console.error(`Failed to upload avatar image for ${item.name}`);
                }
              }
            }
          } catch (error) {
            console.error(`Error processing actor ${item.name}:`, error);
            errors++;
          }
        } else if (isItem && itemsClient) {
          // Handle item import via client
          const itemData = convertedData as ItemData;

          // Check if item already exists
          try {
            // Get all items and filter manually
            const allItems = await itemsClient.getItems();
            const existingItem = allItems.find(
              (item) =>
                item.name === itemData.name &&
                item.type === itemData.type &&
                item.pluginId === itemData.pluginId
            );

            let itemId: string | undefined;

            if (existingItem) {
              // Update existing item
              itemId = existingItem.id;

              // Need to remove image field if it's a string URL
              const { image: _imageUrl, ...itemDataWithoutImage } = itemData;

              try {
                await itemsClient.updateItem(existingItem.id, itemDataWithoutImage);
                console.log(`Updated ${documentType}: ${item.name}`);
                updated++;
              } catch (error) {
                console.error(`Failed to update ${documentType}: ${item.name}`, error);
                errors++;
                continue; // Skip image upload if item update fails
              }
            } else {
              // Create new item
              try {
                // Need to remove image field if it's a string URL
                const { image: _imageUrl, ...itemDataWithoutImage } = itemData;

                const createdItem = await itemsClient.createItem(itemDataWithoutImage);
                if (createdItem) {
                  itemId = createdItem.id;
                  console.log(`Created ${documentType}: ${item.name}`);
                  created++;
                } else {
                  console.error(
                    `Failed to create ${documentType}: ${item.name} - No item returned`
                  );
                  errors++;
                  continue;
                }
              } catch (error) {
                console.error(`Failed to create ${documentType}: ${item.name}`, error);
                errors++;
                continue; // Skip image upload if item creation fails
              }
            }

            // If we have images to upload and the item was created/updated successfully
            // Currently the client doesn't support direct image uploads for items
            if (imagesToUpload && itemId) {
              console.log(
                `Image upload for items via client not yet implemented, skipping images for ${item.name}`
              );
            }
          } catch (error) {
            console.error(`Error processing item ${item.name}:`, error);
            errors++;
          }
        } else {
          // For now, skip non-actor, non-item documents
          console.log(`Skipping unsupported document type: ${documentType}`);
          skipped++;
        }
      } catch (error) {
        console.error(`Error processing ${documentType} ${item.name}:`, error);
        errors++;
      }
    }

    // Print import summary
    console.log(`\n${documentType} Import Summary:`);
    console.log(`- Created: ${created} new entries`);
    console.log(`- Updated: ${updated} existing entries`);
    console.log(`- Skipped: ${skipped} entries`);
    console.log(`- Errors: ${errors} entries`);
  } catch (error) {
    console.error(`Error importing ${documentType}:`, error);
  }
}
