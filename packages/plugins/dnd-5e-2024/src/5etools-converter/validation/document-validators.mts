/**
 * Typed document validation utilities for 5etools converter
 * 
 * This module provides type-safe validation that combines:
 * 1. Document schema validation (actor, item, vtt-document)
 * 2. Plugin data validation (DnD types)
 * 
 * The validators ensure proper discriminator fields and type safety.
 */

import { z } from 'zod';
import { actorSchema } from '@dungeon-lab/shared/schemas/actor.schema.mjs';
import { itemSchema } from '@dungeon-lab/shared/schemas/item.schema.mjs';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/vtt-document.schema.mjs';
import {
  dndCreatureDataSchema,
  dndItemDataSchema,
  dndSpellDataSchema,
  dndBackgroundDataSchema,
  dndCharacterClassDataSchema,
  dndSpeciesDataSchema,
  dndFeatDataSchema,
  dndConditionDataSchema,
  dndActionDataSchema,
  dndLanguageDataSchema
} from '../../types/dnd/index.mjs';
import { dndRuleDataSchema } from '../../types/dnd/rule.mjs';
import { dndSenseDataSchema } from '../../types/dnd/sense.mjs';

/**
 * Document type discriminator
 */
export type DocumentType = 'actor' | 'item' | 'vtt-document';

/**
 * Map of document types to their corresponding schemas
 */
const DOCUMENT_SCHEMAS = {
  'actor': actorSchema,
  'item': itemSchema,
  'vtt-document': vttDocumentSchema
} as const;

/**
 * Generic function to create a typed document validator
 * 
 * This ensures:
 * - Proper document type discrimination (literal values)
 * - Type-safe plugin data validation
 * - Full type inference
 */
export function createTypedDocumentValidator<T extends z.ZodTypeAny>(
  documentType: DocumentType,
  pluginDataSchema: T
) {
  const baseSchema = DOCUMENT_SCHEMAS[documentType];
  
  return baseSchema.extend({
    pluginData: pluginDataSchema
  });
}

/**
 * Validation result with detailed error reporting
 */
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: string[];
  context?: string;
}

/**
 * Validate data against a schema with detailed error reporting
 */
export function validateWithSchema<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
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
    errors: context ? errors.map(err => `${context} - ${err}`) : errors,
    context
  };
}

// Specific typed validators for common document types

/**
 * Creature document validator (actor + creature plugin data)
 */
export const creatureDocumentValidator = createTypedDocumentValidator('actor', dndCreatureDataSchema);
export type CreatureDocument = z.infer<typeof creatureDocumentValidator>;

/**
 * Item document validator (item + item plugin data) 
 */
export const itemDocumentValidator = createTypedDocumentValidator('item', dndItemDataSchema);
export type ItemDocument = z.infer<typeof itemDocumentValidator>;

/**
 * Spell document validator (vtt-document + spell plugin data)
 */
export const spellDocumentValidator = createTypedDocumentValidator('vtt-document', dndSpellDataSchema);
export type SpellDocument = z.infer<typeof spellDocumentValidator>;

/**
 * Background document validator (vtt-document + background plugin data)
 */
export const backgroundDocumentValidator = createTypedDocumentValidator('vtt-document', dndBackgroundDataSchema);
export type BackgroundDocument = z.infer<typeof backgroundDocumentValidator>;

/**
 * Character class document validator (vtt-document + class plugin data)
 */
export const classDocumentValidator = createTypedDocumentValidator('vtt-document', dndCharacterClassDataSchema);
export type ClassDocument = z.infer<typeof classDocumentValidator>;

/**
 * Species document validator (vtt-document + species plugin data)
 */
export const speciesDocumentValidator = createTypedDocumentValidator('vtt-document', dndSpeciesDataSchema);
export type SpeciesDocument = z.infer<typeof speciesDocumentValidator>;

/**
 * Feat document validator (vtt-document + feat plugin data)
 */
export const featDocumentValidator = createTypedDocumentValidator('vtt-document', dndFeatDataSchema);
export type FeatDocument = z.infer<typeof featDocumentValidator>;

/**
 * Condition document validator (vtt-document + condition plugin data)
 */
export const conditionDocumentValidator = createTypedDocumentValidator('vtt-document', dndConditionDataSchema);
export type ConditionDocument = z.infer<typeof conditionDocumentValidator>;

/**
 * Action document validator (vtt-document + action plugin data)
 */
export const actionDocumentValidator = createTypedDocumentValidator('vtt-document', dndActionDataSchema);
export type ActionDocument = z.infer<typeof actionDocumentValidator>;

/**
 * Language document validator (vtt-document + language plugin data)
 */
export const languageDocumentValidator = createTypedDocumentValidator('vtt-document', dndLanguageDataSchema);
export type LanguageDocument = z.infer<typeof languageDocumentValidator>;

/**
 * Sense document validator (vtt-document + sense plugin data)
 */
export const senseDocumentValidator = createTypedDocumentValidator('vtt-document', dndSenseDataSchema);
export type SenseDocument = z.infer<typeof senseDocumentValidator>;

/**
 * Rule document validator (vtt-document + rule plugin data)
 */
export const ruleDocumentValidator = createTypedDocumentValidator('vtt-document', dndRuleDataSchema);
export type RuleDocument = z.infer<typeof ruleDocumentValidator>;

/**
 * Registry of all document validators by plugin document type
 */
export const DOCUMENT_VALIDATORS: Record<string, z.ZodTypeAny> = {
  // Actor types
  'creature': creatureDocumentValidator,
  
  // Item types  
  'weapon': itemDocumentValidator,
  'armor': itemDocumentValidator,
  'shield': itemDocumentValidator,
  'tool': itemDocumentValidator,
  'gear': itemDocumentValidator,
  
  // VTT document types
  'spell': spellDocumentValidator,
  'background': backgroundDocumentValidator,
  'character-class': classDocumentValidator,
  'species': speciesDocumentValidator,
  'feat': featDocumentValidator,
  'condition': conditionDocumentValidator,
  'action': actionDocumentValidator,
  'language': languageDocumentValidator,
  'sense': senseDocumentValidator,
  'rule': ruleDocumentValidator
} as const;

/**
 * Plugin document type keys
 */
export type PluginDocumentType = 
  | 'creature'
  | 'weapon' | 'armor' | 'shield' | 'tool' | 'gear'
  | 'spell' | 'background' | 'character-class' | 'species' | 'feat' | 'condition' | 'action' | 'language' | 'sense' | 'rule';

/**
 * Get validator for a specific plugin document type
 */
export function getDocumentValidator(pluginDocumentType: PluginDocumentType): z.ZodTypeAny {
  const validator = DOCUMENT_VALIDATORS[pluginDocumentType];
  if (!validator) {
    throw new Error(`No validator found for plugin document type: ${pluginDocumentType}`);
  }
  return validator;
}

/**
 * Validate a document against its appropriate schema
 */
export function validateDocument(
  data: unknown,
  pluginDocumentType: PluginDocumentType,
  context?: string
): ValidationResult {
  const validator = getDocumentValidator(pluginDocumentType);  
  return validateWithSchema(data, validator, context);
}

/**
 * Type guard to check if data is a valid document of specific type
 */
export function isValidDocument<T extends PluginDocumentType>(
  data: unknown,
  pluginDocumentType: T
): data is z.infer<typeof DOCUMENT_VALIDATORS[T]> {
  const result = validateDocument(data, pluginDocumentType);
  return result.success;
}