import type { IBackgroundData } from '../shared/types/vttdocument.mjs';
import {
  toLowercase,
  cleanRuleText,
  extractTextFromEntries,
  normalizeSkillProficiencies,
  normalizeToolProficiencies
} from './converter-utils.mjs';

// Map short ability names to full names
const ABILITY_MAP: Record<string, string> = {
  "str": "strength",
  "dex": "dexterity",
  "con": "constitution",
  "int": "intelligence",
  "wis": "wisdom",
  "cha": "charisma"
} as const;

// Input data interface
export interface RawBackgroundData {
  name?: string;
  source?: string;
  ability?: Array<{
    choose?: {
      weighted?: {
        from?: string[];
        weights?: number[];
      };
      from?: string[];
    };
  }>;
  feats?: Array<Record<string, boolean>>;
  skillProficiencies?: Array<Record<string, boolean>>;
  toolProficiencies?: Array<Record<string, boolean>>;
  startingEquipment?: Array<{
    A?: Array<{
      item?: string;
      displayName?: string;
      quantity?: number;
      value?: number;
      special?: string;
    }>;
    B?: Array<{
      item?: string;
      displayName?: string;
      quantity?: number;
      value?: number;
      special?: string;
    }>;
    _?: any[];
  }>;
  entries?: any[];
  suggestedCharacteristics?: {
    personalityTrait?: any[];
    ideal?: any[];
    bond?: any[];
    flaw?: any[];
  };
}

function normalizeFeats(featsData: any[]): string[] {
  if (!featsData || !Array.isArray(featsData)) {
    return [];
  }
  
  const feats: string[] = [];
  
  for (const featItem of featsData) {
    if (typeof featItem === 'object' && featItem !== null) {
      // Feats are objects where keys are feat names and values are true
      Object.keys(featItem).forEach(feat => {
        if (featItem[feat] === true) {
          // Strip out the "|source" part if present
          const featName = feat.split('|')[0].trim();
          feats.push(toLowercase(featName));
        }
      });
    }
  }
  
  return feats;
}

function normalizeEquipment(equipmentData: any[]): { 
  type: 'choice'; 
  options: Array<Array<{ item: string; quantity?: number } | { value: number }>>
} {
  if (!equipmentData || !Array.isArray(equipmentData)) {
    return { 
      type: 'choice',
      options: [[{ item: 'none' }]] 
    };
  }
  
  const result = {
    type: 'choice' as const,
    options: [] as Array<Array<{ item: string; quantity?: number } | { value: number }>>
  };
  
  // Process option A (items)
  if (equipmentData[0] && equipmentData[0].A && Array.isArray(equipmentData[0].A)) {
    const optionAItems: Array<{ item: string; quantity?: number } | { value: number }> = [];
    
    for (const item of equipmentData[0].A) {
      if (item.item) {
        const itemObj: { item: string; quantity?: number } = {
          item: item.item.split('|')[0].trim().toLowerCase() // Remove source reference
        };
        
        if (item.quantity && item.quantity > 1) {
          itemObj.quantity = item.quantity;
        }
        
        optionAItems.push(itemObj);
      } else if (item.special) {
        const itemObj: { item: string; quantity?: number } = {
          item: item.special.toLowerCase()
        };
        
        if (item.quantity && item.quantity > 1) {
          itemObj.quantity = item.quantity;
        }
        
        optionAItems.push(itemObj);
      } else if (item.value) {
        optionAItems.push({ value: item.value });
      }
    }
    
    if (optionAItems.length > 0) {
      result.options.push(optionAItems);
    }
  }
  
  // Process option B (usually gold)
  if (equipmentData[0] && equipmentData[0].B && Array.isArray(equipmentData[0].B)) {
    const optionBItems: Array<{ item: string; quantity?: number } | { value: number }> = [];
    
    for (const item of equipmentData[0].B) {
      if (item.value) {
        optionBItems.push({ value: item.value });
      } else if (item.item) {
        optionBItems.push({ 
          item: item.item.split('|')[0].trim().toLowerCase()
        });
      }
    }
    
    if (optionBItems.length > 0) {
      result.options.push(optionBItems);
    }
  }
  
  // If no options were found, provide a default
  if (result.options.length === 0) {
    result.options.push([{ item: 'none' }]);
  }
  
  return result;
}

// Normalize ability scores using ABILITY_MAP
function normalizeAbilities(abilityData: any[]): string[] {
  if (!abilityData || !Array.isArray(abilityData) || abilityData.length === 0) {
    return [];
  }
  
  const abilities: string[] = [];

  // Get the weighted.from array from the first ability entry
  if (abilityData[0]?.choose?.weighted?.from && Array.isArray(abilityData[0].choose.weighted.from)) {
    // Convert each abbreviated ability to its full name using ABILITY_MAP
    abilityData[0].choose.weighted.from.forEach((abilShort: string) => {
      const normalizedAbility = ABILITY_MAP[abilShort.toLowerCase()] || abilShort.toLowerCase();
      abilities.push(normalizedAbility);
    });
  }
  
  return abilities;
}

export function convert5eToolsBackground(data: RawBackgroundData, fluffData?: any): IBackgroundData {
  // Return empty object if no source or not XPHB
  if (!data || !data.source || data.source !== 'XPHB') {
    return {} as IBackgroundData;
  }

  // Normalize the name properly for document matching
  const name = data.name ? toLowercase(data.name) : '';

  // Get description from fluff data
  let description = '';
  if (fluffData && fluffData.backgroundFluff) {
    // Find matching fluff entry with same name and source
    const fluffEntry = fluffData.backgroundFluff.find((entry: any) => 
      entry.name === data.name && entry.source === data.source
    );
    
    if (fluffEntry && fluffEntry.entries && Array.isArray(fluffEntry.entries)) {
      // Join all entries into a single description string
      description = fluffEntry.entries.map((entry: any) => {
        if (typeof entry === 'string') {
          return cleanRuleText(entry);
        } else if (typeof entry === 'object' && entry.entries) {
          return extractTextFromEntries([entry]);
        }
        return '';
      }).join('\n\n');
    }
  }
  
  // If no fluff description found, try to extract from main data entries
  if (!description && data.entries && Array.isArray(data.entries)) {
    description = extractTextFromEntries(data.entries);
  }

  // Extract personality traits, ideals, bonds, and flaws
  const personality: string[] = [];
  const ideals: string[] = [];
  const bonds: string[] = [];
  const flaws: string[] = [];

  if (data.suggestedCharacteristics) {
    // Process personality traits
    if (data.suggestedCharacteristics.personalityTrait && Array.isArray(data.suggestedCharacteristics.personalityTrait)) {
      data.suggestedCharacteristics.personalityTrait.forEach(trait => {
        if (typeof trait === 'object' && trait !== null && trait.entry) {
          personality.push(cleanRuleText(trait.entry));
        } else if (typeof trait === 'string') {
          personality.push(cleanRuleText(trait));
        }
      });
    }

    // Process ideals
    if (data.suggestedCharacteristics.ideal && Array.isArray(data.suggestedCharacteristics.ideal)) {
      data.suggestedCharacteristics.ideal.forEach(ideal => {
        if (typeof ideal === 'object' && ideal !== null && ideal.entry) {
          ideals.push(cleanRuleText(ideal.entry));
        } else if (typeof ideal === 'string') {
          ideals.push(cleanRuleText(ideal));
        }
      });
    }

    // Process bonds
    if (data.suggestedCharacteristics.bond && Array.isArray(data.suggestedCharacteristics.bond)) {
      data.suggestedCharacteristics.bond.forEach(bond => {
        if (typeof bond === 'object' && bond !== null && bond.entry) {
          bonds.push(cleanRuleText(bond.entry));
        } else if (typeof bond === 'string') {
          bonds.push(cleanRuleText(bond));
        }
      });
    }

    // Process flaws
    if (data.suggestedCharacteristics.flaw && Array.isArray(data.suggestedCharacteristics.flaw)) {
      data.suggestedCharacteristics.flaw.forEach(flaw => {
        if (typeof flaw === 'object' && flaw !== null && flaw.entry) {
          flaws.push(cleanRuleText(flaw.entry));
        } else if (typeof flaw === 'string') {
          flaws.push(cleanRuleText(flaw));
        }
      });
    }
  }

  // Build and return the normalized background
  return {
    name,
    description,
    abilities: normalizeAbilities(data.ability || []),
    skillProficiencies: normalizeSkillProficiencies(data.skillProficiencies || []),
    toolProficiencies: normalizeToolProficiencies(data.toolProficiencies || []),
    feats: normalizeFeats(data.feats || []),
    equipment: normalizeEquipment(data.startingEquipment || []),
    suggestedCharacteristics: {
      personalityTraits: personality.length > 0 ? personality : undefined,
      ideals: ideals.length > 0 ? ideals : undefined,
      bonds: bonds.length > 0 ? bonds : undefined,
      flaws: flaws.length > 0 ? flaws : undefined
    }
  };
} 