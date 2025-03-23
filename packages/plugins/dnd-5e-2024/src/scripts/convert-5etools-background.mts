import type { IBackground } from '../shared/types/vttdocument.mjs';

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
    .filter(entry => typeof entry === 'string' || (entry && entry.entries))
    .map(entry => {
      if (typeof entry === 'string') {
        return toLowercase(cleanRuleText(entry));
      } else if (entry.entries) {
        // Handle nested entries
        return extractTextFromEntries(entry.entries);
      }
      return '';
    })
    .join(' ');
}

function normalizeSkillProficiencies(skillsData: any[]): string[] {
  if (!skillsData || !Array.isArray(skillsData)) {
    return [];
  }
  
  const skills: string[] = [];
  
  for (const skillItem of skillsData) {
    if (typeof skillItem === 'object' && skillItem !== null) {
      // Skills are objects where keys are skill names and values are true
      Object.keys(skillItem).forEach(skill => {
        if (skillItem[skill] === true) {
          skills.push(toLowercase(skill));
        }
      });
    }
  }
  
  return skills;
}

function normalizeToolProficiencies(toolsData: any[]): string[] {
  if (!toolsData || !Array.isArray(toolsData)) {
    return [];
  }
  
  const tools: string[] = [];
  
  for (const toolItem of toolsData) {
    if (typeof toolItem === 'object' && toolItem !== null) {
      // Tools are objects where keys are tool names and values are true
      Object.keys(toolItem).forEach(tool => {
        if (toolItem[tool] === true) {
          tools.push(toLowercase(tool));
        }
      });
    }
  }
  
  return tools;
}

function normalizeAbilities(abilityData: any[]): string[] {
  if (!abilityData || !Array.isArray(abilityData)) {
    return [];
  }
  
  const abilities: string[] = [];
  
  for (const abilityItem of abilityData) {
    if (typeof abilityItem === 'object' && abilityItem !== null) {
      if (abilityItem.choose && abilityItem.choose.weighted && Array.isArray(abilityItem.choose.weighted.from)) {
        // Add all abilities from weighted choices
        abilityItem.choose.weighted.from.forEach((ability: string) => {
          abilities.push(toLowercase(ability));
        });
      } else if (abilityItem.choose && Array.isArray(abilityItem.choose.from)) {
        // Add abilities from simple choices
        abilityItem.choose.from.forEach((ability: string) => {
          abilities.push(toLowercase(ability));
        });
      }
    }
  }
  
  return [...new Set(abilities)]; // Remove duplicates
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

function normalizeCharacteristics(characteristics: any): { 
  personalityTraits?: string[], 
  ideals?: string[], 
  bonds?: string[], 
  flaws?: string[] 
} {
  const result: { 
    personalityTraits?: string[], 
    ideals?: string[], 
    bonds?: string[], 
    flaws?: string[] 
  } = {};
  
  if (!characteristics) {
    return result;
  }
  
  // Process personality traits
  if (characteristics.personalityTrait && Array.isArray(characteristics.personalityTrait)) {
    result.personalityTraits = characteristics.personalityTrait
      .filter((trait: any) => typeof trait === 'object' && trait.table)
      .flatMap((trait: any) => 
        trait.table.map((t: any) => 
          typeof t === 'string' ? toLowercase(t) : 
          (t.entry ? toLowercase(t.entry) : '')
        )
      )
      .filter(Boolean);
  }
  
  // Process ideals
  if (characteristics.ideal && Array.isArray(characteristics.ideal)) {
    result.ideals = characteristics.ideal
      .filter((ideal: any) => typeof ideal === 'object' && ideal.table)
      .flatMap((ideal: any) => 
        ideal.table.map((i: any) => 
          typeof i === 'string' ? toLowercase(i) : 
          (i.entry ? toLowercase(i.entry) : '')
        )
      )
      .filter(Boolean);
  }
  
  // Process bonds
  if (characteristics.bond && Array.isArray(characteristics.bond)) {
    result.bonds = characteristics.bond
      .filter((bond: any) => typeof bond === 'object' && bond.table)
      .flatMap((bond: any) => 
        bond.table.map((b: any) => 
          typeof b === 'string' ? toLowercase(b) : 
          (b.entry ? toLowercase(b.entry) : '')
        )
      )
      .filter(Boolean);
  }
  
  // Process flaws
  if (characteristics.flaw && Array.isArray(characteristics.flaw)) {
    result.flaws = characteristics.flaw
      .filter((flaw: any) => typeof flaw === 'object' && flaw.table)
      .flatMap((flaw: any) => 
        flaw.table.map((f: any) => 
          typeof f === 'string' ? toLowercase(f) : 
          (f.entry ? toLowercase(f.entry) : '')
        )
      )
      .filter(Boolean);
  }
  
  return result;
}

export function convert5eToolsBackground(data: RawBackgroundData): IBackground {
  // Skip non-XPHB backgrounds
  if (data.source !== 'XPHB') {
    return {} as IBackground;
  }
  
  // Convert characteristics
  const characteristics = normalizeCharacteristics(data.suggestedCharacteristics);
  
  return {
    name: toLowercase(data.name || ''),
    description: data.entries ? extractTextFromEntries(data.entries.filter(entry => 
      !entry.name || (typeof entry.name === 'string' && !entry.name.toLowerCase().includes('feature'))
    )) : '',
    abilities: normalizeAbilities(data.ability || []),
    skillProficiencies: normalizeSkillProficiencies(data.skillProficiencies || []),
    toolProficiencies: normalizeToolProficiencies(data.toolProficiencies || []),
    equipment: normalizeEquipment(data.startingEquipment || []),
    feats: normalizeFeats(data.feats || []),
    suggestedCharacteristics: Object.keys(characteristics).length > 0 ? characteristics : undefined
  };
} 