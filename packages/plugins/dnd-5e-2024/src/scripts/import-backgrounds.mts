/* eslint-disable @typescript-eslint/no-explicit-any */
import { runImportViaAPI } from './import-utils.mjs';
import { convert5eToolsBackground } from './convert-5etools-background.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run the import if this script is run directly
if (
  import.meta.url ===
  (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)
) {
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
      const fluffPath = join(dataPath, 'fluff-backgrounds.json');
      const fluffData = await fs.readFile(fluffPath, 'utf-8');
      return JSON.parse(fluffData);
    } catch (error) {
      console.error('Error loading fluff data:', error);
      return null;
    }
  };

  // Run the import with fluff data
  loadFluffData()
    .then((fluffData) => {
      // First clear existing backgrounds - commented out as per requirements
      // return clearExistingBackgroundsViaAPI(apiBaseUrl, authToken).then(() => {
      return runImportViaAPI({
        documentType: 'background',
        dataFile: 'backgrounds.json',
        dataKey: 'background',
        converter: (data) => convert5eToolsBackground(data, fluffData),
        sourceFilter: 'XPHB',
        dirPath: dataPath,
        apiBaseUrl,
        authToken
      });
      // });
    })
    .catch(console.error);
}
