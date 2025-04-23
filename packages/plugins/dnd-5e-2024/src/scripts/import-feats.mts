/* eslint-disable @typescript-eslint/no-explicit-any */
import { runImportViaAPI } from './import-utils.mjs';
import { convert5eToolsFeat } from './convert-5etools-feat.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
