import { ServerPlugin, IGameSystemPlugin, IGameSystemRegistration } from '@dungeon-lab/shared/index.mjs';
/**
 * D&D 5e 2024 Server Plugin
 */
declare class DnD5e2024ServerPlugin extends ServerPlugin implements IGameSystemPlugin {
    type: "gameSystem";
    gameSystem: IGameSystemRegistration;
    constructor();
    onLoad(): Promise<void>;
    getActorSheet(actorType: string): string | undefined;
    getItemSheet(itemType: string): string | undefined;
    validateActorData(actorType: string, data: Record<string, unknown>): boolean;
    validateItemData(itemType: string, data: Record<string, unknown>): boolean;
}
declare const _default: DnD5e2024ServerPlugin;
export default _default;
//# sourceMappingURL=index.d.mts.map