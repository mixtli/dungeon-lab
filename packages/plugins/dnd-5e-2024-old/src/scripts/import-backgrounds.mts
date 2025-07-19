/* eslint-disable @typescript-eslint/no-explicit-any */
import { read5eToolsData } from './import-utils.mjs';
import { convert5eToolsBackground } from './convert-5etools-background.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { DocumentsClient, configureApiClient } from '@dungeon-lab/client/index.mjs';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Import backgrounds using DocumentsClient
 */
async function importBackgrounds(apiBaseUrl: string, authToken?: string): Promise<void> {
  try {
    // Configure API client
    configureApiClient(apiBaseUrl, authToken);

    // Create DocumentsClient
    const documentsClient = new DocumentsClient();

    // Stats for reporting
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    const dataPath = join(__dirname, '../../data');

    // Load fluff data
    let fluffData = null;
    try {
      const fluffPath = join(dataPath, 'fluff-backgrounds.json');
      const fluffDataRaw = await fs.readFile(fluffPath, 'utf-8');
      fluffData = JSON.parse(fluffDataRaw);
      console.log('Loaded fluff data for backgrounds');
    } catch (error) {
      console.error('Error loading fluff data:', error);
    }

    // Read the backgrounds data
    const backgroundsData = await read5eToolsData(dataPath, 'backgrounds.json');

    // Extract backgrounds array
    const backgroundsArray = backgroundsData.background || [];

    // Filter backgrounds by source
    const sourceFilter = 'XPHB';
    const filteredBackgrounds = backgroundsArray.filter(
      (item: any) => item.source === sourceFilter
    );

    console.log(`Found ${filteredBackgrounds.length} backgrounds to import`);

    // Process each background
    for (const backgroundItem of filteredBackgrounds) {
      try {
        console.log(`Processing background: ${backgroundItem.name}`);

        // Convert the background data
        const convertedData = convert5eToolsBackground(backgroundItem, fluffData);

        if (!convertedData) {
          console.log(`No valid data for background: ${backgroundItem.name}`);
          skipped++;
          continue;
        }

        // Prepare document data
        const documentData = {
          documentType: 'background',
          name: convertedData.name,
          pluginId: 'dnd-5e-2024-old',
          // Add a slug field - lowercase version of name with spaces replaced by hyphens
          slug: convertedData.name.toLowerCase().replace(/\s+/g, '-'),
          description: convertedData.description || '',
          // Data field should contain the converted background data
          data: convertedData
        };

        // Check if the document already exists
        const existingDocs = await documentsClient.getDocuments({
          documentType: 'background',
          name: documentData.name,
          pluginId: 'dnd-5e-2024-old'
        });

        let docId: string | undefined;

        if (existingDocs && existingDocs.length > 0) {
          // Update existing document
          docId = existingDocs[0].id;
          await documentsClient.patchDocument(docId, documentData);
          console.log(`Updated background: ${documentData.name}`);
          updated++;
        } else {
          // Create new document
          const createdDoc = await documentsClient.createDocument(documentData);
          if (createdDoc) {
            docId = createdDoc.id;
            console.log(`Created background: ${documentData.name}`);
            created++;
          } else {
            console.error(`Failed to create background: ${documentData.name}`);
            errors++;
          }
        }
      } catch (error) {
        console.error(`Error processing background ${backgroundItem.name}:`, error);
        errors++;
      }
    }

    // Print import summary
    console.log('\nBackgrounds Import Summary:');
    console.log(`- Created: ${created} new backgrounds`);
    console.log(`- Updated: ${updated} existing backgrounds`);
    console.log(`- Skipped: ${skipped} backgrounds`);
    console.log(`- Errors: ${errors} backgrounds`);
  } catch (error) {
    console.error('Error importing backgrounds:', error);
    throw error;
  }
}

// Run the import if this script is run directly
if (
  import.meta.url ===
  (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)
) {
  // Configure the API base URL and auth token from environment variables
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const authToken = process.env.API_AUTH_TOKEN; // Optional

  // Display initial configuration
  console.log(`Using API URL: ${apiBaseUrl}`);
  console.log(`Authentication: ${authToken ? 'Enabled' : 'Disabled'}`);

  // Run the import
  importBackgrounds(apiBaseUrl, authToken)
    .then(() => {
      console.log('Backgrounds import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Backgrounds import failed:', error);
      process.exit(1);
    });
}
