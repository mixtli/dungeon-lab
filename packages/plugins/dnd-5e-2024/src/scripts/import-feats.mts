/* eslint-disable @typescript-eslint/no-explicit-any */
import { runImportViaAPI, deleteDocumentsViaAPI } from './import-utils.mjs';
import { convert5eToolsFeat } from './convert-5etools-feat.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from '../../manifest.json' with { type: 'json' };

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Clear existing feat documents for clean import using the REST API
 * @param apiBaseUrl Base URL for the API, defaults to localhost:3000
 * @param authToken Optional authentication token
 * @returns Promise that resolves when deletion is complete
 */
async function _clearExistingFeatsViaAPI(apiBaseUrl = 'http://localhost:3000', authToken?: string): Promise<number> {
  try {
    console.log("Using REST API to clear existing feat documents");
    
    const deletedCount = await deleteDocumentsViaAPI('feat', config.id, apiBaseUrl, authToken);
    
    return deletedCount;
  } catch (error) {
    console.error("Error clearing existing feats:", error);
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
  
  // First clear existing feats - commented out as per requirements
  // return _clearExistingFeatsViaAPI(apiBaseUrl, authToken).then(() => {
    runImportViaAPI({
      documentType: 'feat',
      dataFile: 'feats.json',
      dataKey: 'feat',
      converter: convert5eToolsFeat,
      sourceFilter: 'XPHB',
      dirPath: dataPath,
      apiBaseUrl,
      authToken
    }).catch(console.error);
  // });
} 