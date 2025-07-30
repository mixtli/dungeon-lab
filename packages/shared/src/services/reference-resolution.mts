import { Types } from 'mongoose';
import { 
  DocumentReference, 
  isReferenceObject, 
  createReferenceObjectWithError
} from '../types/reference.mjs';

/**
 * Index for fast compendium entry lookups during reference resolution
 */
export interface CompendiumIndex {
  /** Primary lookup: slug + type + source -> ObjectId */
  bySlugTypeSource: Map<string, Types.ObjectId>;
  
  /** Alternative lookups for fuzzy matching */
  bySlugType: Map<string, Types.ObjectId[]>;  // multiple sources
  bySlug: Map<string, Types.ObjectId[]>;      // multiple types/sources
  
  /** Reverse lookup: ObjectId -> document info */
  byObjectId: Map<string, {
    slug: string;
    documentType: string;
    pluginType?: string;
    source?: string;
  }>;
}

/**
 * Result of a reference resolution attempt
 */
export interface ResolutionAttempt {
  success: boolean;
  objectId?: Types.ObjectId;
  reason?: 'not_found' | 'ambiguous' | 'invalid';
  candidates?: Types.ObjectId[];
}

/**
 * Results of resolving references in a compendium
 */
export interface ResolutionResult {
  resolved: number;
  failed: number;
  ambiguous: number;
  errors: ResolutionError[];
}

/**
 * Information about a failed reference resolution
 */
export interface ResolutionError {
  documentId: Types.ObjectId;
  fieldPath: string;
  reference: DocumentReference;
  reason: 'not_found' | 'ambiguous' | 'invalid';
  candidates?: Types.ObjectId[];
}

/**
 * Interface for compendium entries that can be indexed
 */
export interface IndexableCompendiumEntry {
  _id: Types.ObjectId;
  slug: string;
  documentType: string;
  pluginType?: string;
  source?: string;
  pluginData: Record<string, unknown>;
}

/**
 * Builds an index for fast reference resolution within a compendium
 */
export function buildCompendiumIndex(entries: IndexableCompendiumEntry[]): CompendiumIndex {
  const index: CompendiumIndex = {
    bySlugTypeSource: new Map(),
    bySlugType: new Map(),
    bySlug: new Map(),
    byObjectId: new Map()
  };
  
  for (const entry of entries) {
    const key = `${entry.slug}:${entry.documentType}:${entry.source || ''}`;
    const keyType = `${entry.slug}:${entry.documentType}`;
    
    // Primary index
    index.bySlugTypeSource.set(key, entry._id);
    
    // Alternative indices
    if (!index.bySlugType.has(keyType)) {
      index.bySlugType.set(keyType, []);
    }
    index.bySlugType.get(keyType)!.push(entry._id);
    
    if (!index.bySlug.has(entry.slug)) {
      index.bySlug.set(entry.slug, []);
    }
    index.bySlug.get(entry.slug)!.push(entry._id);
    
    // Reverse index
    index.byObjectId.set(entry._id.toString(), {
      slug: entry.slug,
      documentType: entry.documentType,
      pluginType: entry.pluginType,
      source: entry.source
    });
  }
  
  return index;
}

/**
 * Attempts to resolve a single reference using the provided index
 */
export function resolveReference(
  ref: DocumentReference,
  index: CompendiumIndex
): ResolutionAttempt {
  // Try exact match first
  const exactKey = `${ref.slug}:${ref.documentType}:${ref.source || ''}`;
  const exactMatch = index.bySlugTypeSource.get(exactKey);
  
  if (exactMatch) {
    return { success: true, objectId: exactMatch };
  }
  
  // Try without source
  const typeKey = `${ref.slug}:${ref.documentType}`;
  const typeMatches = index.bySlugType.get(typeKey);
  
  if (typeMatches && typeMatches.length === 1) {
    return { success: true, objectId: typeMatches[0] };
  }
  
  if (typeMatches && typeMatches.length > 1) {
    return {
      success: false,
      reason: 'ambiguous',
      candidates: typeMatches
    };
  }
  
  // Try slug only (very fuzzy)
  const slugMatches = index.bySlug.get(ref.slug);
  if (slugMatches && slugMatches.length === 1) {
    // Single match across all types - probably safe
    return { success: true, objectId: slugMatches[0] };
  }
  
  return { success: false, reason: 'not_found' };
}

/**
 * Processes a value recursively to find and resolve references
 * Returns the updated value and tracks resolution statistics
 */
export function processValueForReferences(
  value: unknown,
  index: CompendiumIndex,
  result: ResolutionResult,
  documentId: Types.ObjectId,
  fieldPath: string = ''
): unknown {
  if (isReferenceObject(value)) {
    const resolution = resolveReference(value._ref, index);
    
    if (resolution.success) {
      result.resolved++;
      // Replace with resolved ObjectId string
      return resolution.objectId!.toString();
    } else {
      // Handle resolution failure
      if (resolution.reason === 'ambiguous') {
        result.ambiguous++;
      } else {
        result.failed++;
      }
      
      result.errors.push({
        documentId,
        fieldPath,
        reference: value._ref,
        reason: resolution.reason!,
        candidates: resolution.candidates
      });
      
      // Return reference object with error information
      return createReferenceObjectWithError(
        value._ref,
        resolution.reason!,
        {
          candidates: resolution.candidates?.map(id => id.toString()),
          message: getErrorMessage(resolution.reason!, value._ref)
        }
      );
    }
  }
  
  if (Array.isArray(value)) {
    return value.map((item, arrayIndex) => 
      processValueForReferences(
        item,
        index,
        result,
        documentId,
        `${fieldPath}[${arrayIndex}]`
      )
    );
  }
  
  if (value && typeof value === 'object') {
    const processed: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      processed[key] = processValueForReferences(
        val,
        index,
        result,
        documentId,
        fieldPath ? `${fieldPath}.${key}` : key
      );
    }
    return processed;
  }
  
  return value;
}

/**
 * Generates a user-friendly error message for resolution failures
 */
function getErrorMessage(reason: 'not_found' | 'ambiguous' | 'invalid', ref: DocumentReference): string {
  switch (reason) {
    case 'not_found':
      return `Could not find ${ref.documentType} "${ref.slug}"${ref.source ? ` from source "${ref.source}"` : ''} in compendium`;
    case 'ambiguous':
      return `Multiple entries found for ${ref.documentType} "${ref.slug}". Please specify source to disambiguate`;
    case 'invalid':
      return `Invalid reference: ${ref.documentType} "${ref.slug}"`;
    default:
      return `Unknown resolution error for ${ref.documentType} "${ref.slug}"`;
  }
}

/**
 * Type guard to check if an entry needs reference resolution
 */
export function hasUnresolvedReferences(entry: IndexableCompendiumEntry): boolean {
  return containsReferenceObjects(entry.pluginData);
}

/**
 * Recursively checks if an object contains any reference objects
 */
function containsReferenceObjects(obj: unknown): boolean {
  if (isReferenceObject(obj)) {
    return true;
  }
  
  if (Array.isArray(obj)) {
    return obj.some(item => containsReferenceObjects(item));
  }
  
  if (obj && typeof obj === 'object') {
    return Object.values(obj).some(val => containsReferenceObjects(val));
  }
  
  return false;
}