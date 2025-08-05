import type { Component } from 'vue';
import type { PluginManifest } from '../schemas/plugin-manifest.schema.mjs';
import type { PluginContext } from '../types/plugin-context.mjs';
import type { GameSystemPlugin, ValidationResult } from '../types/plugin.mjs';

/**
 * Base class for game system plugins
 * 
 * This class provides common functionality that all plugins need:
 * - Dynamic component loading from the plugin's components directory
 * - Manifest management through constructor injection
 * - Component caching for performance
 * - Plugin context storage and access
 * - Standardized error handling
 * 
 * Plugin developers should extend this class and implement only the 
 * game-system-specific logic (validation, lifecycle methods).
 */
export abstract class BaseGameSystemPlugin implements GameSystemPlugin {
  /** Plugin manifest containing all metadata and capabilities */
  readonly manifest: PluginManifest;
  
  /** Plugin context for API access and shared services */
  protected context?: PluginContext;
  
  /** Cache for component import promises to avoid repeated imports */
  private componentCache = new Map<string, Promise<Component | null>>();
  
  /**
   * Constructor accepting manifest from plugin discovery
   * @param manifest Plugin manifest loaded from manifest.json
   */
  constructor(manifest: PluginManifest) {
    this.manifest = manifest;
  }
  
  /**
   * Get a Vue component by type using dynamic imports
   * 
   * This method automatically loads components from the plugin's components directory:
   * Pattern: ./components/{componentType}.vue (relative to plugin index)
   * 
   * @param type Component type identifier (e.g., 'character-sheet', 'character-creator')
   * @returns Promise resolving to Vue component or null if not found
   */
  async getComponent(type: string): Promise<Component | null> {
    console.log(`[${this.manifest.id}] Getting component: ${type}`);
    
    // Check cache first (cache the promise, not the result)
    if (this.componentCache.has(type)) {
      console.log(`[${this.manifest.id}] Component ${type} found in cache`);
      return await this.componentCache.get(type)!;
    }
    
    // Create and cache the import promise
    const importPromise = this.loadComponent(type);
    this.componentCache.set(type, importPromise);
    return await importPromise;
  }
  
  /**
   * Load a component using dynamic import
   * @param type Component type identifier
   * @returns Promise resolving to component or null
   */
  private async loadComponent(type: string): Promise<Component | null> {
    try {
      // Dynamic import with relative path from base class to plugin component
      // From: packages/shared/src/types/base-plugin.mts
      // To:   packages/plugins/{pluginId}/src/components/{type}.vue
      const componentPath = `../../../plugins/${this.manifest.id}/src/components/${type}.vue`;
      console.log(`[${this.manifest.id}] Loading component from: ${componentPath}`);
      
      const module = await import(/* @vite-ignore */ componentPath);
      console.log(`[${this.manifest.id}] ✅ Successfully loaded component: ${type}`);
      return module.default;
    } catch (error) {
      console.warn(`[${this.manifest.id}] ❌ Failed to load component ${type}:`, error);
      return null;
    }
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
  getContext(): PluginContext | undefined {
    return this.context;
  }
  
  /**
   * Plugin initialization lifecycle method
   * Base implementation stores the context - concrete plugins should call super.onLoad()
   */
  async onLoad(context?: PluginContext): Promise<void> {
    this.context = context;
  }
  
  /**
   * Plugin cleanup lifecycle method
   */
  abstract onUnload(): Promise<void>;
}