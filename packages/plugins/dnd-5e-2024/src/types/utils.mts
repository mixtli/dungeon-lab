import { z } from 'zod';

/**
 * Document reference schema for both runtime and compendium data
 * In compendium format: no id field
 * In runtime format: includes id field with MongoDB document ID
 */
export const documentReferenceSchema = z.object({
  slug: z.string().min(1),
  type: z.string().min(1), // e.g., "vtt-document", "actor", "item"
  pluginType: z.string().min(1), // e.g., "skill", "feat", "condition"
  source: z.string().min(1), // e.g., "xphb", "phb"
  metadata: z.record(z.string(), z.unknown()).optional(), // Additional context (variants, etc.)
  id: z.string().optional() // MongoDB ID - present in runtime, omitted in compendium
});

export type DocumentReference = z.infer<typeof documentReferenceSchema>;

/**
 * Utility type that recursively replaces all 'id' fields with '_ref' fields
 * This ensures compendium types have the exact same structure as runtime types,
 * except document references use _ref objects instead of MongoDB IDs
 */
export type CompendiumType<T> = {
  [K in keyof T]: K extends 'id' 
    ? never  // Remove id field
    : T[K] extends object
      ? T[K] extends Array<infer U>
        ? Array<CompendiumType<U>>  // Handle arrays recursively
        : T[K] extends Record<string, unknown>
          ? CompendiumType<T[K]>      // Handle objects recursively  
          : T[K]  // Keep non-object types as-is (Date, etc.)
      : T[K]  // Keep primitive values as-is
} & (T extends { id: unknown } ? { _ref: DocumentReference } : Record<string, never>);


/**
 * Utility to create a document reference object (for compendium format - no id)
 */
export function createDocumentReference(
  slug: string,
  type: string,
  pluginType: string,
  source: string,
  metadata?: Record<string, unknown>
): DocumentReference {
  return {
    slug,
    type,
    pluginType,
    source,
    ...(metadata && { metadata })
  };
}

/**
 * Generate a slug from a name string
 * Converts to lowercase, replaces spaces/special chars with dashes
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')         // Replace spaces with dashes
    .replace(/-+/g, '-')          // Collapse multiple dashes
    .replace(/^-|-$/g, '');       // Remove leading/trailing dashes
}