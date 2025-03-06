import { PluginActionMessage } from '@dungeon-lab/shared';

export interface PluginActionResult {
  stateUpdate?: {
    type: string;
    state: Record<string, unknown>;
  };
  forward?: boolean;
}

export interface GamePlugin {
  id: string;
  name: string;
  version: string;
  handleAction(message: PluginActionMessage): Promise<PluginActionResult | void>;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

export class PluginManager {
  private plugins: Map<string, GamePlugin> = new Map();

  async registerPlugin(plugin: GamePlugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already registered`);
    }

    try {
      await plugin.initialize();
      this.plugins.set(plugin.id, plugin);
      console.log(`Plugin ${plugin.name} v${plugin.version} registered successfully`);
    } catch (error) {
      console.error(`Failed to initialize plugin ${plugin.id}:`, error);
      throw error;
    }
  }

  async unregisterPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    try {
      await plugin.cleanup();
      this.plugins.delete(pluginId);
      console.log(`Plugin ${plugin.name} unregistered successfully`);
    } catch (error) {
      console.error(`Failed to cleanup plugin ${pluginId}:`, error);
      throw error;
    }
  }

  getPlugin(pluginId: string): GamePlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getPlugins(): GamePlugin[] {
    return Array.from(this.plugins.values());
  }

  async cleanupAll(): Promise<void> {
    const errors: Error[] = [];
    for (const plugin of this.plugins.values()) {
      try {
        await plugin.cleanup();
      } catch (error) {
        errors.push(error as Error);
      }
    }
    this.plugins.clear();

    if (errors.length > 0) {
      throw new AggregateError(errors, 'Failed to cleanup all plugins');
    }
  }
} 