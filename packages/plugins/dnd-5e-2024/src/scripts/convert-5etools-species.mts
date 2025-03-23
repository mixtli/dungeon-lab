import type { ISpecies } from '../shared/types/vttdocument.mjs';

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

// Helper functions
function toLowercase(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  return String(value).toLowerCase();
}

function cleanRuleText(text: string): string {
  // Handle {@variantrule text|source} pattern
  text = text.replace(/{@variantrule ([^}|]+)\|[^}]+}/g, '$1');
  
  // Handle {@condition text|source} pattern
  text = text.replace(/{@condition ([^}|]+)\|[^}]+}/g, '$1');
  
  // Handle {@sense text|source} pattern
  text = text.replace(/{@sense ([^}|]+)\|[^}]+}/g, '$1');
  
  // Handle {@spell text|source} pattern
  text = text.replace(/{@spell ([^}|]+)\|[^}]+}/g, '$1');
  
  // Handle {@action text|source} pattern
  text = text.replace(/{@action ([^}|]+)\|[^}]+}/g, '$1');
  
  // Handle {@dc num} pattern
  text = text.replace(/{@dc (\d+)}/g, 'DC $1');
  
  // Handle any other {@something text|source} pattern
  text = text.replace(/{@\w+ ([^}|]+)\|[^}]+}/g, '$1');
  
  // Handle simple {@something text} pattern (no source)
  text = text.replace(/{@\w+ ([^}]+)}/g, '$1');
  
  return text;
}

function extractTextFromEntries(entries: any[]): string {
  if (!entries || !Array.isArray(entries)) {
    return '';
  }
  
  return entries
    .filter(entry => typeof entry === 'string' || (entry && entry.entries) || (entry && entry.items))
    .map(entry => {
      if (typeof entry === 'string') {
        return cleanRuleText(entry);
      } else if (entry.entries) {
        // Handle nested entries
        return extractTextFromEntries(entry.entries);
      } else if (entry.items) {
        // Handle lists
        return extractTextFromEntries(entry.items.map((item: any) => 
          typeof item === 'string' ? item : 
          (item.entries ? item.entries : (item.entry ? item.entry : ''))
        ));
      }
      return '';
    })
    .join(' ');
}

function getSize(data: RawSpeciesData): 'tiny' | 'small' | 'medium' | 'large' | 'huge' {
  if (!data.size || !Array.isArray(data.size)) {
    return 'medium';
  }
  
  // Convert to lowercase and map to our schema's size enum
  const sizes = data.size.map(size => toLowercase(size));
  
  if (sizes.includes('m')) {
    return 'medium';
  } else if (sizes.includes('s')) {
    return 'small';
  } else if (sizes.includes('l')) {
    return 'large';
  } else if (sizes.includes('t')) {
    return 'tiny';
  } else if (sizes.includes('h')) {
    return 'huge';
  }
  
  return 'medium'; // Default
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

// Helper function for processing spell lists
function processSpellList(spellList: any): string[] {
  if (!spellList) return [];
  
  const spells: string[] = [];
  
  if (Array.isArray(spellList)) {
    // Direct array of spells
    spellList.forEach(spell => {
      if (typeof spell === 'string') {
        // Extract just the spell name, removing source and other annotations
        const spellName = spell.split('|')[0].split('#')[0].trim();
        spells.push(toLowercase(spellName));
      } else if (spell && spell.choose) {
        // For entries with 'choose', we can't determine exact spells,
        // so add a note about choosing from a list
        spells.push(`choose a spell from ${spell.choose}`);
      }
    });
  } else if (typeof spellList === 'object') {
    // Nested structure with levels
    Object.keys(spellList).forEach(level => {
      const levelSpells = spellList[level];
      if (Array.isArray(levelSpells)) {
        levelSpells.forEach(spell => {
          if (typeof spell === 'string') {
            const spellName = spell.split('|')[0].split('#')[0].trim();
            spells.push(toLowercase(spellName));
          }
        });
      } else if (typeof levelSpells === 'object' && levelSpells._) {
        // Handle complex structures like {"_": [{"choose": "level=0|class=Wizard"}]}
        levelSpells._.forEach((item: any) => {
          if (item && item.choose) {
            spells.push(`choose a spell from ${item.choose}`);
          }
        });
      }
    });
  }
  
  return spells;
}

function extractSpells(spellData: any[]): Array<{
  name?: string;
  cantrips: string[];
  spells: Array<{ level: number; spells: string[] }>;
}> {
  if (!spellData || !Array.isArray(spellData)) {
    return [];
  }
  
  return spellData.map(spellEntry => {
    const result: {
      name?: string;
      cantrips: string[];
      spells: Array<{ level: number; spells: string[] }>;
    } = {
      name: spellEntry.name ? toLowercase(spellEntry.name) : undefined,
      cantrips: [],
      spells: []
    };
    
    // Process known spells (usually cantrips)
    if (spellEntry.known) {
      const knownSpells = processSpellList(spellEntry.known['1']);
      result.cantrips = knownSpells;
    }
    
    // Process innate spells by level
    if (spellEntry.innate) {
      Object.keys(spellEntry.innate).forEach(level => {
        const levelNum = parseInt(level);
        if (!isNaN(levelNum)) {
          const levelSpells: string[] = [];
          const levelData = spellEntry.innate[level];
          
          // Process spells that can be cast daily
          if (levelData.daily) {
            Object.keys(levelData.daily).forEach(times => {
              levelSpells.push(...processSpellList(levelData.daily[times]));
            });
          }
          
          // Add other spell types as needed (e.g., ritual, etc.)
          
          if (levelSpells.length > 0) {
            result.spells.push({
              level: levelNum,
              spells: levelSpells
            });
          }
        }
      });
    }
    
    return result;
  });
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
    size: getSize(data),
    speed: getSpeed(data),
    traits: extractTraits(data),
    subspecies: subspecies.length > 0 ? subspecies : undefined
  };
} 