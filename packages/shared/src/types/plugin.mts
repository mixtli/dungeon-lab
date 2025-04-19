import { Router } from 'express';
import { z } from 'zod';
import { IPluginMessage } from '../schemas/websocket-messages.schema.mjs';
import { IPluginActionMessage } from '../schemas/websocket-messages.schema.mjs';
import { IPluginComponent } from './plugin-component.mjs';
import { IPluginAPI } from './plugin-api.mjs';

/**
 * Interface for plugin script API
 * Defines the structure of the script module exports
 */
export interface IPluginScript {
  // Initialize the UI component and return a cleanup function if needed
  init: (container: HTMLElement, api: unknown, data?: unknown) => (() => void) | void;
  // Any additional exported functions from the script
  [key: string]: unknown;
}

/**
 * Interface for plugin UI asset paths
 * Defines the paths to UI assets for a context (e.g., characterCreation)
 */
export interface IPluginUIAssetPaths {
  template: string;  // Path to Handlebars template file
  styles: string;    // Path to CSS file
  script: string;    // Path to JavaScript/TypeScript module file
  partials?: Record<string, string>; // Map of partial name to path
  assets?: {
    baseDir: string; // Base directory for assets
    files: string[]; // Array of file paths or glob patterns
  };
}

/**
 * Interface for loaded plugin UI assets
 * Defines the structure of loaded UI assets for a context
 */
export interface IPluginUIAssets {
  template: string;  // Handlebars template string
  styles: string;    // CSS string
  script: IPluginScript; // JavaScript module with exported functions
  partials?: Record<string, string>; // Map of partial name to template string
  assetUrls?: Record<string, string>; // Map of asset path to resolved URL
}


/**
 * Plugin Configuration interface
 * This defines the metadata and configuration of a plugin
 */
export interface IPluginConfiguration {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  website?: string;
  type: 'gameSystem' | 'extension' | 'theme';
  enabled?: boolean;
}

export interface PluginActionResult {
  stateUpdate?: {
    type: string;
    state: Record<string, unknown>;
  };
  forward?: boolean;
}

/**
 * Base Plugin interface
 * This defines the core functionality that all plugins must implement
 */
export interface IPlugin {
  // Plugin configuration
  config: IPluginConfiguration;
  type: 'gameSystem' | 'extension' | 'theme' | undefined;
  
  // Lifecycle hooks
  onLoad(): Promise<void>;     // Called when the plugin is loaded
  onUnload(): Promise<void>;   // Called when the plugin is unloaded
  onRegister(): Promise<void>; // Called when the plugin is registered with the system
  handlePluginMessage(message: IPluginMessage): Promise<void>;
}

/**
 * Base Game System Plugin interface
 * This defines the core functionality that all game system plugins must implement
 */
export interface IGameSystemPlugin extends IPlugin {
  type: 'gameSystem';
  validateActorData: (actorType: string, data: unknown) => z.SafeParseReturnType<unknown, unknown>;
  validateItemData: (itemType: string, data: unknown) => z.SafeParseReturnType<unknown, unknown>;
  validateVTTDocumentData: (documentType: string, data: unknown) => z.SafeParseReturnType<unknown, unknown>;
}

/**
 * Web Game System Plugin interface
 * This extends the base Game System Plugin interface with web-specific functionality
 */
export interface IGameSystemPluginWeb extends IGameSystemPlugin, IWebPlugin {
  type: 'gameSystem'
  loadComponent: (componentId: string) => IPluginComponent | undefined;
}

/**
 * Server Game System Plugin interface
 * This extends the base Game System Plugin interface with server-specific functionality
 */
export interface IGameSystemPluginServer extends IGameSystemPlugin {
  router?: Router; // Optional Express router for plugin-specific routes
  handleAction?: (message: IPluginMessage | IPluginActionMessage) => Promise<PluginActionResult | void>;
}

/**
 * Server Plugin interface
 * Extends the base Plugin interface with server-specific functionality
 */
export interface IServerPlugin extends IPlugin {
  router?: Router; // Optional Express router for plugin-specific routes
}

/**
 * Web Plugin interface
 * Extends the base Plugin interface with web-specific functionality
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IWebPlugin extends IPlugin { }

/**
 * Plugin Registry interface
 * This defines the functionality for a plugin registry
 */
export interface IPluginRegistry {
  initialize(): Promise<void>;
  getPlugin(pluginId: string): IPlugin | undefined;
  getGameSystemPlugin(pluginId: string): IGameSystemPlugin | undefined;
  getAllPlugins(): IPlugin[];
  getAllGameSystemPlugins(): IGameSystemPlugin[];
  getEnabledPlugins(): IPlugin[];
}

/**
 * Plugin Manager interface
 * This defines the functionality for managing plugins
 */
export interface IPluginManager {
  registerPlugin(plugin: IPlugin): Promise<string>;
  unregisterPlugin(pluginId: string): Promise<void>;
  enablePlugin(pluginId: string): Promise<void>;
  disablePlugin(pluginId: string): Promise<void>;
  getPlugin(pluginId: string): Promise<IPlugin | undefined>;
  getGameSystemPlugin(pluginId: string): Promise<IGameSystemPlugin | undefined>;
  getAllPlugins(): Promise<IPlugin[]>;
  getAllGameSystemPlugins(): Promise<IGameSystemPlugin[]>;
}

// Export types
export type { IPluginComponent, IPluginAPI }; 