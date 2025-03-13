import { IWebPlugin, IPluginConfiguration, IPluginUIAssets, IPluginUIAssetPaths } from '../types/plugin.mjs';
import { BasePlugin } from './plugin.mjs';

/**
 * Base class for web-side plugins
 * This class is safe to use in browser environments
 */
export class WebPlugin extends BasePlugin implements IWebPlugin {
  protected uiAssets: Map<string, IPluginUIAssets> = new Map();
  
  constructor(config: IPluginConfiguration) {
    super(config);
  }

  async onLoad(): Promise<void> {
    await super.onLoad();
    console.log(`[${this.config.name}] Web plugin loaded`);
  }
  
  /**
   * Get the paths to UI assets for a specific context
   * @param context The UI context
   * @returns The UI asset paths for the specified context, or undefined if not available
   */
  getUIAssetPaths(context: string): IPluginUIAssetPaths | undefined {
    // First try the new uiComponents format
    if (this.config.uiComponents && this.config.uiComponents[context]) {
      return this.config.uiComponents[context];
    }
    return undefined;
  }
  
  /**
   * Get UI assets for a specific context
   * @param context The UI context
   * @returns The UI assets for the specified context, or undefined if not available
   */
  getUIAssets(context: string): IPluginUIAssets | undefined {
    return this.uiAssets.get(context);
  }
  
  /**
   * Register UI assets for a specific context
   * @param context The UI context
   * @param assets The UI assets
   */
  registerUIAssets(context: string, assets: IPluginUIAssets): void {
    this.uiAssets.set(context, assets);
  }
} 