/* eslint-disable @typescript-eslint/no-explicit-any */
import { read5eToolsData } from './import-utils.mjs';
import { convert5eToolsFeat } from './convert-5etools-feat.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DocumentsClient, configureApiClient } from '@dungeon-lab/client/index.mjs';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define a type for the converted feat to use for type checking
interface ConvertedFeat {
  name: string;
  description: string;
  category?: string;
  ability?: any[];
  prerequisites?: {
    ability?: Record<string, number>;
    race?: string[];
    class?: string[];
    level?: number;
    spellcasting?: boolean;
    other?: string;
  };
  benefits: Array<{
    name: string;
    description: string;
  }>;
}

/**
 * Import feats using DocumentsClient
 */
async function importFeats(apiBaseUrl: string, authToken?: string): Promise<void> {
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

    // Read the feats data
    const featsData = await read5eToolsData(dataPath, 'feats.json');

    // Extract feats array
    const featsArray = featsData.feat || [];

    // Filter feats by source
    const sourceFilter = 'XPHB';
    const filteredFeats = featsArray.filter((item: any) => item.source === sourceFilter);

    console.log(`Found ${filteredFeats.length} feats to import`);

    // Process each feat
    for (const featItem of filteredFeats) {
      try {
        console.log(`Processing feat: ${featItem.name}`);

        // Convert the feat data with proper typing
        const convertedData = convert5eToolsFeat(featItem) as ConvertedFeat;

        if (!convertedData) {
          console.log(`No valid data for feat: ${featItem.name}`);
          skipped++;
          continue;
        }

        // Fix the ability format in prerequisites - API expects a flat structure not objects with indices
        if (
          convertedData.prerequisites?.ability &&
          typeof convertedData.prerequisites.ability === 'object'
        ) {
          // Check if it's using numeric keys (like "0": {"dex": 13})
          const keys = Object.keys(convertedData.prerequisites.ability);
          if (keys.length > 0 && /^\d+$/.test(keys[0])) {
            // Extract the first ability object and use it directly
            const firstKey = keys[0];
            // Get the ability object and cast to the right type
            const abilityObj = (convertedData.prerequisites.ability as any)[firstKey];
            if (abilityObj && typeof abilityObj === 'object') {
              convertedData.prerequisites.ability = abilityObj as Record<string, number>;
            }
          }
        }

        // Prepare document data
        const documentData = {
          documentType: 'feat',
          name: convertedData.name,
          pluginId: 'dnd-5e-2024',
          // Add a slug field - lowercase version of name with spaces replaced by hyphens
          slug: convertedData.name.toLowerCase().replace(/\s+/g, '-'),
          description: convertedData.description || '',
          // Data field should contain the converted feat data
          data: convertedData
        };

        // Check if the document already exists
        const existingDocs = await documentsClient.getDocuments({
          documentType: 'feat',
          name: documentData.name,
          pluginId: 'dnd-5e-2024'
        });

        let docId: string | undefined;

        if (existingDocs && existingDocs.length > 0) {
          // Update existing document
          docId = existingDocs[0].id;
          await documentsClient.patchDocument(docId, documentData);
          console.log(`Updated feat: ${documentData.name}`);
          updated++;
        } else {
          // Create new document
          const createdDoc = await documentsClient.createDocument(documentData);
          if (createdDoc) {
            docId = createdDoc.id;
            console.log(`Created feat: ${documentData.name}`);
            created++;
          } else {
            console.error(`Failed to create feat: ${documentData.name}`);
            errors++;
          }
        }
      } catch (error) {
        console.error(`Error processing feat ${featItem.name}:`, error);
        errors++;
      }
    }

    // Print import summary
    console.log('\nFeats Import Summary:');
    console.log(`- Created: ${created} new feats`);
    console.log(`- Updated: ${updated} existing feats`);
    console.log(`- Skipped: ${skipped} feats`);
    console.log(`- Errors: ${errors} feats`);
  } catch (error) {
    console.error('Error importing feats:', error);
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
  importFeats(apiBaseUrl, authToken)
    .then(() => {
      console.log('Feats import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Feats import failed:', error);
      process.exit(1);
    });
}
