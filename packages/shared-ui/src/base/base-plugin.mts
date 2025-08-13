import type { Component } from 'vue';
import type { PluginManifest } from '@dungeon-lab/shared/schemas/plugin-manifest.schema.mjs';
import type { PluginContext } from '../types/plugin-context.mjs';
import type { GameSystemPlugin, ValidationResult } from '../types/plugin.mjs';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';

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
   * This method automatically loads components from the plugin's exports directory:
   * Pattern: ./components/exports/{componentType}.vue (relative to plugin index)
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
      // From: packages/shared-ui/src/base/base-plugin.mts
      // To:   packages/plugins/{pluginId}/src/components/exports/{type}.vue
      const componentPath = `../../../plugins/${this.manifest.id}/src/components/exports/${type}.vue`;
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
   * Get token grid size for a document
   * 
   * Default implementation returns 1 (medium size). Concrete plugins should override
   * this method to implement game-system-specific sizing logic.
   * 
   * @param document Document to get token size for
   * @returns Grid size multiplier (default: 1 for medium size)
   */
  getTokenGridSize(_document: BaseDocument): number {
    // Default to medium size (1x1 grid cells) for unknown documents
    return 1;
  }
  
  /**
   * Get movement limit for a document in grid cells per turn
   * 
   * Default implementation returns 6 (30 feet / 5 feet per cell, common default).
   * Concrete plugins should override this method to implement game-system-specific
   * movement calculation rules.
   * 
   * @param document Document to get movement limit for
   * @returns Number of grid cells that can be moved per turn (default: 6)
   */
  getMovementLimit(_document: BaseDocument): number {
    // Default to 6 cells (30 feet movement / 5 feet per cell)
    return 6;
  }
  
  /**
   * Get initial turn state data for a document
   * 
   * Default implementation returns empty object (no turn-specific state).
   * Concrete plugins should override this method to provide game-specific
   * turn state initialization.
   * 
   * @param document Document to get initial turn state for
   * @returns Plugin-specific turn state data (default: empty object)
   */
  getInitialTurnState(_document: BaseDocument): Record<string, unknown> {
    return {};
  }
  
  /**
   * Check if a resource can be used by a document
   * 
   * Default implementation always returns false (no resources allowed).
   * Concrete plugins should override this method to implement game-specific
   * resource validation logic.
   * 
   * @param document Document attempting to use the resource
   * @param resourceId Identifier for the resource type
   * @param amount Amount of resource to use
   * @param currentTurnState Current plugin-specific turn state
   * @returns Whether the resource usage is allowed (default: false)
   */
  canUseResource(_document: BaseDocument, _resourceId: string, _amount: number, _currentTurnState: Record<string, unknown>): boolean {
    return false; // Default: no resources allowed
  }
  
  /**
   * Use a resource and update turn state
   * 
   * Default implementation returns unchanged turn state.
   * Concrete plugins should override this method to implement game-specific
   * resource usage logic.
   * 
   * @param document Document using the resource
   * @param resourceId Identifier for the resource type
   * @param amount Amount of resource to use
   * @param currentTurnState Current plugin-specific turn state
   * @returns Updated plugin-specific turn state (default: unchanged)
   */
  useResource(_document: BaseDocument, _resourceId: string, _amount: number, currentTurnState: Record<string, unknown>): Record<string, unknown> {
    return currentTurnState; // Default: no change
  }
  
  /**
   * Reset turn state at start of new turn
   * 
   * Default implementation returns empty object.
   * Concrete plugins should override this method to implement game-specific
   * turn state reset logic.
   * 
   * @param document Document whose turn is starting
   * @param currentTurnState Current plugin-specific turn state
   * @returns Reset plugin-specific turn state (default: empty object)
   */
  resetTurnState(_document: BaseDocument, _currentTurnState: Record<string, unknown>): Record<string, unknown> {
    return {}; // Default: reset to empty
  }
  
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