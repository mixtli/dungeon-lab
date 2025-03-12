import { WebPlugin } from '@dungeon-lab/shared/index.mjs';
import { validateActorData, validateItemData } from '../shared/validation.mjs';
import { dnd5e2024GameSystem } from '../shared/game-system.mjs';
import config from '../../config.json' with { type: 'json' };
/**
 * D&D 5e 2024 Web Plugin
 */
class DnD5e2024WebPlugin extends WebPlugin {
    type = 'gameSystem';
    gameSystem = dnd5e2024GameSystem;
    constructor() {
        super({
            ...config,
            type: 'gameSystem',
            enabled: true
        });
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
    validateActorData = validateActorData;
    validateItemData = validateItemData;
}
// Export an instance of the plugin
export default new DnD5e2024WebPlugin();
//# sourceMappingURL=index.mjs.map