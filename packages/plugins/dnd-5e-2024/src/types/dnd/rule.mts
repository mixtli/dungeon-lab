import { z } from 'zod';

/**
 * D&D 5e Rule Runtime Types
 * 
 * These are the canonical runtime types used in MongoDB documents.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * D&D Rule runtime data schema
 * This is the canonical structure for rules in MongoDB
 */
export const dndRuleDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  /** Rule type from 5etools: Core, Optional, Variant, Variant Optional */
  ruleType: z.enum(['core', 'optional', 'variant', 'variant_optional']),
  source: z.string().optional(),
  page: z.number().optional(),
  
  /** Rule category for organization */
  category: z.enum([
    'combat', 'exploration', 'social', 'magic', 'equipment', 'character_creation',
    'advancement', 'conditions', 'environment', 'downtime', 'variant_rules',
    'optional_rules', 'dm_tools', 'definitions'
  ]).optional(),
  
  /** Whether this is a basic rule included in basic rules/SRD */
  isBasicRule: z.boolean().optional(),
  
  /** Subsections within the rule */
  subsections: z.array(z.object({
    name: z.string(),
    description: z.string()
  })).optional(),
  
  /** Related rules that are commonly used together */
  relatedRules: z.array(z.string()).optional(),
  
  /** Prerequisites for using this rule */
  prerequisites: z.object({
    /** Required character level */
    level: z.number().optional(),
    /** Required other rules to be in effect */
    otherRules: z.array(z.string()).optional(),
    /** DM discretion requirements */
    dmApproval: z.boolean().optional()
  }).optional(),
  
  
  /** Examples of rule usage */
  examples: z.array(z.object({
    situation: z.string(),
    ruling: z.string()
  })).optional(),
  
  /** Tags for searchability */
  tags: z.array(z.string()).optional()
});

/**
 * D&D Rule document schema (runtime)
 */
// Note: Rule documents should use the standard vttDocumentSchema from shared
// This is just the plugin data schema
export const dndRuleDocumentSchema = dndRuleDataSchema;

/**
 * Runtime type exports
 */
export type DndRuleData = z.infer<typeof dndRuleDataSchema>;
export type DndRuleDocument = z.infer<typeof dndRuleDocumentSchema>;

/**
 * Core rule categories
 */
export const ruleCategories = [
  'combat', 'exploration', 'social', 'magic', 'equipment', 'character_creation',
  'advancement', 'conditions', 'environment', 'downtime', 'variant_rules',
  'optional_rules', 'dm_tools', 'definitions'
] as const;

export type RuleCategory = typeof ruleCategories[number];