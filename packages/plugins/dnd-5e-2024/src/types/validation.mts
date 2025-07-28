/**
 * Validation utilities for D&D 5e plugin types
 */
import { z } from 'zod';
import { dndCharacterDataSchema } from './dnd/character.mjs';
import { dndCreatureDataSchema } from './dnd/creature.mjs';
import { dndSpellDataSchema } from './dnd/spell.mjs';

// Actor data validation
export const validateCharacterData = (data: unknown) => {
  try {
    return { success: true, data: dndCharacterDataSchema.parse(data) };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

export const validateCreatureData = (data: unknown) => {
  try {
    return { success: true, data: dndCreatureDataSchema.parse(data) };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

// Spell validation
export const validateSpellData = (data: unknown) => {
  try {
    return { success: true, data: dndSpellDataSchema.parse(data) };
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
export type ActorData = z.infer<typeof dndCharacterDataSchema> | z.infer<typeof dndCreatureDataSchema>;
export type ItemData = unknown; // Will be defined when item types are complete
export type DocumentData = z.infer<typeof dndSpellDataSchema>; // Will be expanded