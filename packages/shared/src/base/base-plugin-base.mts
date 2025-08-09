import type { PluginManifest } from '../schemas/plugin-manifest.schema.mjs';
import type { PluginContextBase } from '../types/plugin-context-base.mjs';
import type { GameSystemPluginBase, ValidationResult } from '../types/plugin-base.mjs';

/**
 * Base class for game system plugins (Vue-free version)
 * 
 * This class provides common functionality that all plugins need:
 * - Manifest management through constructor injection
 * - Plugin context storage and access
 * - Standardized error handling
 * 
 * Vue-specific functionality (component loading) is available in the 
 * BaseGameSystemPlugin class from @dungeon-lab/shared-ui.
 */
export abstract class BaseGameSystemPluginBase implements GameSystemPluginBase {
  /** Plugin manifest containing all metadata and capabilities */
  readonly manifest: PluginManifest;
  
  /** Plugin context for API access and shared services */
  protected context?: PluginContextBase;
  
  /**
   * Constructor accepting manifest from plugin discovery
   * @param manifest Plugin manifest loaded from manifest.json
   */
  constructor(manifest: PluginManifest) {
    this.manifest = manifest;
  }
  
  // Abstract methods that concrete plugins must implement
  
  /**
   * Validate data against game system rules
   * Each plugin implements its own validation logic
   */
  abstract validate(type: string, data: unknown): ValidationResult;
  
  /**
   * Get the plugin context for API access
   * @returns Plugin context if available
   */
  getContext(): PluginContextBase | undefined {
    return this.context;
  }
  
  /**
   * Plugin initialization lifecycle method
   * Base implementation stores the context - concrete plugins should call super.onLoad()
   */
  async onLoad(context?: PluginContextBase): Promise<void> {
    this.context = context;
  }
  
  /**
   * Plugin cleanup lifecycle method
   */
  abstract onUnload(): Promise<void>;
}