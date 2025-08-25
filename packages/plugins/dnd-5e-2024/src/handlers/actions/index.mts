/**
 * D&D 5e Action Handlers Export
 * 
 * Centralized export point for all D&D 5e action handlers.
 * These handlers integrate with the multi-handler system to provide
 * D&D-specific validation and state management.
 */

export { dndMoveTokenHandler } from './move-token.handler.mjs';
export { dndAttackHandler } from './attack.handler.mjs';
export { dndLongRestHandler } from './long-rest.handler.mjs';
export { dndShortRestHandler } from './short-rest.handler.mjs';
export { dndUseClassFeatureHandler } from './use-class-feature.handler.mjs';
export { dndAddConditionHandler } from './add-condition.handler.mjs';
export { dndRemoveConditionHandler } from './remove-condition.handler.mjs';
export { dndApplyDamageHandler } from './apply-damage.handler.mjs';
export { dndAssignSpellHandler } from './assign-spell.handler.mjs';

// Combat Actions (Phase 3D)
export { dndHideHandler } from './hide.handler.mjs';
export { dndDodgeHandler } from './dodge.handler.mjs';
export { dndHelpHandler } from './help.handler.mjs';
export { dndDisengageHandler } from './disengage.handler.mjs';
export { dndSearchHandler } from './search.handler.mjs';
export { dndReadyHandler } from './ready.handler.mjs';

// Weapon attack action
export { weaponAttackHandler, validateWeaponAttack } from './weapon-attack.handler.mjs';

// Re-export types for convenience
export type { ActionHandler, ActionValidationResult } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';