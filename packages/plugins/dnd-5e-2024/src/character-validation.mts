/**
 * D&D 5e Character Data Validation
 * 
 * Provides Zod-based validation for D&D character data to ensure
 * all character data conforms to the proper schema before saving.
 */

import { z } from 'zod';
import { dndCharacterDataSchema } from './types/dnd/character.mjs';
import type { ValidationResult } from '@dungeon-lab/shared/types/plugin.mjs';

/**
 * Validates character data against the D&D 5e 2024 schema
 * 
 * @param data - Character data to validate
 * @returns ValidationResult with success status and validated data or errors
 */
export function validateCharacterData(data: any): ValidationResult {
  console.log('🔍 Validating character data:', data);
  try {
    const result = dndCharacterDataSchema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    } else {
      // Extract error messages from Zod errors
      const errors = result.error.errors.map(err => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      });
      
      return {
        success: false,
        errors
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Validates partial character data (for incremental validation)
 * Uses deepPartial to allow incomplete data during character creation
 */
export function validatePartialCharacterData(data: any): ValidationResult {
  try {
    const partialSchema = dndCharacterDataSchema.deepPartial();
    const result = partialSchema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    } else {
      const errors = result.error.errors.map(err => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      });
      
      return {
        success: false,
        errors
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: [`Partial validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Type guard to check if data is valid D&D character data
 */
export function isValidDndCharacterData(data: any): data is z.infer<typeof dndCharacterDataSchema> {
  return validateCharacterData(data).success;
}