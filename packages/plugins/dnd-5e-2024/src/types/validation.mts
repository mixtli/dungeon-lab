/**
 * Validation utilities for D&D 5e plugin types
 */
import { z } from 'zod';
import { characterDataSchema } from './character.mjs';
import { monsterSchema, npcSchema } from './actor.mjs';
import { spellSchema } from './spell.mjs';

// Actor data validation
export const validateCharacterData = (data: unknown) => {
  try {
    return { success: true, data: characterDataSchema.parse(data) };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

export const validateMonsterData = (data: unknown) => {
  try {
    return { success: true, data: monsterSchema.parse(data) };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

export const validateNPCData = (data: unknown) => {
  try {
    return { success: true, data: npcSchema.parse(data) };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

// Spell validation
export const validateSpellData = (data: unknown) => {
  try {
    return { success: true, data: spellSchema.parse(data) };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

// Generic validation result type
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
}

// Export union types for convenience
export type ActorData = z.infer<typeof characterDataSchema> | z.infer<typeof monsterSchema> | z.infer<typeof npcSchema>;
export type ItemData = unknown; // Will be defined when item types are complete
export type DocumentData = z.infer<typeof spellSchema>; // Will be expanded