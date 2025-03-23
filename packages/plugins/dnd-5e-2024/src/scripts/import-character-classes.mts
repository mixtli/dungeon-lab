import { runImport } from './import-utils.mjs';
import { convert5eToolsClass } from './convert-5etools-class.mjs';
import config from '../../manifest.json' with { type: 'json' };
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run the import if this script is run directly
if (import.meta.url === (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)) {
  runImport({
    documentType: 'characterClass',
    dataFile: 'class/class-*.json',
    dataKey: 'class',
    converter: convert5eToolsClass,
    sourceFilter: source => source === 'PHB',
    dirPath: join(__dirname, '../../submodules/5etools-src/data')
  }).catch(console.error);
} 