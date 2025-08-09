//import { DefineComponent } from 'vue';
import type { Component } from 'vue';

/**
 * Vue 3 component definition for plugin components
 */
//export type PluginComponent = DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;

/**
 * Component registry for managing plugin components
 */
export interface ComponentRegistry {
  /**
   * Register a Vue 3 component
   * @param id Unique component identifier
   * @param component Vue 3 component definition
   * @param metadata Component metadata and configuration
   */
  register(
    id: string, 
    component: Component,
    metadata?: ComponentMetadata
  ): void;
  
  /**
   * Get a registered component by ID
   * @param id Component identifier
   * @returns Component definition or undefined if not found
   */
  get(id: string): Component | undefined;
  
  /**
   * Get all registered components for a plugin
   * @param pluginId Plugin identifier
   * @returns Array of component entries
   */
  getByPlugin(pluginId: string): ComponentEntry[];
  
  /**
   * Unregister a component
   * @param id Component identifier
   */
  unregister(id: string): void;
  
  /**
   * Unregister all components for a plugin
   * @param pluginId Plugin identifier
   */
  unregisterByPlugin(pluginId: string): void;
}

/**
 * Component metadata and configuration
 */
export interface ComponentMetadata {
  /** Plugin that owns this component */
  pluginId: string;
  
  /** Component display name */
  name: string;
  
  /** Component description */
  description?: string;
  
  /** Component category (e.g., 'character-sheet', 'dice-roller') */
  category?: string;
  
  /** Component props schema */
  props?: Record<string, unknown>;
  
  /** Component events schema */
  events?: Record<string, unknown>;
  
  /** Whether component supports hot reload */
  hotReloadable?: boolean;
}

/**
 * Component registry entry
 */
export interface ComponentEntry {
  id: string;
  component: Component;
  metadata: ComponentMetadata;
}