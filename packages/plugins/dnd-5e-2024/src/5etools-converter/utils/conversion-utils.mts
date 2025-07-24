/**
 * Utility functions for 5etools data conversion
 */
import { join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { ETOOLS_DATA_PATH, PLUGIN_CONFIG } from '../../config/constants.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';

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