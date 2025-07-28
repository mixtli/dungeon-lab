/**
 * Validation utilities for D&D 5e plugin types
 */
import { z } from 'zod';
import { characterDataSchema } from './dnd/character.mjs';
import { dndMonsterDataSchema } from './dnd/monster.mjs';
import { dndNpcDataSchema } from './dnd/npc.mjs';
import { dndSpellDataSchema } from './dnd/spell.mjs';

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
    return { success: true, data: dndMonsterDataSchema.parse(data) };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

export const validateNPCData = (data: unknown) => {
  try {
    return { success: true, data: dndNpcDataSchema.parse(data) };
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
export type ActorData = z.infer<typeof characterDataSchema> | z.infer<typeof dndMonsterDataSchema> | z.infer<typeof dndNpcDataSchema>;
export type ItemData = unknown; // Will be defined when item types are complete
export type DocumentData = z.infer<typeof dndSpellDataSchema>; // Will be expanded