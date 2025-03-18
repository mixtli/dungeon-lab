import { IGameSystemRegistration, IGameSystemPlugin } from '@dungeon-lab/shared/index.mjs';
import { ServerPlugin } from '@dungeon-lab/shared/base/server.mjs';
import { characterSchema, weaponSchema, spellSchema } from '../shared/types/index.mjs';
import { validateActorData, validateItemData } from '../shared/validation.mjs';
import config from '../../manifest.json' with { type: 'json' };

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

export class DnD5e2024ServerPlugin extends ServerPlugin implements IGameSystemPlugin {
  public type = 'gameSystem' as const;
  public gameSystem = dnd5eGameSystem;

  constructor() {
    super({
      ...config,
      type: 'gameSystem',
      enabled: true
    });
  }

  validateActorData = validateActorData;
  validateItemData = validateItemData;
}

// Export an instance of the plugin
export default new DnD5e2024ServerPlugin(); 