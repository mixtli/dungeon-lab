import { WebPlugin } from '@dungeon-lab/shared/index.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import { characterSchema } from '../shared/types/character.mjs';
import { weaponSchema } from '../shared/types/weapon.mjs';
import { spellSchema } from '../shared/types/spell.mjs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginDir = path.resolve(__dirname, '../..');
const dnd5e2024GameSystem = {
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
 * D&D 5e 2024 Web Plugin
 */
class DnD5e2024WebPlugin extends WebPlugin {
    type = 'gameSystem';
    gameSystem;
    constructor() {
        super(pluginDir);
        this.gameSystem = dnd5e2024GameSystem;
    }
    getActorSheet(actorType) {
        if (actorType === 'character') {
            return 'dnd5e2024-character-sheet';
        }
        else if (actorType === 'npc') {
            return 'dnd5e2024-npc-sheet';
        }
        return undefined;
    }
    getItemSheet(itemType) {
        if (itemType === 'weapon') {
            return 'dnd5e2024-weapon-sheet';
        }
        else if (itemType === 'spell') {
            return 'dnd5e2024-spell-sheet';
        }
        return undefined;
    }
    validateActorData(actorType, data) {
        if (actorType === 'character' || actorType === 'npc') {
            const result = characterSchema.safeParse(data);
            return result.success;
        }
        return false;
    }
    validateItemData(itemType, data) {
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
export default new DnD5e2024WebPlugin();
//# sourceMappingURL=index.mjs.map