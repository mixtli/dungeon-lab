import { WebPlugin, IGameSystemPluginWeb } from '@dungeon-lab/shared/index.mjs';
import { validateActorData, validateItemData } from '../shared/validation.mjs';
/**
 * D&D 5e 2024 Web Plugin
 */
declare class DnD5e2024WebPlugin extends WebPlugin implements IGameSystemPluginWeb {
    type: "gameSystem";
    gameSystem: import("@dungeon-lab/shared/index.mjs").IGameSystemRegistration;
    constructor();
    getActorSheet(actorType: string): string | undefined;
    getItemSheet(itemType: string): string | undefined;
    validateActorData: typeof validateActorData;
    validateItemData: typeof validateItemData;
}
declare const _default: DnD5e2024WebPlugin;
export default _default;
//# sourceMappingURL=index.d.mts.map