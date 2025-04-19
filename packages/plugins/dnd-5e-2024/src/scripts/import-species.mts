/* eslint-disable @typescript-eslint/no-explicit-any */
import { runImport } from './import-utils.mjs';
import { convert5eToolsSpecies } from './convert-5etools-species.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { extractTextFromEntries } from './converter-utils.mjs';

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
      const fluffPath = join(pluginDataPath, 'fluff-races.json');
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
        dirPath: dataPath
      });
    })
    .catch(console.error);
} 