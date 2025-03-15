import { BasePlugin } from './plugin.mjs';
import { 
  type IWebPlugin, 
  type IPluginConfiguration, 
  type IPluginUIAssets, 
  type IPluginUIAssetPaths 
} from '../types/plugin.mjs';

/**
 * Base class for web plugins
 * Extends the base plugin with web-specific functionality
 */
export class WebPlugin extends BasePlugin implements IWebPlugin {
  protected uiAssets: Map<string, IPluginUIAssets> = new Map();
  
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
  
  /**
   * Get UI asset paths for a specific context
   * This is a legacy method that will be deprecated in favor of direct asset access
   * 
   * @param context - The UI context
   * @returns The UI asset paths for the context, or undefined if not found
   */
  public getUIAssetPaths(context: string): IPluginUIAssetPaths | undefined {
    console.warn(`Plugin ${this.config.id} is using deprecated getUIAssetPaths. Use getUIAssets instead.`);
    // Try to get from uiComponents first (new format)
    if (this.config.uiComponents && this.config.uiComponents[context]) {
      return this.config.uiComponents[context];
    }
    return undefined;
  }
  
  /**
   * Get UI assets for a specific context
   * 
   * @param context - The UI context
   * @returns The UI assets for the context, or undefined if not found
   */
  public getUIAssets(context: string): IPluginUIAssets | undefined {
    // Check if we have direct asset references first
    if (this.uiAssets.has(context)) {
      return this.uiAssets.get(context);
    }
    
    // If no direct assets, return undefined (legacy flow will try to load from manifest)
    console.log(`Plugin ${this.config.id} has no registered UI assets for context: ${context}`);
    return undefined;
  }
  
  /**
   * Register UI assets for a specific context
   * 
   * @param context - The UI context
   * @param assets - The UI assets to register
   */
  public registerUIAssets(context: string, assets: IPluginUIAssets): void {
    console.log(`Plugin ${this.config.id} registering UI assets for context: ${context}`);
    this.uiAssets.set(context, assets);
  }

  /**
   * Check if UI assets are registered for a specific context
   * 
   * @param context - The UI context
   * @returns True if UI assets are registered for the context, false otherwise
   */
  public hasUIAssets(context: string): boolean {
    return this.uiAssets.has(context);
  }

  /**
   * Clear UI assets for a specific context or all contexts
   * 
   * @param context - The UI context, or undefined to clear all contexts
   */
  public clearUIAssets(context?: string): void {
    if (context) {
      this.uiAssets.delete(context);
    } else {
      this.uiAssets.clear();
    }
  }
} 