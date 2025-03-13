import { IPlugin, IPluginConfiguration } from '../types/plugin.mjs';
import { IPluginMessage } from '../schemas/websocket-messages.schema.mjs';

/**
 * Base Plugin class that implements IPlugin interface
 * Provides default implementations for plugin lifecycle hooks
 * This class is browser-compatible
 */
export abstract class BasePlugin implements IPlugin {
  public config: IPluginConfiguration;

  constructor(config: IPluginConfiguration) {
    this.config = config;
  }

  async onLoad(): Promise<void> {
    console.log(`[${this.config.name}] Plugin loaded`);
  }

  async onUnload(): Promise<void> {
    console.log(`[${this.config.name}] Plugin unloaded`);
  }

  async onRegister(): Promise<void> {
    console.log(`[${this.config.name}] Plugin registered`);
  }

  async handlePluginMessage(message: IPluginMessage): Promise<void> {
    console.log(`[${this.config.name}] Plugin message received: ${JSON.stringify(message)}`);
  }
} 