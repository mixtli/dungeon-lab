/* eslint-disable @typescript-eslint/no-explicit-any */
import { read5eToolsData } from './import-utils.mjs';
import { convert5eToolsSpecies } from './convert-5etools-species.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { extractTextFromEntries } from './converter-utils.mjs';
import { DocumentsClient, configureApiClient } from '@dungeon-lab/client/index.mjs';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Import species using DocumentsClient
 */
async function importSpecies(apiBaseUrl: string, authToken?: string): Promise<void> {
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
      const fluffPath = join(dataPath, 'fluff-races.json');
      const fluffDataRaw = await fs.readFile(fluffPath, 'utf-8');
      fluffData = JSON.parse(fluffDataRaw);
      console.log('Loaded fluff data for species');
    } catch (error) {
      console.error('Error loading fluff data:', error);
    }

    // Read the species data
    const speciesData = await read5eToolsData(dataPath, 'races.json');

    // Extract species array
    const speciesArray = speciesData.race || [];

    // Filter species by source
    const sourceFilter = 'XPHB';
    const filteredSpecies = speciesArray.filter((item: any) => item.source === sourceFilter);

    console.log(`Found ${filteredSpecies.length} species to import`);

    // Process each species
    for (const speciesItem of filteredSpecies) {
      try {
        console.log(`Processing species: ${speciesItem.name}`);

        // Convert the species data
        const convertedData = convert5eToolsSpecies(speciesItem);

        if (!convertedData) {
          console.log(`No valid data for species: ${speciesItem.name}`);
          skipped++;
          continue;
        }

        // Add fluff description if available
        if (fluffData && fluffData.raceFluff) {
          const fluffEntry = fluffData.raceFluff.find(
            (entry: any) => entry.name === speciesItem.name && entry.source === speciesItem.source
          );

          if (fluffEntry && fluffEntry.entries && Array.isArray(fluffEntry.entries)) {
            // Use extractTextFromEntries to handle the nested structure
            const description = extractTextFromEntries(fluffEntry.entries);

            if (description) {
              convertedData.description = description;
            }
          }
        }

        // Prepare document data
        const documentData = {
          documentType: 'species',
          name: convertedData.name,
          pluginId: 'dnd-5e-2024',
          // Add a slug field - lowercase version of name with spaces replaced by hyphens
          slug: convertedData.name.toLowerCase().replace(/\s+/g, '-'),
          description: convertedData.description || '',
          // Data field should contain the converted species data
          data: convertedData
        };

        // Check if the document already exists
        const existingDocs = await documentsClient.getDocuments({
          documentType: 'species',
          name: documentData.name,
          pluginId: 'dnd-5e-2024'
        });

        let docId: string | undefined;

        if (existingDocs && existingDocs.length > 0) {
          // Update existing document
          docId = existingDocs[0].id;
          await documentsClient.patchDocument(docId, documentData);
          console.log(`Updated species: ${documentData.name}`);
          updated++;
        } else {
          // Create new document
          const createdDoc = await documentsClient.createDocument(documentData);
          if (createdDoc) {
            docId = createdDoc.id;
            console.log(`Created species: ${documentData.name}`);
            created++;
          } else {
            console.error(`Failed to create species: ${documentData.name}`);
            errors++;
          }
        }
      } catch (error) {
        console.error(`Error processing species ${speciesItem.name}:`, error);
        errors++;
      }
    }

    // Print import summary
    console.log('\nSpecies Import Summary:');
    console.log(`- Created: ${created} new species`);
    console.log(`- Updated: ${updated} existing species`);
    console.log(`- Skipped: ${skipped} species`);
    console.log(`- Errors: ${errors} species`);
  } catch (error) {
    console.error('Error importing species:', error);
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
  importSpecies(apiBaseUrl, authToken)
    .then(() => {
      console.log('Species import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Species import failed:', error);
      process.exit(1);
    });
}
