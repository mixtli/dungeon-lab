import { IWebPlugin, IPluginConfiguration } from './plugin.mjs';
import { BasePlugin } from './plugin-base.mjs';

/**
 * Base class for web-side plugins
 * This class is safe to use in browser environments
 */
export class WebPlugin extends BasePlugin implements IWebPlugin {
  constructor(config: IPluginConfiguration) {
    super(config);
  }

  async onLoad(): Promise<void> {
    await super.onLoad();
    console.log(`[${this.config.name}] Web plugin loaded`);
  }
} 