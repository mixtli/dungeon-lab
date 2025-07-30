/**
 * Centralized markup processor for 5etools text content
 * 
 * Handles all 5etools markup tags like:
 * - {@spell Fireball|PHB}
 * - {@damage 1d6}
 * - {@condition charmed}
 * - {@dice 2d6+3}
 * - {@item Longsword|PHB}
 * - {@creature Adult Red Dragon|MM}
 * - {@dc 15}
 * - etc.
 */

import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import type { ReferenceObject } from '@dungeon-lab/shared/types/index.mjs';

/**
 * Processing options for markup conversion
 */
export interface MarkupProcessingOptions {
  /** Whether to extract references as structured data */
  extractReferences?: boolean;
  /** Whether to convert markup to clean text */
  cleanText?: boolean;
  /** Whether to preserve original markup */
  preserveMarkup?: boolean;
  /** Context for error reporting */
  context?: string;
}

/**
 * Result of markup processing
 */
export interface MarkupProcessingResult {
  /** Processed text content */
  text: string;
  /** Extracted references (if extractReferences: true) */
  references?: ReferenceObject[];
  /** Original markup patterns found */
  originalMarkup?: string[];
}

/**
 * Parsed markup tag
 */
interface ParsedMarkupTag {
  /** Full original tag */
  original: string;
  /** Tag type (spell, damage, condition, etc.) */
  type: string;
  /** Main content */
  content: string;
  /** Source reference (if present) */
  source?: string;
  /** Start position in text */
  start: number;
  /** End position in text */
  end: number;
}

/**
 * Markup tag patterns
 */
const MARKUP_PATTERNS = {
  /** Generic pattern for all {@type content|source} tags */
  GENERIC: /{@(\w+)(?:\s+([^}|]+?))?(?:\|([^}]+?))?}/g,
  
  /** Specific patterns for common tags */
  SPELL: /{@spell\s+([^}|]+?)(?:\|([^}]+?))?}/g,
  DAMAGE: /{@damage\s+([^}]+?)}/g,
  DICE: /{@dice\s+([^}]+?)}/g,
  CONDITION: /{@condition\s+([^}|]+?)(?:\|([^}]+?))?}/g,
  ITEM: /{@item\s+([^}|]+?)(?:\|([^}]+?))?}/g,
  CREATURE: /{@creature\s+([^}|]+?)(?:\|([^}]+?))?}/g,
  DC: /{@dc\s+(\d+?)}/g,
  HIT: /{@h}/g,
  ATTACK: /{@atk\s+([^}]+?)}/g,
  SKILL: /{@skill\s+([^}|]+?)(?:\|([^}]+?))?}/g,
  SENSE: /{@sense\s+([^}|]+?)(?:\|([^}]+?))?}/g,
  LANGUAGE: /{@language\s+([^}|]+?)(?:\|([^}]+?))?}/g,
  VARIANTRULE: /{@variantrule\s+([^}|]+?)(?:\|([^}]+?))?}/g
};

/**
 * Parse all markup tags in text
 */
function parseMarkupTags(text: string): ParsedMarkupTag[] {
  const tags: ParsedMarkupTag[] = [];
  let match;
  
  // Reset regex lastIndex
  MARKUP_PATTERNS.GENERIC.lastIndex = 0;
  
  while ((match = MARKUP_PATTERNS.GENERIC.exec(text)) !== null) {
    const [original, type, content, source] = match;
    
    tags.push({
      original,
      type: type.toLowerCase(),
      content: content?.trim() || '',
      source: source?.trim(),
      start: match.index,
      end: match.index + original.length
    });
  }
  
  // Sort by start position (for replacement)
  return tags.sort((a, b) => a.start - b.start);
}

/**
 * Convert a markup tag to clean text
 */
function tagToCleanText(tag: ParsedMarkupTag): string {
  switch (tag.type) {
    case 'h':
      return 'hit';
    
    case 'dc':
      return `DC ${tag.content}`;
    
    case 'damage':
    case 'dice':
      return tag.content;
    
    case 'spell':
    case 'condition':
    case 'item':
    case 'creature':
    case 'skill':
    case 'sense':
    case 'language':
    case 'variantrule':
      return tag.content || tag.type;
    
    case 'atk':
      return `${tag.content} attack`;
    
    default:
      // For unknown tags, return the content if available, otherwise the type
      return tag.content || tag.type;
  }
}

/**
 * Convert a markup tag to a reference object
 */
function tagToReference(tag: ParsedMarkupTag): ReferenceObject | null {
  // Only create references for certain tag types
  const referenceTypes = ['spell', 'condition', 'item', 'creature', 'skill', 'sense', 'language', 'variantrule'];
  
  if (!referenceTypes.includes(tag.type) || !tag.content) {
    return null;
  }
  
  // Map tag types to their correct document types
  let documentType: 'actor' | 'item' | 'vtt-document';
  if (tag.type === 'item') {
    documentType = 'item';
  } else if (tag.type === 'creature') {
    documentType = 'actor';
  } else {
    // spell, condition, skill, sense, language, variantrule
    documentType = 'vtt-document';
  }
  
  return {
    _ref: {
      slug: tag.content.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      documentType,
      pluginType: tag.type,
      source: tag.source?.toLowerCase() || 'xphb'
    }
  };
}

/**
 * Process markup in text content
 */
export function processMarkup(
  text: string, 
  options: MarkupProcessingOptions = {}
): MarkupProcessingResult {
  const {
    extractReferences = false,
    cleanText = true,
    preserveMarkup = false,
    context: _context
  } = options;
  
  if (preserveMarkup) {
    return {
      text,
      references: [],
      originalMarkup: []
    };
  }
  
  const tags = parseMarkupTags(text);
  const references: ReferenceObject[] = [];
  const originalMarkup: string[] = [];
  let processedText = text;
  
  // Process tags in reverse order to maintain positions
  for (let i = tags.length - 1; i >= 0; i--) {
    const tag = tags[i];
    originalMarkup.unshift(tag.original);
    
    // Extract reference if requested
    if (extractReferences) {
      const ref = tagToReference(tag);
      if (ref) {
        references.unshift(ref);
      }
    }
    
    // Replace tag with clean text if requested
    if (cleanText) {
      const cleanContent = tagToCleanText(tag);
      processedText = processedText.slice(0, tag.start) + cleanContent + processedText.slice(tag.end);
    }
  }
  
  return {
    text: processedText.trim(),
    references: extractReferences ? references : undefined,
    originalMarkup: originalMarkup.length > 0 ? originalMarkup : undefined
  };
}

/**
 * Process an array of 5etools entries
 */
export function processEntries(
  entries: EtoolsEntry[],
  options: MarkupProcessingOptions = {}
): MarkupProcessingResult {
  if (!Array.isArray(entries)) {
    return {
      text: typeof entries === 'string' ? processMarkup(entries, options).text : '',
      references: [],
      originalMarkup: []
    };
  }
  
  const results: MarkupProcessingResult[] = [];
  
  for (const entry of entries) {
    if (typeof entry === 'string') {
      results.push(processMarkup(entry, options));
    } else if (entry && typeof entry === 'object') {
      // Handle complex entry structures
      if ('entries' in entry && Array.isArray(entry.entries)) {
        results.push(processEntries(entry.entries, options));
      } else if ('items' in entry && Array.isArray(entry.items)) {
        results.push(processEntries(entry.items, options));
      } else if ('rows' in entry && Array.isArray(entry.rows)) {
        // Handle table entries
        const tableText = entry.rows
          .flat()
          .filter(cell => typeof cell === 'string')
          .join(' ');
        results.push(processMarkup(tableText, options));
      }
    }
  }
  
  // Combine all results
  const combinedText = results.map(r => r.text).filter(t => t.length > 0).join('\n\n');
  const combinedReferences = results.flatMap(r => r.references || []);
  const combinedMarkup = results.flatMap(r => r.originalMarkup || []);
  
  return {
    text: combinedText,
    references: options.extractReferences ? combinedReferences : undefined,
    originalMarkup: combinedMarkup.length > 0 ? combinedMarkup : undefined
  };
}

/**
 * Utility function to clean text (remove markup, keep content)
 */
export function cleanMarkupText(text: string): string {
  return processMarkup(text, { cleanText: true }).text;
}

/**
 * Utility function to extract references from text
 */
export function extractMarkupReferences(text: string): ReferenceObject[] {
  return processMarkup(text, { extractReferences: true }).references || [];
}

/**
 * Utility function to clean entries and return text
 */
export function entriesToCleanText(entries: EtoolsEntry[]): string {
  return processEntries(entries, { cleanText: true }).text;
}

/**
 * Utility function to extract all references from entries
 */
export function extractEntriesReferences(entries: EtoolsEntry[]): ReferenceObject[] {
  return processEntries(entries, { extractReferences: true }).references || [];
}