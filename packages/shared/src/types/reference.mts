import { z } from 'zod';
import { documentTypeSchema } from '../schemas/document.schema.mjs';

/**
 * Schema for document references used in cross-document relationships
 * This allows documents to reference other documents by slug, type, and source
 * without requiring the target document to exist at creation time
 */
export const documentReferenceSchema = z.object({
  // The target document's slug (e.g., "leather-armor", "fireball")
  slug: z.string().min(1).max(255),
  
  // The target document's type (actor, item, vtt-document)
  type: documentTypeSchema,
  
  // The target document's plugin-specific subtype (e.g., "weapon", "spell", "armor")
  pluginType: z.string().min(1).optional(),
  
  // Source book/module identifier (e.g., "xphb", "xmm")
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
  _ref: documentReferenceSchema
});

/**
 * TypeScript type for reference objects
 */  
export type ReferenceObject = z.infer<typeof referenceObjectSchema>;

/**
 * Helper function to create a document reference
 */
export function createDocumentReference(
  slug: string,
  type: 'actor' | 'item' | 'vtt-document',
  options: {
    pluginType?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  } = {}
): DocumentReference {
  return {
    slug,
    type,
    pluginType: options.pluginType,
    source: options.source,
    metadata: options.metadata
  };
}

/**
 * Helper function to create a reference object
 */
export function createReferenceObject(
  slug: string,
  type: 'actor' | 'item' | 'vtt-document',
  options: {
    pluginType?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  } = {}
): ReferenceObject {
  return {
    _ref: createDocumentReference(slug, type, options)
  };
}

/**
 * Type guard to check if an object is a reference object
 */
export function isReferenceObject(obj: unknown): obj is ReferenceObject {
  return typeof obj === 'object' && obj !== null && '_ref' in obj;
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