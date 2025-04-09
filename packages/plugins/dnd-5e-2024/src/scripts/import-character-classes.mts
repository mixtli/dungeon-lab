import { runImport } from './import-utils.mjs';
import { convert5eToolsClass, getClassDescription, NormalizedData } from './convert-5etools-class.mjs';
import config from '../../manifest.json' with { type: 'json' };
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { VTTDocument } from '@dungeon-lab/server/src/features/documents/models/vtt-document.model.mjs';
import { connectToDatabase, disconnectFromDatabase, read5eToolsData } from './import-utils.mjs';

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

/**
 * Convert 5etools class data and add description from fluff
 * @param classData Raw 5etools class data
 * @returns Converted class data with description
 */
async function convertClassWithDescription(classData: any) {
  // Convert the class data using existing converter
  const convertedClass = convert5eToolsClass(classData);
  
  // Create the result object that will include both data and description
  const result: { data: NormalizedData; description?: string } = {
    data: convertedClass
  };
  
  try {
    // Determine which fluff file to load based on the class name
    const dataPath = join(__dirname, '../../data');
    const classNames = Array.isArray(classData.class) 
      ? classData.class.filter((c: any) => c.source === 'XPHB').map((c: any) => c.name)
      : [classData.name];
    
    for (const className of classNames) {
      try {
        // Try to load fluff file for this class
        const fluffFilename = `class/fluff-class-${className.toLowerCase()}.json`;
        const fluffData = await read5eToolsData(dataPath, fluffFilename);
        
        // Get the description using our new function
        const description = getClassDescription(className, 'XPHB', fluffData);
        
        if (description) {
          console.log(`Found description for ${className}`);
          // Add description to the result object at the top level
          result.description = description;
        }
      } catch (err) {
        // Just log and continue if we can't find fluff for a class
        console.log(`No fluff found for class ${className}`);
      }
    }
  } catch (error) {
    console.error("Error loading class fluff:", error);
  }
  
  return result;
}

// Run the import if this script is run directly
if (import.meta.url === (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)) {
  // First clear existing classes, then run the import
  clearExistingClasses().then(() => {
    runImport({
      documentType: 'characterClass',
      dataFile: 'class/class-*.json',
      dataKey: 'class',
      converter: convertClassWithDescription,
      dirPath: join(__dirname, '../../submodules/5etools-src/data')
    }).catch(console.error);
  }).catch(console.error);
} 