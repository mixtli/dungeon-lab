/* eslint-disable @typescript-eslint/no-explicit-any */
import { runImportViaAPI, deleteDocumentsViaAPI } from './import-utils.mjs';
import { convert5eToolsSpecies } from './convert-5etools-species.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { extractTextFromEntries } from './converter-utils.mjs';
import config from '../../manifest.json' with { type: 'json' };

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Clear existing species documents for clean import using the REST API
 * @param apiBaseUrl Base URL for the API, defaults to localhost:3000
 * @param authToken Optional authentication token
 * @returns Promise that resolves when deletion is complete
 */
async function clearExistingSpeciesViaAPI(apiBaseUrl = 'http://localhost:3000', authToken?: string): Promise<number> {
  try {
    console.log("Using REST API to clear existing species documents");
    
    const deletedCount = await deleteDocumentsViaAPI('species', config.id, apiBaseUrl, authToken);
    
    return deletedCount;
  } catch (error) {
    console.error("Error clearing existing species:", error);
    return 0;
  }
}

// Run the import if this script is run directly
if (import.meta.url === (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)) {
  const dataPath = join(__dirname, '../../data');
  
  // Configure the API base URL and auth token from environment variables
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const authToken = process.env.API_AUTH_TOKEN; // Optional
  
  // Display initial configuration
  console.log(`Using API URL: ${apiBaseUrl}`);
  console.log(`Authentication: ${authToken ? 'Enabled' : 'Disabled'}`);
  
  // Load fluff data before running the import
  const loadFluffData = async () => {
    try {
      const fluffPath = join(dataPath, 'fluff-races.json');
      const fluffData = await fs.readFile(fluffPath, 'utf-8');
      return JSON.parse(fluffData);
    } catch (error) {
      console.error('Error loading fluff data:', error);
      return null;
    }
  };

  // Run the import with fluff data
  loadFluffData()
    .then(fluffData => {
      // First clear existing species
      // return clearExistingSpeciesViaAPI(apiBaseUrl, authToken).then(() => {
        return runImportViaAPI({
          documentType: 'species',
          dataFile: 'races.json',
          dataKey: 'race',
          converter: (data) => {
            const convertedData = convert5eToolsSpecies(data);
            
            // Find matching fluff entry
            if (fluffData && fluffData.raceFluff) {
              const fluffEntry = fluffData.raceFluff.find((entry: any) => 
                entry.name === data.name && entry.source === data.source
              );
              
              if (fluffEntry && fluffEntry.entries && Array.isArray(fluffEntry.entries)) {
                // Use extractTextFromEntries to handle the nested structure
                const description = extractTextFromEntries(fluffEntry.entries);
                
                if (description) {
                  convertedData.description = description;
                }
              }
            }
            
            return convertedData;
          },
          sourceFilter: 'XPHB',
          dirPath: dataPath,
          apiBaseUrl,
          authToken
        });
      // });
    })
    .catch(console.error);
} 