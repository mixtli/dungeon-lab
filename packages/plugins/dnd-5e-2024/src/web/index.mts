import { WebPlugin, IGameSystemPluginWeb } from '@dungeon-lab/shared/index.mjs';
import { validateActorData, validateItemData } from '../shared/validation.mjs';
import { dnd5e2024GameSystem } from '../shared/game-system.mjs';

// Hardcoded config to avoid JSON import issue with 'import with' syntax
const config = {
  id: 'dnd-5e-2024',
  name: 'D&D 5e 2024 Edition',
  version: '0.1.0',
  description: 'Implementation of the Dungeons & Dragons 5e 2024 Edition game system',
  author: 'Dungeon Lab Team',
  website: 'https://example.com/dnd5e2024'
};

/**
 * D&D 5e 2024 Web Plugin
 */
class DnD5e2024WebPlugin extends WebPlugin implements IGameSystemPluginWeb {
  public type = 'gameSystem' as const;
  public gameSystem = dnd5e2024GameSystem;

  constructor() {
    super({
      ...config,
      type: 'gameSystem',
      enabled: true
    });
  }

  getActorSheet(actorType: string): string | undefined {
    if (actorType === 'character') {
      return 'dnd5e2024-character-sheet';
    } else if (actorType === 'npc') {
      return 'dnd5e2024-npc-sheet';
    }
    return undefined;
  }

  getItemSheet(itemType: string): string | undefined {
    if (itemType === 'weapon') {
      return 'dnd5e2024-weapon-sheet';
    } else if (itemType === 'spell') {
      return 'dnd5e2024-spell-sheet';
    }
    return undefined;
  }

  validateActorData = validateActorData;
  validateItemData = validateItemData;
}

// Export an instance of the plugin
export default new DnD5e2024WebPlugin(); 