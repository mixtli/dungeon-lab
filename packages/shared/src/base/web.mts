import { BasePlugin } from './plugin.mjs';
import { type IWebPlugin, type IPluginConfiguration } from '../types/plugin.mjs';

/**
 * Base class for web plugins
 * Extends the base plugin with web-specific functionality
 */
export class WebPlugin extends BasePlugin implements IWebPlugin {
  constructor(config: IPluginConfiguration) {
    super(config);
  }

  /**
   * Called when the plugin is loaded
   * This is a good place to register event listeners and initialize resources
   */
  public async onLoad(): Promise<void> {
    await super.onLoad();
    console.log(`[${this.config.name}] Web plugin loaded`);
  }
} 