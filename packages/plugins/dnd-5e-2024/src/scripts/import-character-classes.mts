/* eslint-disable @typescript-eslint/no-explicit-any */
import { runImportViaAPI, deleteDocumentsViaAPI, read5eToolsData } from './import-utils.mjs';
import { 
  convert5eToolsClass, 
  getClassDescription, 
  getSubclassesForClass 
} from './convert-5etools-class.mjs';
import type { ICharacterClassData } from '../shared/types/character-class.mjs';
import { toLowercase } from './converter-utils.mjs';
import config from '../../manifest.json' with { type: 'json' };
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Clear existing character class documents for clean import using the REST API
 * @param apiBaseUrl Base URL for the API, defaults to localhost:3000
 * @param authToken Optional authentication token
 * @returns Promise that resolves when deletion is complete
 */
async function clearExistingClassesViaAPI(apiBaseUrl = 'http://localhost:3000', authToken?: string): Promise<number> {
  try {
    console.log("Using REST API to clear existing class documents");
    
    const deletedCount = await deleteDocumentsViaAPI('characterClass', config.id, apiBaseUrl, authToken);
    
    return deletedCount;
  } catch (error) {
    console.error("Error clearing existing classes:", error);
    return 0;
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
  const result: { data: ICharacterClassData; description?: string } = {
    data: convertedClass
  };
  
  try {
    // Check if we need to fetch subclasses
    if ((convertedClass as any)._needsSubclassLookup) {
      console.log(`Fetching subclasses for ${(convertedClass as any)._originalName}`);
      
      // Fetch subclasses for this class
      const subclasses = await getSubclassesForClass(
        (convertedClass as any)._originalName,
        (convertedClass as any)._originalSource
      );
      
      // Process and add subclasses to the class data
      if (subclasses.length > 0) {
        // We need to get the class features and subclass features data to process properly
        // Get the complete data again with features
        const dataPath = join(__dirname, '../../data');
        const allClassData = await read5eToolsData(dataPath, 'class/class-*.json');
        
        // Get any available class features and subclass features
        const classFeatures = allClassData.classFeature || [];
        const subclassFeatures = allClassData.subclassFeature || [];
        
        console.log(`Found ${classFeatures.length} class features and ${subclassFeatures.length} subclass features`);
        
        // Process subclasses properly
        const className = toLowercase((convertedClass as any)._originalName);
        
        const processedSubclasses = subclasses.map((subclass: any) => {
          //console.log(`Processing subclass: ${subclass.name}`);
          
          // Extract subclass features for this subclass
          // Similar to extractSubclassFeatures in convert-5etools-class.mts
          const subclassFeaturesByLevel: Record<string, any[]> = {};
          const subclassShortName = toLowercase(subclass.shortName || '');
          
          // Filter and process subclass features
          for (const feature of subclassFeatures) {
            // Match by class name and subclass name
            const featureClassName = toLowercase(feature.className || '');
            const featureSubclassName = toLowercase(feature.subclassShortName || '');
            
            if (featureClassName === className && 
                featureSubclassName === subclassShortName &&
                feature.subclassSource === subclass.source) {
              
              // Skip the main subclass entry
              if (feature.name === subclass.name) {
                continue;
              }
              
              const level = feature.level;
              if (level) {
                if (!subclassFeaturesByLevel[level]) {
                  subclassFeaturesByLevel[level] = [];
                }
                
                // Normalize feature entries similar to normalizeSubclassFeatureEntries
                const normalizedFeature = {
                  name: toLowercase(feature.name || ''),
                  source: "xphb",
                  description: '', // Will populate from entries
                  benefits: []
                };
                
                // Process feature entries if they exist
                if (feature.entries && Array.isArray(feature.entries)) {
                  // Extract text entries as description
                  const descriptionParts = feature.entries
                    .filter((entry: any) => typeof entry === 'string')
                    .map((entry: string) => toLowercase(entry));
                  
                  if (descriptionParts.length > 0) {
                    normalizedFeature.description = descriptionParts.join(' ');
                  }
                }
                
                subclassFeaturesByLevel[level].push(normalizedFeature);
                //console.log(`Added feature ${feature.name} at level ${level} for subclass ${subclass.name}`);
              }
            }
          }
          
          // Process additional spells if present
          let additionalSpells: any[] = [];
          if (subclass.additionalSpells && Array.isArray(subclass.additionalSpells)) {
            // Create simple placeholder for now
            //console.log(`Subclass ${subclass.name} has ${subclass.additionalSpells.length} additional spell entries`);
            additionalSpells = []; // We'll implement proper spell handling later if needed
          }
          
          return {
            name: toLowercase(subclass.name || ''),
            shortname: toLowercase(subclass.shortName || ''),
            source: "xphb",
            classname: className,
            features: subclassFeaturesByLevel,
            additionalspells: additionalSpells
          };
        });
        
        // Add processed subclasses to the result
        convertedClass.subclasses = processedSubclasses;
        
        //console.log(`Added ${processedSubclasses.length} subclasses to ${(convertedClass as any)._originalName}`);
      }
      
      // Remove the lookup flags as they're no longer needed
      delete (convertedClass as any)._needsSubclassLookup;
      delete (convertedClass as any)._originalName;
      delete (convertedClass as any)._originalSource;
    }
    
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
          // console.log(`Found description for ${className}`);
          // Add description to the result object at the top level
          result.description = description;
        }
      } catch (err) {
        // Just log and continue if we can't find fluff for a class
        console.log(`No fluff found for class ${className}`, err);
      }
    }
  } catch (error) {
    console.error("Error processing class:", error);
  }
  
  return result;
}

// Run the import if this script is run directly
if (import.meta.url === (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)) {
  // Configure the API base URL and auth token from environment variables
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const authToken = process.env.API_AUTH_TOKEN; // Optional
  
  // Display initial configuration
  console.log(`Using API URL: ${apiBaseUrl}`);
  console.log(`Authentication: ${authToken ? 'Enabled' : 'Disabled'}`);
  
  // First clear existing classes, then run the import
  // clearExistingClassesViaAPI(apiBaseUrl, authToken).then((deletedCount) => {
  //   console.log(`Deleted ${deletedCount} existing character class documents via API`);
    
    runImportViaAPI({
      documentType: 'characterClass',
      dataFile: 'class/class-*.json',
      dataKey: 'class',
      converter: convertClassWithDescription,
      dirPath: join(__dirname, '../../data'),
      apiBaseUrl,
      authToken
    }).catch(console.error);
  // }).catch(console.error);
} 