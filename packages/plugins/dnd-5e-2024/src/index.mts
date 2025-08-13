/**
 * D&D 5th Edition (2024) Plugin - Simplified Version
 * 
 * This plugin implements the basic D&D 5e 2024 character sheet using the new
 * simplified plugin architecture with manifest-based configuration.
 */

import { BaseGameSystemPlugin, ValidationResult, PluginContext } from '@dungeon-lab/shared-ui/types/plugin.mjs';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';
import { validateCharacterData } from './character-validation.mjs';
import { DnD5eTurnManager } from './turn-manager.mjs';
import type { DndCharacterData } from './types/dnd/character.mjs';
import type { DndCreatureData } from './types/dnd/creature.mjs';
import { DndTurnStateUtils, DND_RESOURCE_IDS, type DndTurnState } from './turn-state.mjs';

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
        return validateCharacterData(data);
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
  getTokenGridSize(document: BaseDocument): number {
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
   * Get movement limit for a document in grid cells per turn (D&D movement system)
   */
  getMovementLimit(document: BaseDocument): number {
    try {
      // Handle characters: movement speed is in pluginData.attributes.movement.walk
      if (document.documentType === 'character') {
        const data = document.pluginData as DndCharacterData;
        const walkSpeed = data.attributes?.movement?.walk || 30; // Default to 30 feet
        return Math.floor(walkSpeed / 5); // D&D: 5 feet per grid cell
      }
      
      // Handle actors/creatures: movement speed is in pluginData.speed.walk  
      if (document.documentType === 'actor') {
        const data = document.pluginData as DndCreatureData;
        const walkSpeed = data.speed?.walk || 30; // Default to 30 feet
        return Math.floor(walkSpeed / 5); // D&D: 5 feet per grid cell
      }
      
      // Default fallback: 30 feet = 6 cells
      return 6;
    } catch (error) {
      console.error(`[${this.manifest.id}] Error calculating movement limit:`, error);
      return 6; // Safe default
    }
  }
  
  /**
   * Get initial turn state data for a document (D&D-specific)
   */
  getInitialTurnState(document: BaseDocument): Record<string, unknown> {
    const initialState = DndTurnStateUtils.createInitialState();
    
    // Set legendary actions for creatures that have them
    if (document.documentType === 'actor') {
      const data = document.pluginData as DndCreatureData;
      if (data.legendaryActionCount) {
        initialState.actions.legendaryActionsMax = data.legendaryActionCount;
      }
    }
    
    // TODO: Initialize spell slots based on character class/level
    // TODO: Initialize class resources based on character build
    
    return initialState as unknown as Record<string, unknown>;
  }
  
  /**
   * Check if a resource can be used by a document (D&D-specific validation)
   */
  canUseResource(_document: BaseDocument, resourceId: string, _amount: number, currentTurnState: Record<string, unknown>): boolean {
    const dndState = currentTurnState as unknown as DndTurnState;
    
    // Handle action economy
    const resourceValues = Object.values(DND_RESOURCE_IDS) as string[];
    if (resourceValues.includes(resourceId)) {
      switch (resourceId) {
        case DND_RESOURCE_IDS.ACTION:
        case DND_RESOURCE_IDS.BONUS_ACTION:
        case DND_RESOURCE_IDS.REACTION:
        case DND_RESOURCE_IDS.LEGENDARY_ACTION:
          return DndTurnStateUtils.canUseAction(dndState, resourceId);
          
        case DND_RESOURCE_IDS.SPELL_SLOT_1:
        case DND_RESOURCE_IDS.SPELL_SLOT_2:
        case DND_RESOURCE_IDS.SPELL_SLOT_3:
        case DND_RESOURCE_IDS.SPELL_SLOT_4:
        case DND_RESOURCE_IDS.SPELL_SLOT_5:
        case DND_RESOURCE_IDS.SPELL_SLOT_6:
        case DND_RESOURCE_IDS.SPELL_SLOT_7:
        case DND_RESOURCE_IDS.SPELL_SLOT_8:
        case DND_RESOURCE_IDS.SPELL_SLOT_9: {
          const spellLevel = parseInt(resourceId.split('-')[2]);
          return DndTurnStateUtils.canUseSpellSlot(dndState, spellLevel);
        }
          
        default:
          return false;
      }
    }
    
    return false;
  }
  
  /**
   * Use a resource and update turn state (D&D-specific logic)
   */
  useResource(_document: BaseDocument, resourceId: string, _amount: number, currentTurnState: Record<string, unknown>): Record<string, unknown> {
    let dndState = currentTurnState as unknown as DndTurnState;
    
    // Handle action economy
    const resourceValues = Object.values(DND_RESOURCE_IDS) as string[];
    if (resourceValues.includes(resourceId)) {
      switch (resourceId) {
        case DND_RESOURCE_IDS.ACTION:
        case DND_RESOURCE_IDS.BONUS_ACTION:
        case DND_RESOURCE_IDS.REACTION:
        case DND_RESOURCE_IDS.LEGENDARY_ACTION:
          dndState = DndTurnStateUtils.useAction(dndState, resourceId);
          break;
          
        case DND_RESOURCE_IDS.SPELL_SLOT_1:
        case DND_RESOURCE_IDS.SPELL_SLOT_2:
        case DND_RESOURCE_IDS.SPELL_SLOT_3:
        case DND_RESOURCE_IDS.SPELL_SLOT_4:
        case DND_RESOURCE_IDS.SPELL_SLOT_5:
        case DND_RESOURCE_IDS.SPELL_SLOT_6:
        case DND_RESOURCE_IDS.SPELL_SLOT_7:
        case DND_RESOURCE_IDS.SPELL_SLOT_8:
        case DND_RESOURCE_IDS.SPELL_SLOT_9: {
          const spellLevel = parseInt(resourceId.split('-')[2]);
          dndState = DndTurnStateUtils.useSpellSlot(dndState, spellLevel);
          break;
        }
      }
    }
    
    return dndState as unknown as Record<string, unknown>;
  }
  
  /**
   * Reset turn state at start of new turn (D&D-specific reset logic)
   */
  resetTurnState(_document: BaseDocument, currentTurnState: Record<string, unknown>): Record<string, unknown> {
    const dndState = currentTurnState as unknown as DndTurnState;
    const resetState = DndTurnStateUtils.resetForNewTurn(dndState);
    return resetState as unknown as Record<string, unknown>;
  }
  
  /**
   * Plugin initialization
   */
  async onLoad(context?: PluginContext): Promise<void> {
    await super.onLoad(context);
    console.log(`[${this.manifest.id}] Loading D&D 5e 2024 Plugin v${this.manifest.version}`);
    if (context) {
      console.log(`[${this.manifest.id}] Plugin context provided - API access available`);
    }
    console.log(`[${this.manifest.id}] Plugin loaded successfully`);
  }
  
  /**
   * Plugin cleanup
   */
  async onUnload(): Promise<void> {
    console.log(`[${this.manifest.id}] Unloading D&D 5e 2024 Plugin`);
  }
  
}

// Export only the plugin class as default
// The discovery service expects nothing else
export default DnD5e2024Plugin;