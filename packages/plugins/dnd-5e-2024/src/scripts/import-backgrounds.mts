import { runImport } from './import-utils.mjs';
import { convert5eToolsBackground } from './convert-5etools-background.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run the import if this script is run directly
if (import.meta.url === (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)) {
  const dataPath = join(__dirname, '../../submodules/5etools-src/data');
  const pluginDataPath = join(__dirname, '../../data');
  
  // Load fluff data before running the import
  const loadFluffData = async () => {
    try {
      const fluffPath = join(pluginDataPath, 'fluff-backgrounds.json');
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
      return runImport({
        documentType: 'background',
        dataFile: 'backgrounds.json',
        dataKey: 'background',
        converter: (data) => convert5eToolsBackground(data, fluffData),
        sourceFilter: 'XPHB',
        dirPath: dataPath
      });
    })
    .catch(console.error);
} 