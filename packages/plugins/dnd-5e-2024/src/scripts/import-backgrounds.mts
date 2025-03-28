import { runImport } from './import-utils.mjs';
import { convert5eToolsBackground } from './convert-5etools-background.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run the import if this script is run directly
if (import.meta.url === (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)) {
  runImport({
    documentType: 'background',
    dataFile: 'backgrounds.json',
    dataKey: 'background',
    converter: convert5eToolsBackground,
    sourceFilter: 'XPHB',
    dirPath: join(__dirname, '../../submodules/5etools-src/data')
  }).catch(console.error);
} 