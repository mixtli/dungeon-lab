import { WebPlugin, IGameSystemPlugin, IGameSystemRegistration } from '@dungeon-lab/shared/index.mjs';
/**
 * D&D 5e 2024 Web Plugin
 */
declare class DnD5e2024WebPlugin extends WebPlugin implements IGameSystemPlugin {
    type: "gameSystem";
    gameSystem: IGameSystemRegistration;
    constructor();
    getActorSheet(actorType: string): string | undefined;
    getItemSheet(itemType: string): string | undefined;
    validateActorData(actorType: string, data: Record<string, unknown>): boolean;
    validateItemData(itemType: string, data: Record<string, unknown>): boolean;
}
declare const _default: DnD5e2024WebPlugin;
export default _default;
//# sourceMappingURL=index.d.mts.map