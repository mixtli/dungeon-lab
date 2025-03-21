import { IGameSystemRegistration } from '@dungeon-lab/shared/index.mjs';
import { characterSchema, weaponSchema, spellSchema } from './types/index.mjs';
import { characterClassSchema } from './schemas/character-class.schema.mjs';

export const dnd5e2024GameSystem: IGameSystemRegistration = {
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
    },
  ],
  documentTypes: [
    {
      name: 'characterClass',
      description: 'Character Class',
      dataSchema: characterClassSchema,
    }
  ]
  
}; 