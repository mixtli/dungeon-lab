/**
 * D&D 5th Edition (2024) Plugin - Simplified Version
 * 
 * This plugin implements the basic D&D 5e 2024 character sheet using the new
 * simplified plugin architecture with manifest-based configuration.
 */

import { BaseGameSystemPlugin, ValidationResult } from '@dungeon-lab/shared-ui/types/plugin.mjs';
import type { PluginContext, TokenContextAction, TokenActionContext } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import { validateCharacterData } from './character-validation.mjs';
import { DnD5eTurnManager } from './turn-manager.mjs';
import { DndAbilityCheckHandler, DndAttackRollHandler, DndSavingThrowHandler } from './services/dnd-roll-handler.mjs';
import { DndWeaponAttackHandler, DndWeaponDamageHandler } from './services/dnd-weapon-handlers.mjs';
import { registerPluginStateLifecycle, unregisterPluginStateLifecycle } from '@dungeon-lab/shared/utils/document-state-lifecycle.mjs';
import { 
  dndMoveTokenHandler,
  dndAttackHandler,
  dndLongRestHandler,
  dndShortRestHandler,
  dndUseClassFeatureHandler,
  dndAddConditionHandler,
  dndRemoveConditionHandler,
  dndApplyDamageHandler,
  dndAssignSpellHandler,
  dndHideHandler,
  dndDodgeHandler,
  dndHelpHandler,
  dndDisengageHandler,
  dndSearchHandler,
  dndReadyHandler
} from './handlers/actions/index.mjs';
import { unifiedSpellCastHandler } from './handlers/actions/spell-casting.handler.mjs';

/**
 * D&D 5th Edition (2024) Plugin Implementation - Using Base Class
 */
export class DnD5e2024Plugin extends BaseGameSystemPlugin {
  
  // Add turn manager instance (lazy initialization)
  private _turnManager: DnD5eTurnManager | null = null;
  
  get turnManager(): DnD5eTurnManager {
    if (!this._turnManager) {
      this._turnManager = new DnD5eTurnManager();
    }
    return this._turnManager;
  }
  
  /**
   * Validate data against game system rules
   */
  validate(type: string, data: unknown): ValidationResult {
    console.log(`[${this.manifest.id}] Validating ${type} data`);
    
    switch (type) {
      case 'character':
        return this.validateCharacterData(data);
      default:
        console.warn(`[${this.manifest.id}] Unknown validation type: ${type}`);
        return {
          success: false,
          errors: [`Unknown validation type: ${type}`]
        };
    }
  }
  
  /**
   * Get token grid size for a document (D&D creature size system)
   */
  getTokenGridSize(document: unknown): number {
    try {
      // Check if document has D&D size data
      if (document && typeof document === 'object' && 'pluginData' in document) {
        const pluginData = (document as { pluginData?: Record<string, unknown> }).pluginData;
        
        if (pluginData && typeof pluginData.size === 'string') {
          const dndSize = pluginData.size.toLowerCase();
          
          // Map D&D creature sizes to grid cell multipliers
          switch (dndSize) {
            case 'tiny':
              return 0.5; // Half a grid cell
            case 'small':
            case 'medium':
              return 1; // One grid cell (1x1)
            case 'large':
              return 2; // Four grid cells (2x2)
            case 'huge':
              return 3; // Nine grid cells (3x3)
            case 'gargantuan':
              return 4; // Sixteen grid cells (4x4)
            default:
              console.warn(`[${this.manifest.id}] Unknown D&D size: ${dndSize}, defaulting to medium`);
              return 1;
          }
        }
      }
      
      // Default to medium size (1x1 grid cells)
      return 1;
    } catch (error) {
      console.error(`[${this.manifest.id}] Error getting token grid size:`, error);
      return 1;
    }
  }
  
  /**
   * Register D&D token context actions
   */
  private registerTokenActions(context: PluginContext): void {
    console.log(`[${this.manifest.id}] Registering D&D combat actions as token context actions`);
    
    // Combat Actions
    context.registerTokenAction({
      id: 'dnd5e:dodge',
      label: 'Dodge',
      icon: 'icon-dodge', 
      groupLabel: 'Combat Actions',
      priority: 200,
      condition: (token, gameState) => {
        // Only show for player-controlled tokens during combat
        return token.isPlayerControlled && !!gameState.currentEncounter;
      },
      handler: async (actionContext: TokenActionContext) => {
        await actionContext.pluginContext.requestAction(
          'dnd5e-2024:dodge',
          { targetId: actionContext.selectedToken.documentId },
          { description: 'Take the Dodge action' }
        );
      }
    });
    
    context.registerTokenAction({
      id: 'dnd5e:hide',
      label: 'Hide',
      icon: 'icon-hide',
      groupLabel: 'Combat Actions', 
      priority: 201,
      condition: (token, gameState) => {
        return token.isPlayerControlled && !!gameState.currentEncounter;
      },
      handler: async (actionContext: TokenActionContext) => {
        await actionContext.pluginContext.requestAction(
          'dnd5e-2024:hide',
          { targetId: actionContext.selectedToken.documentId },
          { description: 'Take the Hide action' }
        );
      }
    });
    
    context.registerTokenAction({
      id: 'dnd5e:disengage',
      label: 'Disengage',
      icon: 'icon-disengage',
      groupLabel: 'Combat Actions',
      priority: 202, 
      condition: (token, gameState) => {
        return token.isPlayerControlled && !!gameState.currentEncounter;
      },
      handler: async (actionContext: TokenActionContext) => {
        await actionContext.pluginContext.requestAction(
          'dnd5e-2024:disengage',
          { targetId: actionContext.selectedToken.documentId },
          { description: 'Take the Disengage action' }
        );
      }
    });
    
    context.registerTokenAction({
      id: 'dnd5e:search',
      label: 'Search',
      icon: 'icon-search',
      groupLabel: 'Combat Actions',
      priority: 203,
      condition: (token, gameState) => {
        return token.isPlayerControlled && !!gameState.currentEncounter;
      },
      handler: async (actionContext: TokenActionContext) => {
        await actionContext.pluginContext.requestAction(
          'dnd5e-2024:search',
          { targetId: actionContext.selectedToken.documentId },
          { description: 'Take the Search action' }
        );
      }
    });
    
    context.registerTokenAction({
      id: 'dnd5e:help',
      label: 'Help',
      icon: 'icon-help',
      groupLabel: 'Combat Actions',
      priority: 204,
      condition: (token, gameState) => {
        return token.isPlayerControlled && !!gameState.currentEncounter;
      },
      handler: async (actionContext: TokenActionContext) => {
        // For now, help without a target - could be enhanced later
        await actionContext.pluginContext.requestAction(
          'dnd5e-2024:help',
          { targetId: actionContext.selectedToken.documentId },
          { description: 'Take the Help action' }
        );
      }
    });
    
    context.registerTokenAction({
      id: 'dnd5e:ready',
      label: 'Ready Action',
      icon: 'icon-ready',
      groupLabel: 'Combat Actions',
      priority: 205,
      condition: (token, gameState) => {
        return token.isPlayerControlled && !!gameState.currentEncounter;
      },
      handler: async (actionContext: TokenActionContext) => {
        // Ready action needs more complex UI - for now just basic
        await actionContext.pluginContext.requestAction(
          'dnd5e-2024:ready',
          { 
            targetId: actionContext.selectedToken.documentId,
            readiedActionType: 'attack',
            trigger: 'when an enemy moves within 5 feet'
          },
          { description: 'Ready an action' }
        );
      }
    });
    
    console.log(`[${this.manifest.id}] Registered 6 D&D combat actions as token context actions`);
  }

  /**
   * Plugin initialization
   */
  async onLoad(context?: PluginContext): Promise<void> {
    await super.onLoad(context);
    console.log(`[${this.manifest.id}] Loading D&D 5e 2024 Plugin v${this.manifest.version}`);
    
    if (context) {
      console.log(`[${this.manifest.id}] Plugin context provided - registering handlers`);
      
      // Register D&D roll handlers
      context.registerRollHandler('ability-check', new DndAbilityCheckHandler());
      context.registerRollHandler('attack-roll', new DndAttackRollHandler());
      context.registerRollHandler('saving-throw', new DndSavingThrowHandler());
      
      // Register D&D weapon roll handlers
      context.registerRollHandler('weapon-attack', new DndWeaponAttackHandler());
      context.registerRollHandler('weapon-damage', new DndWeaponDamageHandler());
      
      // Register D&D action handlers
      context.registerActionHandler('move-token', dndMoveTokenHandler);
      context.registerActionHandler('attack', dndAttackHandler);
      context.registerActionHandler('dnd5e-2024:cast-spell', unifiedSpellCastHandler);
      context.registerActionHandler('dnd5e-2024:long-rest', dndLongRestHandler);
      context.registerActionHandler('dnd5e-2024:short-rest', dndShortRestHandler);
      context.registerActionHandler('dnd5e-2024:use-class-feature', dndUseClassFeatureHandler);
      context.registerActionHandler('dnd5e-2024:add-condition', dndAddConditionHandler);
      context.registerActionHandler('dnd5e-2024:remove-condition', dndRemoveConditionHandler);
      context.registerActionHandler('dnd5e-2024:apply-damage', dndApplyDamageHandler);
      context.registerActionHandler('dnd5e-2024:assign-spell', dndAssignSpellHandler);
      
      // Register D&D combat action handlers
      context.registerActionHandler('dnd5e-2024:hide', dndHideHandler);
      context.registerActionHandler('dnd5e-2024:dodge', dndDodgeHandler);
      context.registerActionHandler('dnd5e-2024:help', dndHelpHandler);
      context.registerActionHandler('dnd5e-2024:disengage', dndDisengageHandler);
      context.registerActionHandler('dnd5e-2024:search', dndSearchHandler);
      context.registerActionHandler('dnd5e-2024:ready', dndReadyHandler);
      
      // Register D&D token context actions
      this.registerTokenActions(context);
      
      // Register D&D lifecycle state management patterns
      registerPluginStateLifecycle({
        pluginId: this.manifest.id,
        
        // Reset on turn advancement
        turnReset: {
          turnState: {
            movementUsed: 0,
            actionsUsed: [],
            bonusActionUsed: false,
            reactionUsed: false
          }
        },
        
        // Reset on long rest (session scope)
        sessionReset: {
          spellSlotsUsed: {},
          classFeatureUses: {},
          hitDiceUsed: 0,
          currentHitPoints: null // Will be set to max by long rest handler
        },
        
        // Reset on encounter end
        encounterReset: {
          conditions: [],
          conditionDetails: {},
          concentrationSpell: null,
          temporaryHitPoints: 0
        }
      });
      
      console.log(`[${this.manifest.id}] Roll handlers, action handlers, and lifecycle patterns registered successfully`);
    }
    
    console.log(`[${this.manifest.id}] Plugin loaded successfully`);
  }
  
  /**
   * Plugin cleanup
   */
  async onUnload(): Promise<void> {
    console.log(`[${this.manifest.id}] Unloading D&D 5e 2024 Plugin`);
    
    // Clean up lifecycle state management registration
    unregisterPluginStateLifecycle(this.manifest.id);
    
    console.log(`[${this.manifest.id}] Plugin unloaded successfully`);
  }
  
  /**
   * Legacy validation method for backward compatibility
   * @deprecated Use validate('character', data) instead
   */
  validateCharacterData(data: unknown): ValidationResult {
    console.log(`[${this.manifest.id}] 🔍 PLUGIN VALIDATION METHOD CALLED`);
    console.log(`[${this.manifest.id}] Data structure:`, {
      hasSpecies: !!(data && typeof data === 'object' && 'species' in data),
      speciesFormat: data && typeof data === 'object' && 'species' in data ? (data as Record<string, unknown>).species : undefined,
      hasBackground: !!(data && typeof data === 'object' && 'background' in data),
      backgroundFormat: data && typeof data === 'object' && 'background' in data ? (data as Record<string, unknown>).background : undefined
    });
    
    const result = validateCharacterData(data);
    console.log(`[${this.manifest.id}] 🧪 Validation result:`, result);
    
    return result;
  }
}

// Export only the plugin class as default
// The discovery service expects nothing else
export default DnD5e2024Plugin;