import { IGameSystemRegistration } from '@dungeon-lab/shared/index.mjs';
import { characterSchema, weaponSchema, spellSchema } from '../shared/types/index.mjs';

export const dnd5eGameSystem: IGameSystemRegistration = {
  actorTypes: [
    {
      name: 'Character',
      description: 'Player character',
      dataSchema: characterSchema,
      uiComponent: 'DndCharacterSheet'
    }
  ],
  itemTypes: [
    {
      name: 'Weapon',
      description: 'Weapon item',
      dataSchema: weaponSchema,
      uiComponent: 'DndWeaponCard'
    },
    {
      name: 'Spell',
      description: 'Spell item',
      dataSchema: spellSchema,
      uiComponent: 'DndSpellCard'
    }
  ]
}; 