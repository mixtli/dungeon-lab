import { IGameSystemPluginWeb } from '@dungeon-lab/shared/types/plugin.mjs';
import { WebPlugin } from '@dungeon-lab/shared/base/web.mjs';
import { validateActorData, validateItemData } from '../shared/validation.mjs';
/**
 * D&D 5e 2024 Web Plugin
 *
 * This plugin implements the D&D 5e 2024 Edition game system for the web client.
 * It provides character sheets, item sheets, and validation functions.
 */
declare class DnD5e2024WebPlugin extends WebPlugin implements IGameSystemPluginWeb {
    type: "gameSystem";
    gameSystem: import("@dungeon-lab/shared/types/plugin.mjs").IGameSystemRegistration;
    constructor(config?: {
        id: string;
        name: string;
        version: string;
        description: string;
        author: string;
        website: string;
        type: string;
        enabled: boolean;
        serverEntryPoint: string;
        clientEntryPoint: string;
        uiComponents: {
            characterCreation: {
                template: string;
                styles: string;
                script: string;
                partials: {};
            };
        };
    });
    /**
     * Load and register all UI assets for this plugin
     */
    private loadAndRegisterUIAssets;
    /**
     * Get the appropriate actor sheet component for a given actor type
     * @param actorType The actor type
     * @returns The component name, or undefined if not found
     */
    getActorSheet(actorType: string): string | undefined;
    /**
     * Get the appropriate item sheet component for a given item type
     * @param itemType The item type
     * @returns The component name, or undefined if not found
     */
    getItemSheet(itemType: string): string | undefined;
    validateActorData: typeof validateActorData;
    validateItemData: typeof validateItemData;
}
export default DnD5e2024WebPlugin;
//# sourceMappingURL=index.d.mts.map