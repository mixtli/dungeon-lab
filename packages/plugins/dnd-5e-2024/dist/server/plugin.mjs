import { ServerPlugin } from '@dungeon-lab/shared/index.mjs';
import { characterSchema, weaponSchema, spellSchema } from '../shared/types/index.mjs';
import { validateActorData, validateItemData } from '../shared/validation.mjs';
import config from '../../config.json' with { type: 'json' };
export const dnd5eGameSystem = {
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
export class DnD5e2024ServerPlugin extends ServerPlugin {
    type = 'gameSystem';
    gameSystem = dnd5eGameSystem;
    constructor() {
        super({
            ...config,
            type: 'gameSystem',
            enabled: true
        });
    }
    getActorSheet(actorType) {
        if (actorType === 'character') {
            return 'DndCharacterSheet';
        }
        return undefined;
    }
    getItemSheet(itemType) {
        if (itemType === 'weapon') {
            return 'DndWeaponCard';
        }
        else if (itemType === 'spell') {
            return 'DndSpellCard';
        }
        return undefined;
    }
    validateActorData = validateActorData;
    validateItemData = validateItemData;
}
// Export an instance of the plugin
export default new DnD5e2024ServerPlugin();
//# sourceMappingURL=plugin.mjs.map