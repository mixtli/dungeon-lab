import { BasePlugin } from './plugin.mjs';
import { type IWebPlugin, type IPluginConfiguration } from '../types/plugin.mjs';
import { type IPluginComponent } from '../types/plugin-component.mjs';

/**
 * Base class for web plugins
 * Extends the base plugin with web-specific functionality
 */
export class WebPlugin extends BasePlugin implements IWebPlugin {
  private readonly components = new Map<string, IPluginComponent>();
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

  async onUnload(): Promise<void> {
    // Clean up components
    this.components.clear();
    await super.onUnload();
  }

  /**
   * Register a component with the plugin
   * @param id The component ID
   * @param component The component instance
   */
  protected registerComponent(component: IPluginComponent): void {
    this.components.set(component.id, component);
  }

  /**
   * Load a component by ID
   * @param componentId The component ID
   * @returns The component instance or undefined if not found
   */
  loadComponent(componentId: string): IPluginComponent | undefined {
    return this.components.get(componentId);
  }
} 