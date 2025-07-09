import { z } from 'zod';
import {
  // Position and movement schemas
  
  // Initiative schemas
  initiativeEntrySchema,
  initiativeTrackerSchema,
  
  // Combat action schemas
  ActionTypeEnum,
  ActionCategoryEnum,
  actionTargetSchema,
  combatActionSchema,
  actionResultSchema,
  
  // Effect schemas
  EffectTypeEnum,
  effectSchema,
  effectApplicationSchema,
  
  // Encounter schemas
  EncounterStatusEnum,
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
// POSITION AND MOVEMENT TYPES
// ============================================================================


// ============================================================================
// INITIATIVE TYPES
// ============================================================================

export type InitiativeEntry = z.infer<typeof initiativeEntrySchema>;
export type InitiativeTracker = z.infer<typeof initiativeTrackerSchema>;

// ============================================================================
// COMBAT ACTION TYPES
// ============================================================================

export type ActionType = z.infer<typeof ActionTypeEnum>;
export type ActionCategory = z.infer<typeof ActionCategoryEnum>;
export type ActionTarget = z.infer<typeof actionTargetSchema>;
export type CombatAction = z.infer<typeof combatActionSchema>;
export type ActionResult = z.infer<typeof actionResultSchema>;

// ============================================================================
// ENCOUNTER TYPES
// ============================================================================

export type EncounterStatus = z.infer<typeof EncounterStatusEnum>;
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
// EFFECT TYPES
// ============================================================================

export type EffectType = z.infer<typeof EffectTypeEnum>;
export type Effect = z.infer<typeof effectSchema>;
export type EffectApplication = z.infer<typeof effectApplicationSchema>;

// ============================================================================
// PERMISSION TYPES
// ============================================================================

export type EncounterPermissions = z.infer<typeof encounterPermissionsSchema>;

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export type ValidationResult = z.infer<typeof validationResultSchema>;
export type ActionValidation = z.infer<typeof actionValidationSchema>;
export type MovementValidation = z.infer<typeof movementValidationSchema>;

 