import type { ISpecies } from '../shared/types/vttdocument.mjs';
import {
  toLowercase,
  cleanRuleText,
  extractTextFromEntries,
  normalizeSize,
  extractSpells,
  processSpellList
} from './converter-utils.mjs';

// Input data interface
export interface RawSpeciesData {
  name?: string;
  source?: string;
  size?: string[];
  speed?: number | { 
    walk?: number; 
    fly?: number;
    swim?: number;
    climb?: number;
    burrow?: number;
  };
  darkvision?: number;
  sizeEntry?: {
    type?: string;
    name?: string;
    entries?: string[];
  };
  entries?: Array<{
    type?: string;
    name?: string;
    entries?: any[];
  }>;
  creatureTypes?: string[];
  resist?: string[];
  additionalSpells?: Array<{
    name?: string;
    ability?: string | {
      choose?: string[];
    };
    innate?: Record<string, any>;
    known?: Record<string, any>;
  }>;
  subraces?: Array<{
    name?: string;
    source?: string;
    entries?: any[];
  }>;
  _versions?: Array<{
    name?: string;
    source?: string;
    additionalSpells?: Array<{
      ability?: string | {
        choose?: string[];
      };
      innate?: Record<string, any>;
      known?: Record<string, any>;
    }>;
    _mod?: {
      entries?: {
        mode?: string;
        replace?: string;
        items?: {
          name?: string;
          type?: string;
          entries?: any[];
        };
      };
    };
  }>;
}

function getSpeed(data: RawSpeciesData): number {
  if (typeof data.speed === 'number') {
    return data.speed;
  } else if (typeof data.speed === 'object' && data.speed !== null) {
    return data.speed.walk || 30; // Default to walk speed or 30
  }
  
  return 30; // Default
}

function extractTraits(data: RawSpeciesData): Array<{ name: string; description: string }> {
  if (!data.entries || !Array.isArray(data.entries)) {
    return [];
  }
  
  return data.entries
    .filter(entry => 
      typeof entry === 'object' && entry !== null && 
      entry.name && entry.entries &&
      entry.name.toLowerCase() !== 'size' && // Skip size entry as it's handled separately
      entry.name.toLowerCase() !== 'languages' // Skip languages entry as we don't need them
    )
    .map(entry => ({
      name: toLowercase(entry.name || ''),
      description: extractTextFromEntries(entry.entries || [])
    }));
}

function extractSubspeciesFromVersions(data: RawSpeciesData): Array<{
  name: string;
  description: string;
  traits: Array<{ name: string; description: string }>;
  spells?: Array<{
    name?: string;
    cantrips: string[];
    spells: Array<{ level: number; spells: string[] }>;
  }>;
}> {
  if (!data._versions || !Array.isArray(data._versions)) {
    return [];
  }
  
  return data._versions
    .filter(version => version.source === 'XPHB') // Only include XPHB versions
    .map(version => {
      const traits: Array<{ name: string; description: string }> = [];
      let description = '';
      let versionName = version.name || '';
      
      // Extract the subspecies name from the version name
      // Example format: "Goliath; Cloud Giant Ancestry" should become "cloud giant ancestry"
      const nameParts = versionName.split(';');
      if (nameParts.length > 1) {
        versionName = nameParts[1].trim();
      }
      
      // Extract trait info from the _mod.entries.items
      if (version._mod?.entries?.items) {
        const entryItems = version._mod.entries.items;
        
        // Get the trait name
        if (entryItems.name) {
          // Add it as a trait
          traits.push({
            name: toLowercase(entryItems.name),
            description: entryItems.entries ? extractTextFromEntries(entryItems.entries) : ''
          });
        }
        
        // If there's no explicit description, use the first text entry as the description
        if (!description && entryItems.entries && Array.isArray(entryItems.entries)) {
          const firstEntry = entryItems.entries[0];
          if (typeof firstEntry === 'string') {
            description = cleanRuleText(firstEntry);
          }
        }
      }
      
      // Extract additional spells if present
      const spells = version.additionalSpells ? extractSpells(version.additionalSpells) : undefined;
      
      return {
        name: toLowercase(versionName),
        description: description,
        traits: traits,
        spells: spells
      };
    });
}

function getDescription(data: RawSpeciesData): string {
  // Extract general description from entries that aren't explicit traits
  const description = data.entries ? 
    data.entries
      .filter(entry => 
        typeof entry === 'string' || 
        (entry && entry.type && entry.type === 'entries' && !entry.name)
      )
      .map(entry => 
        typeof entry === 'string' ? 
          cleanRuleText(entry) : 
          extractTextFromEntries(entry.entries || [])
      )
      .join(' ') 
    : '';
    
  return description;
}

export function convert5eToolsSpecies(data: RawSpeciesData): ISpecies {
  // Skip non-XPHB species
  if (data.source !== 'XPHB') {
    return {} as ISpecies;
  }
  
  // First extract subspecies from _versions
  let subspecies = extractSubspeciesFromVersions(data);
  
  // If no subspecies were found, but there are additionalSpells at the species level,
  // we need to create subspecies to hold that data
  if (subspecies.length === 0 && data.additionalSpells && data.additionalSpells.length > 0) {
    // Extract spells from the main species entry
    const spellsData = extractSpells(data.additionalSpells);
    
    // Create subspecies entries for each spell group
    subspecies = spellsData.map(spellGroup => {
      return {
        name: spellGroup.name ? spellGroup.name : `${data.name} variant`,
        description: `${data.name} with ${spellGroup.name || 'special'} spells.`,
        traits: [], // No specific traits
        spells: [spellGroup] // Include the spell group
      };
    });
  }
  
  return {
    name: toLowercase(data.name || ''),
    description: getDescription(data),
    size: normalizeSize(data.size || []),
    speed: getSpeed(data),
    traits: extractTraits(data),
    subspecies: subspecies.length > 0 ? subspecies : undefined
  };
} 