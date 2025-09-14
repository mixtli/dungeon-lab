/**
 * 5etools Markup Parser
 * 
 * Parses 5etools markup format to extract structured action data.
 * Handles attack rolls, damage, saves, recharge, and area effects.
 */

import type { additionalDamageSchema, areaOfEffectSchema, rangeSchema } from '../../types/dnd/stat-block.mjs';
import type { z } from 'zod';
import { expandAbilityName, DAMAGE_TYPES_2024, ABILITIES, type DamageType, type Ability } from '../../types/dnd/common.mjs';

export interface ParsedAttackData {
  attackType?: 'melee' | 'ranged' | 'both';
  attackBonus?: number;
  reach?: number;
  range?: z.infer<typeof rangeSchema>;
  averageDamage?: number;
  damage?: string;
  damageType?: string;
  additionalDamage?: z.infer<typeof additionalDamageSchema>[];
  effectsOnMiss?: string;
}

export interface ParsedSaveData {
  ability?: string;
  dc?: number;
  areaOfEffect?: z.infer<typeof areaOfEffectSchema>;
}

export interface ParsedActionData extends ParsedAttackData, ParsedSaveData {
  recharge?: string;
}

/**
 * Safely convert string damage type to DamageType union
 */
function convertDamageType(damageType: string): DamageType {
  const normalized = damageType.toLowerCase().trim();
  return DAMAGE_TYPES_2024.includes(normalized as DamageType) ? normalized as DamageType : 'bludgeoning';
}

/**
 * Safely convert string ability to Ability union
 */
function convertAbility(ability: string): Ability | string {
  const normalized = ability.toLowerCase().trim();
  return ABILITIES.includes(normalized as Ability) ? normalized as Ability : ability;
}

/**
 * Safely convert string shape to area of effect shape union
 */
function convertAreaShape(shape: string): 'cone' | 'line' | 'sphere' | 'cube' | 'emanation' | 'cylinder' {
  const normalized = shape.toLowerCase().trim();
  const validShapes = ['cone', 'line', 'sphere', 'cube', 'emanation', 'cylinder'] as const;
  type ValidShape = typeof validShapes[number];
  return validShapes.includes(normalized as ValidShape) ? normalized as ValidShape : 'sphere';
}

/**
 * Parse attack type from {@atkr} tags
 * @param text Action entry text
 * @returns Attack type or undefined
 */
export function parseAttackType(text: string): 'melee' | 'ranged' | 'both' | undefined {
  const match = text.match(/\{@atkr\s+([^}]+)\}/);
  if (!match) return undefined;
  
  const types = match[1].toLowerCase().split(',').map(t => t.trim());
  const hasM = types.includes('m');
  const hasR = types.includes('r');
  
  if (hasM && hasR) return 'both';
  if (hasM) return 'melee';
  if (hasR) return 'ranged';
  return undefined;
}

/**
 * Parse attack bonus from {@hit} tags
 * @param text Action entry text
 * @returns Attack bonus or undefined
 */
export function parseAttackBonus(text: string): number | undefined {
  const match = text.match(/\{@hit\s+([+-]?\d+)\}/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Parse reach and range from action text
 * @param text Action entry text
 * @returns Object with reach and/or range
 */
export function parseReachRange(text: string): { reach?: number; range?: z.infer<typeof rangeSchema> } {
  const result: { reach?: number; range?: z.infer<typeof rangeSchema> } = {};
  
  // Parse reach: "reach 5 ft." or "reach 10 ft."
  const reachMatch = text.match(/reach\s+(\d+)\s+ft/i);
  if (reachMatch) {
    result.reach = parseInt(reachMatch[1], 10);
  }
  
  // Parse range: "range 25/50 ft." or "range 120 ft."
  const rangeMatch = text.match(/range\s+(\d+)(?:\/(\d+))?\s+ft/i);
  if (rangeMatch) {
    result.range = {
      normal: parseInt(rangeMatch[1], 10),
      long: rangeMatch[2] ? parseInt(rangeMatch[2], 10) : undefined
    };
  }
  
  return result;
}

/**
 * Parse average damage from {@h} tags
 * @param text Action entry text
 * @returns Average damage or undefined
 */
export function parseAverageDamage(text: string): number | undefined {
  const match = text.match(/\{@h\}(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Parse damage formula from {@damage} tags
 * @param text Action entry text
 * @returns Array of damage objects
 */
export function parseDamageFormulas(text: string): Array<{ damage: string; average?: number; type?: string }> {
  const damages: Array<{ damage: string; average?: number; type?: string }> = [];
  
  // Find all {@damage} tags with optional parentheses for average
  const damagePattern = /(?:(\d+)\s+)?\(\{@damage\s+([^}]+)\}\)(?:\s+(\w+)\s+damage)?/gi;
  let match;
  
  while ((match = damagePattern.exec(text)) !== null) {
    const average = match[1] ? parseInt(match[1], 10) : undefined;
    const damage = match[2];
    
    // Extract damage type from surrounding text
    let type: string | undefined;
    
    // Look for damage type after the damage formula
    const afterMatch = text.slice(match.index + match[0].length).match(/^\s*(\w+)\s+damage/i);
    if (afterMatch) {
      type = afterMatch[1].toLowerCase();
    }
    
    damages.push({ damage, average, type });
  }
  
  return damages;
}

/**
 * Parse additional damage instances (for "plus X damage" patterns)
 * @param text Action entry text
 * @returns Array of additional damage objects
 */
export function parseAdditionalDamage(text: string): z.infer<typeof additionalDamageSchema>[] {
  const additionalDamages: z.infer<typeof additionalDamageSchema>[] = [];
  
  // Find "plus X ({@damage ...}) Type damage" patterns
  const additionalPattern = /plus\s+(\d+)\s+\(\{@damage\s+([^}]+)\}\)\s+(\w+)\s+damage/gi;
  let match;
  
  while ((match = additionalPattern.exec(text)) !== null) {
    const average = parseInt(match[1], 10);
    const damage = match[2];
    const type = match[3].toLowerCase();
    
    additionalDamages.push({
      damage,
      type: convertDamageType(type),
      average
    });
  }
  
  return additionalDamages;
}

/**
 * Parse saving throw from {@actSave} and {@dc} tags
 * @param text Action entry text
 * @returns Save data or undefined
 */
export function parseSavingThrow(text: string): { ability: string; dc: number } | undefined {
  const saveMatch = text.match(/\{@actSave\s+(\w+)\}/);
  const dcMatch = text.match(/\{@dc\s+(\d+)\}/);
  
  if (saveMatch && dcMatch) {
    try {
      const abilityAbbr = saveMatch[1].toLowerCase();
      const fullAbilityName = expandAbilityName(abilityAbbr);
      
      return {
        ability: convertAbility(fullAbilityName),
        dc: parseInt(dcMatch[1], 10)
      };
    } catch {
      // If ability abbreviation is invalid, log error and return undefined
      console.warn(`Invalid ability abbreviation in saving throw: ${saveMatch[1]}`);
      return undefined;
    }
  }
  
  return undefined;
}

/**
 * Parse area of effect from action text
 * @param text Action entry text
 * @returns Area of effect object or undefined
 */
export function parseAreaOfEffect(text: string): z.infer<typeof areaOfEffectSchema> | undefined {
  // Look for area patterns like "60-foot Cone", "30-foot-long, 5-foot-wide Line", etc.
  const areaPatterns = [
    /(\d+)-foot\s+\{@variantrule\s+(\w+)(?:\s+\[Area of Effect\])?[^}]*\}/i,
    /(\d+)-foot\s+(\w+)/i,
    /(\d+)-foot-long,\s*(\d+)-foot-wide\s+\{@variantrule\s+(\w+)(?:\s+\[Area of Effect\])?[^}]*\}/i,
    /(\d+)-foot-long,\s*(\d+)-foot-wide\s+(\w+)/i,
    /(\d+)-foot-radius\s+\{@variantrule\s+(\w+)(?:\s+\[Area of Effect\])?[^}]*\}/i,
    /(\d+)-foot-radius\s+(\w+)/i
  ];
  
  for (const pattern of areaPatterns) {
    const match = text.match(pattern);
    if (match) {
      let shape: string;
      let size: string;
      
      if (match.length === 4 && match[2] && match[3]) {
        // Long/wide pattern like "30-foot-long, 5-foot-wide Line"
        size = `${match[1]}-foot-long, ${match[2]}-foot-wide`;
        shape = match[3].toLowerCase();
      } else {
        // Simple pattern like "60-foot Cone"
        size = `${match[1]}-foot`;
        shape = match[2].toLowerCase();
      }
      
      // Normalize shape names
      const shapeMap: Record<string, string> = {
        'cone': 'cone',
        'line': 'line', 
        'sphere': 'sphere',
        'cube': 'cube',
        'emanation': 'emanation',
        'cylinder': 'cylinder'
      };
      
      const normalizedShape = shapeMap[shape];
      if (normalizedShape) {
        return {
          shape: convertAreaShape(normalizedShape),
          size
        };
      }
    }
  }
  
  return undefined;
}

/**
 * Parse recharge from {@recharge} tags
 * @param text Action entry text  
 * @returns Recharge string or undefined
 */
export function parseRecharge(text: string): string | undefined {
  const match = text.match(/\{@recharge\s*(\d+)?\}/);
  if (match) {
    const value = match[1];
    if (value) {
      return `${value}-6`;
    } else {
      return '6'; // {@recharge} with no number means recharge on 6
    }
  }
  return undefined;
}

/**
 * Parse hit-or-miss effects from {@hom} tags
 * @param text Action entry text
 * @returns Effects text or undefined
 */
export function parseEffectsOnMiss(text: string): string | undefined {
  const match = text.match(/\{@hom\}(.+?)(?:\{@|$)/);
  if (match) {
    return match[1].trim();
  }
  return undefined;
}

/**
 * Parse all action data from 5etools markup text
 * @param text Action entry text
 * @returns Parsed action data
 */
export function parseActionMarkup(text: string): ParsedActionData {
  const result: ParsedActionData = {};
  
  // Parse attack data
  result.attackType = parseAttackType(text);
  result.attackBonus = parseAttackBonus(text);
  
  const reachRange = parseReachRange(text);
  result.reach = reachRange.reach;
  result.range = reachRange.range;
  
  result.averageDamage = parseAverageDamage(text);
  result.effectsOnMiss = parseEffectsOnMiss(text);
  
  // Parse damage formulas
  const damages = parseDamageFormulas(text);
  if (damages.length > 0) {
    const primary = damages[0];
    result.damage = primary.damage;
    result.damageType = primary.type;
    
    // Additional damages beyond the first
    const additional = parseAdditionalDamage(text);
    if (additional.length > 0) {
      result.additionalDamage = additional;
    }
  }
  
  // Parse saving throw
  const save = parseSavingThrow(text);
  if (save) {
    result.ability = save.ability;
    result.dc = save.dc;
  }
  
  // Parse area of effect
  result.areaOfEffect = parseAreaOfEffect(text);
  
  // Parse recharge
  result.recharge = parseRecharge(text);
  
  return result;
}