/**
 * Reference parser for 5etools data
 * Parses various reference formats found in 5etools data and converts them to standardized reference objects
 */
import { generateSlug } from '@dungeon-lab/shared/utils/index.mjs';
import type { EtoolsSpell } from '../../5etools-types/spells.mjs';
import type { EtoolsMonsterSpellcasting } from '../../5etools-types/monsters.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';

/**
 * Parsed reference interface - intermediate format before transformation to ReferenceObject
 */
export interface ParsedReference {
  /** The name/title of the referenced item */
  name: string;
  /** The slug generated from the name */
  slug: string;
  /** The type of reference (spell, condition, item, etc.) */
  type: string;
  /** The source book/document */
  source?: string;
  /** Any additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Parses simple pipe-delimited references like "leather armor|xphb"
 * Commonly found in gear arrays and similar simple reference lists
 */
export function parseSimpleReference(reference: string, defaultType: string = 'item'): ParsedReference {
  const parts = reference.split('|');
  const name = parts[0]?.trim() || '';
  const source = parts[1]?.trim().toLowerCase();

  return {
    name,
    slug: generateSlug(name),
    type: defaultType,
    source
  };
}

/**
 * Parses embedded references like "{@spell Detect Magic|XPHB}"
 * Found throughout monster descriptions, action text, etc.
 */
export function parseEmbeddedReference(reference: string): ParsedReference | null {
  // Match pattern: {@type Name|SOURCE} or {@type Name} or {@type}
  const match = reference.match(/^{@(\w+)(?:\s+([^|}]+))?(?:\|([^}]+))?}/);
  
  if (!match) {
    return null;
  }

  const [, type, name, source] = match;
  
  return {
    name: name?.trim() || '',  // Empty string if no name provided
    slug: name ? generateSlug(name.trim()) : type.toLowerCase(),  // Use type as slug if no name
    type: type.toLowerCase(),
    source: source?.trim().toLowerCase()
  };
}

/**
 * Parses spell references from spellcasting data structures
 * Handles both simple strings and complex spell objects
 */
export function parseSpellReference(spellData: string | EtoolsSpell): ParsedReference | null {
  if (typeof spellData === 'string') {
    // Try parsing as embedded reference first
    const embedded = parseEmbeddedReference(spellData);
    if (embedded) {
      return embedded;
    }
    
    // Fall back to simple reference
    return parseSimpleReference(spellData, 'spell');
  }
  
  // Handle complex spell objects if needed
  if (typeof spellData === 'object' && spellData && 'name' in spellData) {
    const name = spellData.name;
    const source = spellData.source;
    
    return {
      name,
      slug: generateSlug(name),
      type: 'spell',
      source: source?.toLowerCase()
    };
  }
  
  return null;
}

/**
 * Scans text content for embedded references and returns all found references
 * along with their positions for replacement
 */
export interface TextReferenceMatch {
  reference: ParsedReference;
  match: string;
  startIndex: number;
  endIndex: number;
}

export function scanTextForReferences(text: string): TextReferenceMatch[] {
  const matches: TextReferenceMatch[] = [];
  
  // Pattern to match all {@type ...} references
  // Updated to handle both {@type content} and {@type} formats
  const referencePattern = /{@\w+(?:\s+[^}]+)?}/g;
  let match;
  
  while ((match = referencePattern.exec(text)) !== null) {
    const parsed = parseEmbeddedReference(match[0]);
    if (parsed) {
      matches.push({
        reference: parsed,
        match: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  }
  
  return matches;
}

/**
 * Extracts all references from a monster's spellcasting data
 */
export function extractSpellcastingReferences(spellcasting: EtoolsMonsterSpellcasting[]): ParsedReference[] {
  const references: ParsedReference[] = [];
  
  for (const sc of spellcasting) {
    // Check various spell list properties
    const spellLists = [
      sc.spells,
      sc.will,
      sc.daily,
      sc.rest
    ];
    
    for (const spellList of spellLists) {
      if (!spellList) continue;
      
      if (Array.isArray(spellList)) {
        // Simple array of spells
        for (const spell of spellList) {
          const ref = parseSpellReference(spell);
          if (ref) {
            references.push(ref);
          }
        }
      } else if (typeof spellList === 'object') {
        // Object with spell levels (daily: { "1": [...], "3": [...] })
        for (const [level, spells] of Object.entries(spellList)) {
          if (Array.isArray(spells)) {
            for (const spell of spells) {
              const ref = parseSpellReference(spell);
              if (ref) {
                // Add level information to metadata
                ref.metadata = { ...ref.metadata, level: parseInt(level) };
                references.push(ref);
              }
            }
          }
        }
      }
    }
    
    // Also scan header entries for spell references
    if (sc.headerEntries) {
      for (const entry of sc.headerEntries) {
        if (typeof entry === 'string') {
          const textRefs = scanTextForReferences(entry);
          references.push(...textRefs.map(tr => tr.reference));
        }
      }
    }
  }
  
  return references;
}

/**
 * Extracts references from a monster's gear array
 */
export function extractGearReferences(gear: string[]): ParsedReference[] {
  return gear.map(item => parseSimpleReference(item, 'item'));
}

/**
 * Extracts references from condition immunity arrays
 */
export function extractConditionReferences(conditions: string[]): ParsedReference[] {
  return conditions.map(condition => ({
    name: condition,
    slug: generateSlug(condition),
    type: 'condition',
    source: 'xphb' // Default source for base conditions
  }));
}

/**
 * Extracts all references from monster text entries (traits, actions, etc.)
 */
export function extractTextReferences(entries: EtoolsEntry[]): ParsedReference[] {
  const references: ParsedReference[] = [];
  
  for (const entry of entries) {
    if (typeof entry === 'string') {
      const textRefs = scanTextForReferences(entry);
      references.push(...textRefs.map(tr => tr.reference));
    } else if (typeof entry === 'object' && entry) {
      // Handle nested entry structures with type guards
      if ('entries' in entry && entry.entries) {
        references.push(...extractTextReferences(entry.entries));
      }
      if ('items' in entry && entry.items) {
        references.push(...extractTextReferences(entry.items));
      }
    }
  }
  
  return references;
}