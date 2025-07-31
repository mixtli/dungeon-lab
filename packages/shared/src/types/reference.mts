import { z } from 'zod';
import { documentTypeSchema } from '../schemas/document.schema.mjs';

/**
 * Schema for document references used in cross-document relationships
 * This allows documents to reference other documents by slug, documentType, and source
 * without requiring the target document to exist at creation time
 */
export const documentReferenceSchema = z.object({
  // The target document's slug (e.g., "leather-armor", "fireball")
  slug: z.string().min(1).max(255),
  
  // The target document's type (actor, item, vtt-document)
  documentType: documentTypeSchema,
  
  // The target document's plugin-specific subtype (e.g., "weapon", "spell", "armor")
  pluginDocumentType: z.string().min(1).optional(),
  
  // Source book/module identifier (e.g., "XPHB", "XMM")
  source: z.string().min(1).optional(),
  
  // Additional metadata for the reference
  metadata: z.record(z.string(), z.unknown()).optional()
});

/**
 * TypeScript type for document references
 */
export type DocumentReference = z.infer<typeof documentReferenceSchema>;

/**
 * Schema for reference objects that wrap DocumentReference
 * This is the actual structure used in document data
 */
export const referenceObjectSchema = z.object({
  _ref: documentReferenceSchema,
  _error: z.object({
    reason: z.enum(['not_found', 'ambiguous', 'invalid']),
    candidates: z.array(z.string()).optional(),
    attemptedAt: z.date(),
    message: z.string().optional()
  }).optional()
});

/**
 * Schema for reference objects with error information (failed resolution)
 */
export const referenceObjectWithErrorSchema = z.object({
  _ref: documentReferenceSchema,
  _error: z.object({
    reason: z.enum(['not_found', 'ambiguous', 'invalid']),
    candidates: z.array(z.string()).optional(),
    attemptedAt: z.date(),
    message: z.string().optional()
  }).optional()
});

/**
 * Schema for resolved references - either an ObjectId string or unresolved reference with error
 */
export const resolvedReferenceSchema = z.union([
  z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid ObjectId'), // Resolved ObjectId
  referenceObjectWithErrorSchema // Unresolved reference with optional error info
]);

/**
 * Schema for references that can be in any state - generation, resolution, or failed resolution
 * This is the primary schema for D&D document references
 */
export const referenceOrObjectIdSchema = z.union([
  z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid ObjectId'), // Resolved ObjectId
  referenceObjectSchema // Unresolved reference with optional error info
]);

/**
 * TypeScript type for reference objects
 */  
export type ReferenceObject = z.infer<typeof referenceObjectSchema>;

/**
 * TypeScript type for reference objects with error information
 */
export type ReferenceObjectWithError = z.infer<typeof referenceObjectWithErrorSchema>;

/**
 * TypeScript type for resolved references (ObjectId string or unresolved reference)
 */
export type ResolvedReference = z.infer<typeof resolvedReferenceSchema>;

/**
 * TypeScript type for references in any state (ObjectId string or reference object)
 */
export type ReferenceOrObjectId = z.infer<typeof referenceOrObjectIdSchema>;

/**
 * Helper function to create a document reference
 */
export function createDocumentReference(
  slug: string,
  documentType: 'actor' | 'item' | 'vtt-document',
  options: {
    pluginDocumentType?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  } = {}
): DocumentReference {
  return {
    slug,
    documentType,
    pluginDocumentType: options.pluginDocumentType,
    source: options.source,
    metadata: options.metadata
  };
}

/**
 * Helper function to create a reference object
 */
export function createReferenceObject(
  slug: string,
  documentType: 'actor' | 'item' | 'vtt-document',
  options: {
    pluginDocumentType?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  } = {}
): ReferenceObject {
  return {
    _ref: createDocumentReference(slug, documentType, options)
  };
}

/**
 * Type guard to check if an object is a reference object
 */
export function isReferenceObject(obj: unknown): obj is ReferenceObject {
  return typeof obj === 'object' && obj !== null && '_ref' in obj;
}

/**
 * Type guard to check if a value is a resolved ObjectId string
 */
export function isResolvedObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
}

/**
 * Type guard to check if an object is an unresolved reference (with or without error)
 */
export function isUnresolvedReference(value: unknown): value is ReferenceObjectWithError {
  return typeof value === 'object' && value !== null && '_ref' in value;
}

/**
 * Type guard to check if a reference object has error information
 */
export function hasReferenceError(value: unknown): value is ReferenceObjectWithError {
  return isUnresolvedReference(value) && '_error' in value && value._error !== undefined;
}

/**
 * Extract reference from a mixed value (could be reference object or regular value)
 */
export function extractReference(value: unknown): DocumentReference | null {
  if (isReferenceObject(value)) {
    return value._ref;
  }
  return null;
}

/**
 * Get the actual reference from a resolved value (ObjectId string or unresolved reference)
 */
export function getReference(value: ResolvedReference): string | DocumentReference {
  if (typeof value === 'string') {
    return value; // Already resolved ObjectId
  }
  return value._ref; // Unresolved reference
}

/**
 * Create a reference object with error information
 */
export function createReferenceObjectWithError(
  reference: DocumentReference,
  reason: 'not_found' | 'ambiguous' | 'invalid',
  options: {
    candidates?: string[];
    message?: string;
  } = {}
): ReferenceObjectWithError {
  return {
    _ref: reference,
    _error: {
      reason,
      candidates: options.candidates,
      attemptedAt: new Date(),
      message: options.message
    }
  };
}