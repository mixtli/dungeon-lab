import { IGameSystemPluginWeb } from '@dungeon-lab/shared/types/plugin.mjs';
import { WebPlugin } from '@dungeon-lab/shared/base/web.mjs';
import { validateActorData, validateItemData } from '../shared/validation.mjs';
import { dnd5e2024GameSystem } from '../shared/game-system.mjs';
import manifest from '../../manifest.json' with { type: 'json' };

/**
 * D&D 5e 2024 Web Plugin
 * 
 * This plugin implements the D&D 5e 2024 Edition game system for the web client.
 * It provides character sheets, item sheets, and validation functions.
 */
class DnD5e2024WebPlugin extends WebPlugin implements IGameSystemPluginWeb {
  public type = 'gameSystem' as const;
  public gameSystem = dnd5e2024GameSystem;

  constructor() {
    super({
      ...manifest,
      type: 'gameSystem',
      enabled: true
    });
    
    console.log('D&D 5e 2024 Web Plugin initialized');
  }

  /**
   * Get the appropriate actor sheet component for a given actor type
   * @param actorType The actor type
   * @returns The component name, or undefined if not found
   */
  getActorSheet(actorType: string): string | undefined {
    if (actorType === 'character') {
      return 'dnd5e2024-character-sheet';
    } else if (actorType === 'npc') {
      return 'dnd5e2024-npc-sheet';
    }
    return undefined;
  }

  /**
   * Get the appropriate item sheet component for a given item type
   * @param itemType The item type
   * @returns The component name, or undefined if not found
   */
  getItemSheet(itemType: string): string | undefined {
    if (itemType === 'weapon') {
      return 'dnd5e2024-weapon-sheet';
    } else if (itemType === 'spell') {
      return 'dnd5e2024-spell-sheet';
    }
    return undefined;
  }

  // Use actor and item data validation from shared code
  validateActorData = validateActorData;
  validateItemData = validateItemData;
}

// Export an instance of the plugin
export default new DnD5e2024WebPlugin(); 