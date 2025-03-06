import { ServerPlugin, IGameSystemPlugin, IGameSystemRegistration } from '@dungeon-lab/shared/index.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import { characterSchema } from '../shared/types/character.mjs';
import { weaponSchema } from '../shared/types/weapon.mjs';
import { spellSchema } from '../shared/types/spell.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginDir = path.resolve(__dirname, '../..');

const dnd5e2024GameSystem: IGameSystemRegistration = {
  actorTypes: [
    {
      name: 'character',
      description: 'Player character',
      dataSchema: characterSchema,
      uiComponent: 'dnd5e2024-character-sheet'
    },
    {
      name: 'npc',
      description: 'Non-player character',
      dataSchema: characterSchema,
      uiComponent: 'dnd5e2024-npc-sheet'
    }
  ],
  itemTypes: [
    {
      name: 'weapon',
      description: 'Weapon item',
      dataSchema: weaponSchema,
      uiComponent: 'dnd5e2024-weapon-sheet'
    },
    {
      name: 'spell',
      description: 'Spell',
      dataSchema: spellSchema,
      uiComponent: 'dnd5e2024-spell-sheet'
    }
  ]
};

/**
 * D&D 5e 2024 Server Plugin
 */
class DnD5e2024ServerPlugin extends ServerPlugin implements IGameSystemPlugin {
  public type = 'gameSystem' as const;
  public gameSystem: IGameSystemRegistration;

  constructor() {
    super(pluginDir);
    this.gameSystem = dnd5e2024GameSystem;
    
    // Set up routes
    this.router.get('/initiative', (req, res) => {
      // Initiative route handler
      res.json({ message: 'Initiative endpoint' });
    });
  }

  async onLoad(): Promise<void> {
    await super.onLoad();
    console.log('Initializing D&D 5e 2024 server plugin');
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

  validateActorData(actorType: string, data: Record<string, unknown>): boolean {
    if (actorType === 'character' || actorType === 'npc') {
      const result = characterSchema.safeParse(data);
      return result.success;
    }
    return false;
  }

  validateItemData(itemType: string, data: Record<string, unknown>): boolean {
    switch (itemType) {
      case 'weapon': {
        const result = weaponSchema.safeParse(data);
        return result.success;
      }
      case 'spell': {
        const result = spellSchema.safeParse(data);
        return result.success;
      }
      default:
        return false;
    }
  }
}

// Export an instance of the plugin
export default new DnD5e2024ServerPlugin(); 