/* eslint-disable @typescript-eslint/no-explicit-any */
import { uploadFile, getPublicUrl } from '@dungeon-lab/server/src/services/storage.service.mjs';
import { join } from 'path';
import { readFile } from 'fs/promises';
import * as mimeTypes from 'mime-types';

// Map for converting school abbreviations to full names
const schoolMap: Record<string, string> = {
  'A': 'abjuration',
  'C': 'conjuration',
  'D': 'divination',
  'E': 'enchantment',
  'V': 'evocation',
  'I': 'illusion',
  'N': 'necromancy',
  'T': 'transmutation'
};

// Map for converting damage type abbreviations to full names
const damageTypeMap: Record<string, string> = {
  'acid': 'acid',
  'bludgeoning': 'bludgeoning',
  'cold': 'cold',
  'fire': 'fire',
  'force': 'force',
  'lightning': 'lightning',
  'necrotic': 'necrotic',
  'piercing': 'piercing',
  'poison': 'poison',
  'psychic': 'psychic',
  'radiant': 'radiant',
  'slashing': 'slashing',
  'thunder': 'thunder'
};

// Map for saving throw abilities
const savingThrowMap: Record<string, string> = {
  'str': 'strength',
  'dex': 'dexterity',
  'con': 'constitution',
  'int': 'intelligence',
  'wis': 'wisdom',
  'cha': 'charisma'
};

/**
 * Upload a spell image
 * @param imagePath Path to the image in the 5etools-img directory
 * @returns Public URL of the uploaded image
 */
export async function uploadSpellImage(imagePath: string, dirPath: string): Promise<string | undefined> {
  try {
    // Construct the full path to the image
    const fullPath = join(dirPath, '../../submodules/5etools-img', imagePath);
    
    // Read the image file
    const buffer = await readFile(fullPath);
    
    // Determine content type
    const contentType = mimeTypes.lookup(imagePath) || 'image/jpeg';
    
    // Extract file name
    const fileName = imagePath.split('/').pop() || 'spell.jpg';
    
    // Upload to MinIO
    const { key } = await uploadFile(buffer, fileName, contentType, 'spells');
    
    // Return public URL
    return getPublicUrl(key);
  } catch (error) {
    console.error(`Failed to upload spell image ${imagePath}:`, error);
    return undefined;
  }
}

/**
 * Format a casting time value from the 5etools format
 */
function formatCastingTime(time: any): string {
  if (!time) return 'action';
  
  // Just return the string value as is if it's a string
  if (typeof time === 'string') return time;
  
  // Try to handle other formats
  if (Array.isArray(time) && time.length > 0) {
    const entry = time[0];
    
    if (typeof entry === 'object' && entry.number && entry.unit) {
      if (entry.number === 1) {
        if (entry.unit === 'action') return '1 action';
        if (entry.unit === 'bonus') return '1 bonus action';
        if (entry.unit === 'reaction') return '1 reaction';
        if (entry.unit === 'minute') return '1 minute';
        if (entry.unit === 'hour') return '1 hour';
      }
      
      return `${entry.number} ${entry.unit}s`;
    }
  }

  // Default to action if we can't parse
  return 'action';
}

/**
 * Format a duration value from the 5etools format
 */
function formatDuration(duration: any): any {
  if (!duration) return 'instantaneous';
  
  // If it's already a string, return it
  if (typeof duration === 'string') return duration;
  
  // Try to parse various duration formats
  if (Array.isArray(duration) && duration.length > 0) {
    const entry = duration[0];
    
    if (typeof entry === 'object') {
      // Handle specific duration types
      if (entry.type === 'instant') return 'instantaneous';
      if (entry.type === 'permanent' && entry.ends && entry.ends.includes('dispel')) return 'until dispelled';
      if (entry.concentration) return `Concentration, ${formatDurationPart(entry)}`;
      
      // Return the formatted duration
      return formatDurationPart(entry);
    }
  }

  // Default to instantaneous if we can't parse
  return 'instantaneous';
}

/**
 * Format a specific duration entry
 */
function formatDurationPart(entry: any): string {
  if (entry.type === 'timed') {
    if (entry.duration) {
      if (typeof entry.duration === 'object') {
        const amount = entry.duration.amount || 0;
        const type = entry.duration.type || 'minutes';
        
        if (amount === 1) {
          return `${amount} ${type.slice(0, -1)}`; // Remove 's' from plural
        }
        
        return `${amount} ${type}`;
      }
    }
  }
  
  // If we can't determine a specific format, return the original
  if (entry.duration && typeof entry.duration === 'string') {
    return entry.duration;
  }
  
  return 'instantaneous';
}

/**
 * Format a range value from the 5etools format
 */
function formatRange(range: any): any {
  if (!range) return { type: 'range', distance: 30 };
  
  if (typeof range === 'string') {
    if (range.toLowerCase() === 'self') return 'self';
    if (range.toLowerCase() === 'touch') return 'touch';
  }
  
  if (typeof range === 'object') {
    if (range.type === 'point' && range.distance) {
      return {
        type: 'range',
        distance: Number(range.distance.amount) || 30
      };
    }
    
    if (range.type === 'radius' && range.distance) {
      return {
        type: 'radius',
        distance: Number(range.distance.amount) || 10
      };
    }
  }

  // Default to a 30ft range if we can't parse
  return { type: 'range', distance: 30 };
}

/**
 * Parse components from the 5etools format
 */
function parseComponents(components: string[], material?: string): any {
  const result = {
    verbal: components.includes('V'),
    somatic: components.includes('S'),
    material: components.includes('M')
  };

  // If there's a material component with description
  if (result.material && material) {
    // Check if it mentions cost
    const costMatch = material.match(/(\d+)\s*(?:gp|gold)/i);
    const cost = costMatch ? parseInt(costMatch[1], 10) : undefined;
    
    // Check if it mentions being consumed
    const consumed = /consumed|destroy/i.test(material);
    
    return {
      ...result,
      material: {
        items: material,
        consumed: consumed || undefined,
        cost: cost || undefined
      }
    };
  }

  return result;
}

/**
 * Extract damage types from the spell
 */
function extractDamageTypes(spell: any): string[] {
  const damageTypes: string[] = [];
  
  // Check direct damage_type field
  if (spell.damage && spell.damage.damage_type && spell.damage.damage_type.name) {
    damageTypes.push(spell.damage.damage_type.name.toLowerCase());
  }
  
  // Check description for damage types
  if (spell.desc) {
    const desc = Array.isArray(spell.desc) ? spell.desc.join(' ') : spell.desc;
    
    Object.keys(damageTypeMap).forEach(type => {
      if (desc.toLowerCase().includes(type)) {
        damageTypes.push(type);
      }
    });
  }
  
  // Remove duplicates
  return [...new Set(damageTypes)];
}

/**
 * Extract saving throws from the spell
 */
function extractSavingThrows(spell: any): string[] {
  const savingThrows: string[] = [];
  
  // Check direct dc field
  if (spell.dc && spell.dc.dc_type && spell.dc.dc_type.name) {
    const ability = spell.dc.dc_type.name.toLowerCase();
    if (savingThrowMap[ability]) {
      savingThrows.push(savingThrowMap[ability]);
    }
  }
  
  // Check description for saving throws
  if (spell.desc) {
    const desc = Array.isArray(spell.desc) ? spell.desc.join(' ').toLowerCase() : spell.desc.toLowerCase();
    
    // Look for patterns like "strength saving throw", "dexterity save", etc.
    Object.keys(savingThrowMap).forEach(key => {
      const fullName = savingThrowMap[key];
      if (desc.includes(`${fullName} saving throw`) || desc.includes(`${fullName} save`)) {
        savingThrows.push(fullName);
      }
    });
  }
  
  // Remove duplicates
  return [...new Set(savingThrows)];
}

/**
 * Format damage for different spell levels
 */
function formatDamage(spell: any): Record<string, string> {
  const result: Record<string, string> = {};
  
  // Cantrip damage by character level
  if (spell.damage && spell.damage.damage_at_character_level) {
    Object.entries(spell.damage.damage_at_character_level).forEach(([level, damage]) => {
      result[`character_${level}`] = damage as string;
    });
  }
  
  // Leveled spell damage by slot level
  if (spell.damage && spell.damage.damage_at_slot_level) {
    Object.entries(spell.damage.damage_at_slot_level).forEach(([level, damage]) => {
      result[`slot_${level}`] = damage as string;
    });
  }
  
  // Healing by slot level
  if (spell.heal_at_slot_level) {
    Object.entries(spell.heal_at_slot_level).forEach(([level, healing]) => {
      result[`heal_${level}`] = healing as string;
    });
  }
  
  return result;
}

/**
 * Convert a spell to our format
 * @param spellData The spell data from 5e-SRD-Spells.json
 * @param fluffData Optional fluff data for the spell image
 * @returns Converted spell and image path
 */
export function convertSpell(spellData: any, fluffData?: any): {
  spell: {
    name: string;
    type: string;
    description?: string;
    data: {
      type: 'spell';
      level: number;
      classes: string[];
      school: string;
      castingTime: string;
      range: any;
      components: any;
      savingThrow: string[];
      damageType: string[];
      damage: Record<string, string>;
      duration: any;
      description: string;
    }
  },
  imagePath?: string
} {
  // Extract image path from fluff data if available
  let imagePath: string | undefined;
  if (fluffData && fluffData.images && fluffData.images.length > 0) {
    const imageData = fluffData.images[0];
    if (imageData.href && imageData.href.path) {
      imagePath = imageData.href.path;
    }
  }
  
  // Get class names
  const classes = spellData.classes ? 
    spellData.classes.map((c: any) => c.name.toLowerCase()) : [];
  
  // Extract description
  const description = Array.isArray(spellData.desc) ? 
    spellData.desc.join('\n\n') : spellData.desc || '';
  
  // Add higher level info if available
  const fullDescription = spellData.higher_level ? 
    `${description}\n\nAt Higher Levels: ${spellData.higher_level.join('\n')}` : description;
  
  // Convert the spell
  return {
    spell: {
      name: spellData.name,
      type: 'spell',
      description: fullDescription,
      data: {
        type: 'spell',
        level: spellData.level || 0,
        classes: classes,
        school: schoolMap[spellData.school?.name[0]] || spellData.school?.name.toLowerCase() || 'evocation',
        castingTime: formatCastingTime(spellData.casting_time),
        range: formatRange(spellData.range),
        components: parseComponents(spellData.components || [], spellData.material),
        savingThrow: extractSavingThrows(spellData),
        damageType: extractDamageTypes(spellData),
        damage: formatDamage(spellData),
        duration: formatDuration(spellData.duration),
        description: fullDescription
      }
    },
    imagePath
  };
} 