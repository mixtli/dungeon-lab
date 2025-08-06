/**
 * Utility for resolving compendium entry references to display names
 * 
 * This module provides functions to resolve ObjectId strings and reference objects
 * to actual names from compendium entries, useful for displaying tool names, spell names, etc.
 * 
 * Supports both static resolution (with pre-loaded data) and dynamic resolution (with API calls).
 */

import type { ICompendiumEntry } from '../types/index.mjs';
import type { ReferenceOrObjectId } from '../types/reference.mjs';
import { isResolvedObjectId, isReferenceObject } from '../types/reference.mjs';

interface CompendiumEntryLike {
  id: string;
  entry: {
    name: string;
  };
  content?: {
    name?: string;
  };
}

interface ReferenceResolverOptions {
  /** Fallback text when reference cannot be resolved */
  fallback?: string;
  /** Whether to return the ObjectId if name cannot be found */
  returnIdOnFail?: boolean;
}

/**
 * Resolves an ObjectId string to a display name using a compendium entries map
 * 
 * @param objectId The ObjectId string to resolve
 * @param entriesMap Map of ObjectId -> CompendiumEntry
 * @param options Resolution options
 * @returns The resolved name or fallback/ObjectId
 */
export function resolveCompendiumReference(
  objectId: string,
  entriesMap: Map<string, CompendiumEntryLike>,
  options: ReferenceResolverOptions = {}
): string {
  const { fallback = 'Unknown', returnIdOnFail = false } = options;
  
  const entry = entriesMap.get(objectId);
  if (!entry) {
    return returnIdOnFail ? objectId : fallback;
  }
  
  // Try to get name from entry.name first, then content.name as fallback
  return entry.entry?.name || entry.content?.name || (returnIdOnFail ? objectId : fallback);
}

/**
 * Resolves multiple ObjectId strings to display names
 * 
 * @param objectIds Array of ObjectId strings to resolve
 * @param entriesMap Map of ObjectId -> CompendiumEntry
 * @param options Resolution options
 * @returns Array of resolved names
 */
export function resolveMultipleCompendiumReferences(
  objectIds: string[],
  entriesMap: Map<string, CompendiumEntryLike>,
  options: ReferenceResolverOptions = {}
): string[] {
  return objectIds.map(id => resolveCompendiumReference(id, entriesMap, options));
}

/**
 * Creates a Map from an array of compendium entries for efficient lookups
 * 
 * @param entries Array of compendium entries
 * @returns Map with ObjectId as key and entry as value
 */
export function createCompendiumMap(entries: CompendiumEntryLike[]): Map<string, CompendiumEntryLike> {
  return new Map(entries.map(entry => [entry.id, entry]));
}

/**
 * Type guard to check if a value is a valid ObjectId string
 * 
 * @param value Value to check
 * @returns True if value is a valid ObjectId string
 */
export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
}

/**
 * Resolves a mixed reference (ObjectId string or reference object) to a display name
 * 
 * @param reference ObjectId string, reference object, or other value
 * @param entriesMap Map of ObjectId -> CompendiumEntry  
 * @param options Resolution options
 * @returns Resolved name or fallback
 */
export function resolveMixedReference(
  reference: unknown,
  entriesMap: Map<string, CompendiumEntryLike>,
  options: ReferenceResolverOptions = {}
): string {
  // If it's an ObjectId string, resolve it
  if (isObjectId(reference)) {
    return resolveCompendiumReference(reference, entriesMap, options);
  }
  
  // If it's a reference object with _ref, try to extract a name or slug
  if (typeof reference === 'object' && reference !== null && '_ref' in reference) {
    const ref = reference as { _ref: { slug?: string; [key: string]: unknown } };
    return ref._ref.slug || options.fallback || 'Unknown Reference';
  }
  
  // If it's already a string (but not ObjectId), return it as-is
  if (typeof reference === 'string') {
    return reference;
  }
  
  // For other types, return fallback
  return options.fallback || 'Unknown';
}

// ===== DYNAMIC RESOLUTION WITH COMPENDIUM CLIENT =====

/**
 * Dynamic resolution options for API-based reference resolution
 */
interface DynamicReferenceResolverOptions extends ReferenceResolverOptions {
  /** Cache resolved entries to avoid duplicate API calls */
  cache?: Map<string, string>;
}

/**
 * Interface for compendium client to avoid importing client package
 */
interface CompendiumClientLike {
  getCompendiumEntry(entryId: string): Promise<ICompendiumEntry>;
  getAllCompendiumEntries(params: Record<string, string | number | boolean>): Promise<{
    entries: ICompendiumEntry[];
    total: number;
    page: number;
    limit: number;
  }>;
}

/**
 * Resolves a referenceOrObjectIdSchema value to a display name using CompendiumsClient
 * 
 * Handles both ObjectId strings and reference objects according to user specification:
 * - For ObjectId strings: uses getCompendiumEntry() endpoint
 * - For reference objects: uses getAllCompendiumEntries() with filter parameters
 * 
 * @param reference ReferenceOrObjectId value to resolve
 * @param compendiumClient CompendiumsClient instance for API calls
 * @param options Resolution options with caching support
 * @returns Promise resolving to the display name
 */
export async function resolveReferenceOrObjectId(
  reference: ReferenceOrObjectId,
  compendiumClient: CompendiumClientLike,
  options: DynamicReferenceResolverOptions = {}
): Promise<string> {
  const { fallback = 'Unknown', returnIdOnFail = false, cache } = options;
  
  // Check cache first
  const cacheKey = typeof reference === 'string' ? reference : JSON.stringify(reference);
  if (cache && cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }
  
  try {
    let resolvedName: string;
    
    if (isResolvedObjectId(reference)) {
      // ObjectId string - use direct getCompendiumEntry endpoint
      const entry = await compendiumClient.getCompendiumEntry(reference);
      resolvedName = extractEntryName(entry) || (returnIdOnFail ? reference : fallback);
      
    } else if (isReferenceObject(reference)) {
      // Reference object - use getAllCompendiumEntries with filter parameters
      const ref = reference._ref;
      const filterParams: Record<string, string | number | boolean> = {};
      
      if (ref.slug) filterParams.slug = ref.slug;
      if (ref.documentType) filterParams.documentType = ref.documentType;
      if (ref.pluginDocumentType) filterParams.pluginDocumentType = ref.pluginDocumentType;
      if (ref.source) filterParams.source = ref.source;
      
      const response = await compendiumClient.getAllCompendiumEntries(filterParams);
      const entries = response.entries;
      
      if (entries.length === 0) {
        resolvedName = returnIdOnFail ? ref.slug || 'Unknown Reference' : fallback;
      } else if (entries.length === 1) {
        resolvedName = extractEntryName(entries[0]) || (returnIdOnFail ? ref.slug || 'Unknown Reference' : fallback);
      } else {
        // Multiple matches - try to find exact match by slug
        const exactMatch = entries.find(entry => 
          (entry.content && typeof entry.content === 'object' && 'slug' in entry.content && entry.content.slug === ref.slug) ||
          (entry.entry && typeof entry.entry === 'object' && 'slug' in entry.entry && entry.entry.slug === ref.slug)
        );
        if (exactMatch) {
          resolvedName = extractEntryName(exactMatch) || (returnIdOnFail ? ref.slug || 'Unknown Reference' : fallback);
        } else {
          // Use first match but log ambiguity
          console.warn(`Multiple compendium entries found for reference:`, ref, `Using first match.`);
          resolvedName = extractEntryName(entries[0]) || (returnIdOnFail ? ref.slug || 'Unknown Reference' : fallback);
        }
      }
      
    } else {
      // Unexpected type
      resolvedName = fallback;
    }
    
    // Cache the result
    if (cache) {
      cache.set(cacheKey, resolvedName);
    }
    
    return resolvedName;
    
  } catch (error) {
    console.error('Failed to resolve compendium reference:', reference, error);
    return returnIdOnFail && typeof reference === 'string' ? reference : fallback;
  }
}

/**
 * Resolves multiple referenceOrObjectIdSchema values in parallel
 * 
 * @param references Array of ReferenceOrObjectId values to resolve
 * @param compendiumClient CompendiumsClient instance for API calls
 * @param options Resolution options with caching support
 * @returns Promise resolving to array of display names
 */
export async function resolveMultipleReferences(
  references: ReferenceOrObjectId[],
  compendiumClient: CompendiumClientLike,
  options: DynamicReferenceResolverOptions = {}
): Promise<string[]> {
  // Use shared cache for batch resolution
  const cache = options.cache || new Map<string, string>();
  const resolveOptions = { ...options, cache };
  
  // Resolve all references in parallel
  const resolutionPromises = references.map(ref => 
    resolveReferenceOrObjectId(ref, compendiumClient, resolveOptions)
  );
  
  return Promise.all(resolutionPromises);
}

/**
 * Helper function to extract name from a compendium entry
 * Tries multiple name fields in order of preference
 */
function extractEntryName(entry: ICompendiumEntry): string | null {
  // Try content.name first (plugin data)
  if (entry.content && typeof entry.content === 'object' && 'name' in entry.content) {
    const name = entry.content.name;
    if (typeof name === 'string' && name.trim()) {
      return name.trim();
    }
  }
  
  // Try entry.name (document name)
  if (entry.entry && typeof entry.entry === 'object' && 'name' in entry.entry) {
    const name = entry.entry.name;
    if (typeof name === 'string' && name.trim()) {
      return name.trim();
    }
  }
  
  // Try top-level name field
  if ('name' in entry && typeof entry.name === 'string') {
    const name = entry.name;
    if (name.trim()) {
      return name.trim();
    }
  }
  
  return null;
}