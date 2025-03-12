import { ServerPlugin } from '@dungeon-lab/shared/types/plugin-base.mjs';
import config from '../config.json' with { type: 'json' };
class TestDiceRollerPlugin extends ServerPlugin {
    async onLoad() {
        await super.onLoad();
        // Roll some test dice when the plugin loads
        const results = this.rollDice(3, 6);
        console.log(`[${this.config.name}] Test roll (3d6):`, results);
    }
    async handleAction(message) {
        if (message.data.actionType === 'roll') {
            const count = message.data.metadata?.count || 1;
            const sides = message.data.metadata?.sides || 20;
            const results = this.rollDice(count, sides);
            return {
                stateUpdate: {
                    type: 'roll',
                    state: {
                        results,
                        total: results.reduce((sum, val) => sum + val, 0)
                    }
                },
                forward: true // Broadcast to all clients
            };
        }
    }
    rollDice(count, sides) {
        return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    }
}
// Create and export a plugin instance with its config
export default new TestDiceRollerPlugin({
    ...config,
    type: 'extension',
    enabled: true
});
//# sourceMappingURL=index.mjs.map