import { IPlugin, IPluginConfiguration } from './plugin.mjs';

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
} 