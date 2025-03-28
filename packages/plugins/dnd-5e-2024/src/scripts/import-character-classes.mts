import { runImport } from './import-utils.mjs';
import { convert5eToolsClass } from './convert-5etools-class.mjs';
import config from '../../manifest.json' with { type: 'json' };
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { VTTDocument } from '@dungeon-lab/server/src/features/documents/models/vtt-document.model.mjs';
import { connectToDatabase, disconnectFromDatabase } from './import-utils.mjs';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Clear existing character class documents for clean import
 */
async function clearExistingClasses() {
  try {
    await connectToDatabase();
    console.log("Connected to database to clear existing class documents");
    
    const result = await VTTDocument.deleteMany({
      pluginId: config.id,
      documentType: 'characterClass'
    });
    
    console.log(`Deleted ${result.deletedCount} existing character class documents`);
  } catch (error) {
    console.error("Error clearing existing classes:", error);
  } finally {
    await disconnectFromDatabase();
  }
}

// Run the import if this script is run directly
if (import.meta.url === (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)) {
  // First clear existing classes, then run the import
  clearExistingClasses().then(() => {
    runImport({
      documentType: 'characterClass',
      dataFile: 'class/class-*.json',
      dataKey: 'class',
      converter: convert5eToolsClass,
      dirPath: join(__dirname, '../../submodules/5etools-src/data')
    }).catch(console.error);
  }).catch(console.error);
} 