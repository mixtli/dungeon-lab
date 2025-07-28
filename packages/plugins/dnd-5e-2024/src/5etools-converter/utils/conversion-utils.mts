/**
 * Utility functions for 5etools data conversion
 */
import { join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { ETOOLS_DATA_PATH, PLUGIN_CONFIG } from '../../config/constants.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import type { ZodSchema } from 'zod';
// Import canonical schemas from types/dnd
import {
  dndItemDataSchema,
  dndCreatureDataSchema,
  dndCharacterClassDataSchema,
  dndSpeciesDataSchema,
  dndFeatDataSchema,
  dndConditionDataSchema,
  dndActionDataSchema,
  dndSpellDataSchema,
  dndBackgroundDataSchema
} from '../../types/dnd/index.mjs';

/**
 * Filter array to only SRD content
 */
export function filterSrdContent<T extends { srd52?: boolean }>(data: T[]): T[] {
  return data.filter(item => item.srd52 === true);
}

/**
 * Check if an item is SRD content
 */
export function isSrdContent(item: { srd52?: boolean }): boolean {
  return item.srd52 === true;
}

/**
 * Read and parse a JSON file from the 5etools data directory
 */
export async function readEtoolsData<T = unknown>(relativePath: string): Promise<T> {
  const fullPath = join(ETOOLS_DATA_PATH, relativePath);
  try {
    const data = await readFile(fullPath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Failed to read file ${fullPath}:`, error);
    throw new Error(`Could not read 5etools data file: ${relativePath}`);
  }
}

/**
 * Generate a compendium-compatible filename for an entity
 */
export function generateFilename(type: string, name: string, id?: string): string {
  // Clean the name for filename use
  const cleanName = name
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Replace multiple dashes with single
    .toLowerCase();
  
  // Use ID if provided, otherwise use clean name
  const baseId = id || cleanName;
  
  return `${type}-${baseId}.json`;
}

/**
 * Generate manifest.json for a compendium pack
 */
export function generateManifest(options: {
  name: string;
  description?: string;
  contentTypes: string[];
  contentCounts: Record<string, number>;
  srdOnly?: boolean;
}): unknown {
  const { name, description, contentTypes, contentCounts, srdOnly } = options;
  
  return {
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    description: description || `D&D 5e ${srdOnly ? 'SRD ' : ''}content pack`,
    version: '1.0.0',
    gameSystemId: PLUGIN_CONFIG.gameSystemId,
    pluginId: PLUGIN_CONFIG.pluginId,
    contentTypes,
    assetDirectory: 'assets',
    contentDirectory: 'content',
    authors: ['5etools Converter'],
    license: srdOnly ? 'OGL-1.0a' : 'See individual content sources',
    sourceType: '5etools',
    contents: contentCounts
  };
}

/**
 * Write JSON content to a file with proper formatting
 */
export async function writeJsonFile(filepath: string, data: unknown): Promise<void> {
  const dir = filepath.substring(0, filepath.lastIndexOf('/'));
  await mkdir(dir, { recursive: true });
  await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Create directory structure for compendium pack
 */
export async function createCompendiumStructure(basePath: string, contentTypes: string[]): Promise<void> {
  // Create base directories
  await mkdir(join(basePath, 'content'), { recursive: true });
  await mkdir(join(basePath, 'assets'), { recursive: true });
  
  // Create content type subdirectories
  for (const type of contentTypes) {
    await mkdir(join(basePath, 'content', type), { recursive: true });
  }
}

/**
 * Convert any value to lowercase string
 */
export function toLowercase(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  return String(value).toLowerCase();
}

/**
 * Convert ability abbreviation to full name
 */
export function abilityAbbreviationToName(abbr: string): string {
  const map: Record<string, string> = {
    str: 'strength',
    dex: 'dexterity', 
    con: 'constitution',
    int: 'intelligence',
    wis: 'wisdom',
    cha: 'charisma'
  };
  return map[abbr.toLowerCase()] || abbr;
}

/**
 * Calculate proficiency bonus for a given level
 */
export function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

/**
 * Calculate ability modifier from ability score
 */
export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Parse dice formula from 5etools format
 */
export function parseDiceFormula(formula: string): { count: number; sides: number; modifier: number } {
  const match = formula.match(/(\d+)?d(\d+)(?:\s*([+-])\s*(\d+))?/);
  if (!match) {
    return { count: 1, sides: 6, modifier: 0 };
  }
  
  const count = parseInt(match[1] || '1');
  const sides = parseInt(match[2]);
  const modifierSign = match[3] || '+';
  const modifierValue = parseInt(match[4] || '0');
  const modifier = modifierSign === '-' ? -modifierValue : modifierValue;
  
  return { count, sides, modifier };
}

/**
 * Format entries array from 5etools into clean text
 */
export function formatEntries(entries: EtoolsEntry[]): string {
  if (!Array.isArray(entries)) {
    return typeof entries === 'string' ? entries : '';
  }
  
  return entries
    .map(entry => {
      if (typeof entry === 'string') {
        return entry;
      } else if (entry && typeof entry === 'object' && 'entries' in entry && Array.isArray(entry.entries)) {
        return formatEntries(entry.entries as EtoolsEntry[]);
      } else if (entry && typeof entry === 'object' && 'items' in entry && Array.isArray(entry.items)) {
        return formatEntries(entry.items as EtoolsEntry[]);
      }
      return '';
    })
    .filter(text => text.length > 0)
    .join('\n\n');
}

/**
 * Validation result for schema validation
 */
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validate data against a Zod schema and return detailed results
 */
export function validateWithSchema<T>(
  data: unknown, 
  schema: ZodSchema<T>, 
  context?: string
): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data
    };
  }
  
  const errors = result.error.errors.map(err => {
    const path = err.path.length > 0 ? err.path.join('.') : 'root';
    return `${path}: ${err.message}`;
  });
  
  return {
    success: false,
    errors: context ? errors.map(err => `${context} - ${err}`) : errors
  };
}

/**
 * Validate background data against the background schema
 */
export async function validateBackgroundData(data: unknown): Promise<ValidationResult> {
  try {
    // Import zod and create a simplified background schema inline to avoid circular dependencies
    // Use the canonical background schema for validation

    return validateWithSchema(data, dndBackgroundDataSchema, 'Background Data');
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to validate background data: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Validate spell data against the canonical spell schema
 */
export async function validateSpellData(data: unknown): Promise<ValidationResult> {
  try {
    return validateWithSchema(data, dndSpellDataSchema, 'Spell Data');
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to validate spell data: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Validate wrapper content structure
 */
export interface WrapperValidationResult {
  success: boolean;
  errors?: string[];
  entryErrors?: string[];
  contentErrors?: string[];
}

/**
 * Validate a complete wrapper object (entry + content)
 */
export async function validateWrapperContent(
  wrapper: unknown,
  contentType: 'actor' | 'item' | 'vtt-document',
  documentType?: string
): Promise<WrapperValidationResult> {
  const errors: string[] = [];
  const entryErrors: string[] = [];
  const contentErrors: string[] = [];
  
  // Basic structure validation
  if (!wrapper || typeof wrapper !== 'object') {
    return {
      success: false,
      errors: ['Wrapper must be an object']
    };
  }
  
  const wrapperObj = wrapper as Record<string, unknown>;
  
  // Validate entry structure
  if (!wrapperObj.entry || typeof wrapperObj.entry !== 'object') {
    entryErrors.push('Missing or invalid entry object');
  } else {
    const entry = wrapperObj.entry as Record<string, unknown>;
    if (!entry.name || typeof entry.name !== 'string') {
      entryErrors.push('Entry missing name field');
    }
    if (!entry.type || typeof entry.type !== 'string') {
      entryErrors.push('Entry missing type field');
    }
  }
  
  // Validate content structure
  if (!wrapperObj.content) {
    contentErrors.push('Missing content object');
  } else {
    // For vtt documents, validate specific document types
    if (contentType === 'vtt-document' && documentType) {
      try {
        const contentValidation = await validateContentByDocumentType(wrapperObj.content, documentType);
        if (!contentValidation.success && contentValidation.errors) {
          contentErrors.push(...contentValidation.errors);
        }
      } catch (error) {
        contentErrors.push(`Content validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  const allErrors = [...errors, ...entryErrors, ...contentErrors];
  
  return {
    success: allErrors.length === 0,
    errors: allErrors.length > 0 ? allErrors : undefined,
    entryErrors: entryErrors.length > 0 ? entryErrors : undefined,
    contentErrors: contentErrors.length > 0 ? contentErrors : undefined
  };
}


/**
 * Validate item data against the canonical item schema
 */
export async function validateItemData(data: unknown): Promise<ValidationResult> {
  try {
    return validateWithSchema(data, dndItemDataSchema, 'Item Data');
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to validate item data: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Validate monster data against the canonical monster schema
 */
export async function validateMonsterData(data: unknown): Promise<ValidationResult> {
  try {
    return validateWithSchema(data, dndCreatureDataSchema, 'Monster Data');
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to validate monster data: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Validate class data against the class schema
 */
export async function validateClassData(data: unknown): Promise<ValidationResult> {
  try {
    return validateWithSchema(data, dndCharacterClassDataSchema, 'Class Data');
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to validate class data: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Validate species data against the species schema
 */
export async function validateSpeciesData(data: unknown): Promise<ValidationResult> {
  try {
    return validateWithSchema(data, dndSpeciesDataSchema, 'Species Data');
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to validate species data: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Validate feat data against the feat schema
 */
export async function validateFeatData(data: unknown): Promise<ValidationResult> {
  try {
    return validateWithSchema(data, dndFeatDataSchema, 'Feat Data');
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to validate feat data: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Validate condition data against the condition schema
 */
export async function validateConditionData(data: unknown): Promise<ValidationResult> {
  try {
    // Use the canonical condition schema for validation

    return validateWithSchema(data, dndConditionDataSchema, 'Condition Data');
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to validate condition data: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Validate action data against the action schema
 */
export async function validateActionData(data: unknown): Promise<ValidationResult> {
  try {
    // Use the canonical action schema for validation

    return validateWithSchema(data, dndActionDataSchema, 'Action Data');
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to validate action data: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Validate content based on document type
 */
async function validateContentByDocumentType(content: unknown, documentType: string): Promise<ValidationResult> {
  // For documents with pluginData, extract the relevant data for validation
  let dataToValidate = content;
  
  if (content && typeof content === 'object' && 'pluginData' in content) {
    dataToValidate = content.pluginData;
  }
  
  switch (documentType) {
    case 'background':
      return await validateBackgroundData(dataToValidate);
    case 'spell':
      return await validateSpellData(dataToValidate);
    case 'item':
      return await validateItemData(dataToValidate);
    case 'monster':
      return await validateMonsterData(dataToValidate);
    case 'characterClass':
      return await validateClassData(dataToValidate);
    case 'species':
      return await validateSpeciesData(dataToValidate);
    case 'feat':
      return await validateFeatData(dataToValidate);
    case 'condition':
      return await validateConditionData(dataToValidate);
    case 'action':
      return await validateActionData(dataToValidate);
    default:
      return {
        success: true // For now, pass through unknown document types (rule, language, sense)
      };
  }
}