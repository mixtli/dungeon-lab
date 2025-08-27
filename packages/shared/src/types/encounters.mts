import { z } from 'zod';
import {
  // Encounter schemas
  encounterSettingsSchema,
  encounterSchema,
  createEncounterSchema,
  updateEncounterSchema,
  encounterEventSchema,
  
  // Permission and validation schemas
  encounterPermissionsSchema,
  validationResultSchema,
  actionValidationSchema,
  movementValidationSchema
} from '../schemas/encounters.schema.mjs';

// Import token types from separate file
import { Token } from './tokens.mjs';


// ============================================================================
// ENCOUNTER TYPES
// ============================================================================

export type EncounterSettings = z.infer<typeof encounterSettingsSchema>;
export type IEncounter = z.infer<typeof encounterSchema>;
export type CreateEncounterData = z.infer<typeof createEncounterSchema>;
export type UpdateEncounterData = z.infer<typeof updateEncounterSchema>;
export type EncounterEvent = z.infer<typeof encounterEventSchema>;

// Additional context type that's not directly schema-based (defined after IEncounter type)
export interface ActionContext {
  actor: Token;
  target?: Token;
  encounter: IEncounter;
  round: number;
  turn: number;
}

// ============================================================================
// PERMISSION TYPES
// ============================================================================

export type EncounterPermissions = z.infer<typeof encounterPermissionsSchema>;

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export type EncounterValidationResult = z.infer<typeof validationResultSchema>;
export type ActionValidation = z.infer<typeof actionValidationSchema>;
export type MovementValidation = z.infer<typeof movementValidationSchema>;

 