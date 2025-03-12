import { ServerPlugin } from '@dungeon-lab/shared/types/plugin-base.mjs';
import type { IPluginActionMessage } from '@dungeon-lab/shared/schemas/websocket-messages.schema.mjs';
declare class TestDiceRollerPlugin extends ServerPlugin {
    onLoad(): Promise<void>;
    handleAction(message: IPluginActionMessage): Promise<{
        stateUpdate: {
            type: string;
            state: {
                results: number[];
                total: number;
            };
        };
        forward: boolean;
    } | undefined>;
    private rollDice;
}
declare const _default: TestDiceRollerPlugin;
export default _default;
