/**
 * D&D 5e Action Handlers Export
 * 
 * Centralized export point for all D&D 5e action handlers.
 * These handlers integrate with the multi-handler system to provide
 * D&D-specific validation and state management.
 */

export { dndMoveTokenHandler } from './move-token.handler.js';
export { dndAttackHandler } from './attack.handler.js';
export { dndLongRestHandler } from './long-rest.handler.js';
export { dndShortRestHandler } from './short-rest.handler.js';
export { dndUseClassFeatureHandler } from './use-class-feature.handler.js';
export { dndAddConditionHandler } from './add-condition.handler.js';
export { dndRemoveConditionHandler } from './remove-condition.handler.js';
export { dndApplyDamageHandler } from './apply-damage.handler.js';
export { dndAssignSpellHandler } from './assign-spell.handler.js';

// Combat Actions (Phase 3D)
export { dndHideHandler } from './hide.handler.js';
export { dndDodgeHandler } from './dodge.handler.js';
export { dndHelpHandler } from './help.handler.js';
export { dndDisengageHandler } from './disengage.handler.js';
export { dndSearchHandler } from './search.handler.js';
export { dndReadyHandler } from './ready.handler.js';

// Weapon attack action
export { weaponAttackHandler, validateWeaponAttack } from './weapon-attack.handler.js';

// Equipment actions
export { equipItemActionHandler } from './equip-item.handler.js';
export { unequipItemActionHandler } from './unequip-item.handler.js';

// Re-export types for convenience
export type { ActionHandler, ActionValidationResult } from '@dungeon-lab/shared-ui/types/plugin-context.js';