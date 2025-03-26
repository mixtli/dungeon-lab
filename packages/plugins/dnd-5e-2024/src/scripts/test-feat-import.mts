import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { convert5eToolsFeat } from './convert-5etools-feat.mjs';
import { featSchema } from '../shared/types/vttdocument.mjs';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the feats.json file
const featsFilePath = path.join(__dirname, '../../submodules/5etools-src/data/feats.json');

// Define a simple type for 5eTools feat
interface Feat5eTools {
  source: string;
  name: string;
  entries?: any[];
  ability?: any;
  prerequisite?: any;
  category?: string;
  [key: string]: any;
}

// Define a type for our converted feat that matches the schema
interface ConvertedFeat {
  name: string;
  description: string;
  category?: string;
  ability?: Array<{
    choice: {
      from: string[];
      count?: number;
    }
  }>;
  prerequisites?: {
    ability?: Record<string, number>;
    race?: string[];
    class?: string[];
    level?: number;
    spellcasting?: boolean;
    other?: string;
  };
  benefits: Array<{
    name: string;
    description: string;
  }>;
}

// Test the converter with a sample feat
async function testFeatConverter() {
  try {
    // Read the feats file
    const featsData = JSON.parse(fs.readFileSync(featsFilePath, 'utf8'));
    
    // Find feats with source XPHB
    const xphbFeats = featsData.feat.filter((feat: Feat5eTools) => feat.source === 'XPHB');
    
    if (xphbFeats.length === 0) {
      console.error('No feats with source XPHB found in the data file');
      return;
    }
    
    // Test a feat with ability choices if possible (like Elemental Adept)
    console.log('=== Testing a feat with ability choices ===');
    const abilityFeat = xphbFeats.find((feat: Feat5eTools) => 
      feat.name === 'Elemental Adept' || 
      (feat.ability && (Array.isArray(feat.ability) 
        ? feat.ability[0]?.choose 
        : feat.ability.choose))
    );
    
    if (abilityFeat) {
      testSingleFeat(abilityFeat);
    } else {
      console.log('No feat with ability choices found in XPHB source');
    }
    
    // Test a feat with ability prerequisites
    console.log('\n=== Testing a feat with ability prerequisites ===');
    const prerequisiteFeat = xphbFeats.find((feat: Feat5eTools) => {
      if (!feat.prerequisite) return false;
      
      if (Array.isArray(feat.prerequisite)) {
        return feat.prerequisite.some(p => p.ability || p.level);
      } else {
        return feat.prerequisite.ability || feat.prerequisite.level;
      }
    });
    
    if (prerequisiteFeat) {
      testSingleFeat(prerequisiteFeat);
    } else {
      console.log('No feat with ability prerequisites found in XPHB source');
    }
    
    // If neither specialized test worked, test a standard feat
    if (!abilityFeat && !prerequisiteFeat) {
      console.log('\n=== Testing standard feat ===');
      testSingleFeat(xphbFeats[0]);
    }
    
  } catch (error) {
    console.error('Error testing feat converter:', error);
  }
}

// Test a single feat
function testSingleFeat(sampleFeat: Feat5eTools) {
  console.log('Original feat data:');
  console.log(JSON.stringify(sampleFeat, null, 2));
  
  // Convert the feat
  const convertedFeat = convert5eToolsFeat(sampleFeat) as ConvertedFeat;
  
  console.log('\nConverted feat data:');
  console.log(JSON.stringify(convertedFeat, null, 2));
  
  // Verify the conversion
  console.log('\nVerification:');
  console.log('- Name:', convertedFeat.name === sampleFeat.name ? '✓' : '✗');
  console.log('- Has description:', convertedFeat.description ? '✓' : '✗');
  console.log('- Has category:', convertedFeat.category ? '✓' : '✗');
  
  // Check ability field placement
  console.log('- Ability field placement:');
  
  // Check for array format ability
  if (Array.isArray(sampleFeat.ability) && sampleFeat.ability.length > 0 && sampleFeat.ability[0].choose) {
    console.log('  - Ability choices at top level (array format):', 
      convertedFeat.ability ? '✓' : '✗');
  } 
  // Check for object format ability
  else if (sampleFeat.ability && sampleFeat.ability.choose) {
    console.log('  - Ability choices at top level (object format):', 
      convertedFeat.ability ? '✓' : '✗');
  }
  else {
    console.log('  - Ability field (not applicable for this feat)');
  }
  
  // Check prerequisite fields
  console.log('- Prerequisites:');
  
  // Check for prerequisites using the array format
  if (Array.isArray(sampleFeat.prerequisite)) {
    const hasLevel = sampleFeat.prerequisite.some(p => p.level);
    const hasAbility = sampleFeat.prerequisite.some(p => p.ability);
    const hasSpellcasting = sampleFeat.prerequisite.some(p => p.spellcasting || p.spellcasting2020);
    
    if (hasLevel) {
      console.log('  - Level prerequisite:', convertedFeat.prerequisites?.level ? '✓' : '✗');
    }
    
    if (hasAbility) {
      console.log('  - Ability prerequisite:', convertedFeat.prerequisites?.ability ? '✓' : '✗');
    }
    
    if (hasSpellcasting) {
      console.log('  - Spellcasting prerequisite:', convertedFeat.prerequisites?.spellcasting ? '✓' : '✗');
    }
  } 
  // Check for prerequisites using the object format
  else if (sampleFeat.prerequisite) {
    if (sampleFeat.prerequisite.level) {
      console.log('  - Level prerequisite:', convertedFeat.prerequisites?.level ? '✓' : '✗');
    }
    
    if (sampleFeat.prerequisite.ability) {
      console.log('  - Ability prerequisite:', convertedFeat.prerequisites?.ability ? '✓' : '✗');
    }
    
    if (sampleFeat.prerequisite.spellcasting || sampleFeat.prerequisite.spellcasting2020) {
      console.log('  - Spellcasting prerequisite:', convertedFeat.prerequisites?.spellcasting ? '✓' : '✗');
    }
  } else {
    console.log('  - No prerequisites for this feat');
  }
  
  // Check benefit handling
  let hasFirstEntryCheck = false;
  if (sampleFeat.entries && sampleFeat.entries.length > 0 && typeof sampleFeat.entries[0] === 'string') {
    hasFirstEntryCheck = true;
    const firstEntry = sampleFeat.entries[0];
    console.log('- First entry not in benefits:', 
      !convertedFeat.benefits.some(b => b.description === firstEntry) ? '✓' : '✗');
  } else {
    console.log('- First entry not in benefits: (not applicable)');
  }
  
  console.log('- Benefits format:', 
    Array.isArray(convertedFeat.benefits) && convertedFeat.benefits.length > 0 ? '✓' : '✗');
  
  // Validate against schema
  const validationResult = featSchema.safeParse(convertedFeat);
  console.log('- Schema validation:', validationResult.success ? '✓' : '✗');
  if (!validationResult.success) {
    console.error('Validation errors:', validationResult.error);
  }
}

// Run the test if this script is executed directly
if (import.meta.url === (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)) {
  testFeatConverter();
} 