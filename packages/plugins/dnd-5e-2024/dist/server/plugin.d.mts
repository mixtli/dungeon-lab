import { IGameSystemRegistration, ServerPlugin, IGameSystemPlugin } from '@dungeon-lab/shared/index.mjs';
import { validateActorData, validateItemData } from '../shared/validation.mjs';
export declare const dnd5eGameSystem: IGameSystemRegistration;
export declare class DnD5e2024ServerPlugin extends ServerPlugin implements IGameSystemPlugin {
    type: "gameSystem";
    gameSystem: IGameSystemRegistration;
    constructor();
    getActorSheet(actorType: string): string | undefined;
    getItemSheet(itemType: string): string | undefined;
    validateActorData: typeof validateActorData;
    validateItemData: typeof validateItemData;
}
declare const _default: DnD5e2024ServerPlugin;
export default _default;
//# sourceMappingURL=plugin.d.mts.map