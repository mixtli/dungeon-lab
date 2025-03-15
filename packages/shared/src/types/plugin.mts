import { Router } from 'express';
import { z } from 'zod';
import { IPluginMessage } from '../schemas/websocket-messages.schema.mjs';
import { IPluginActionMessage } from '../schemas/websocket-messages.schema.mjs';

/**
 * Interface for plugin script API
 * Defines the structure of the script module exports
 */
export interface IPluginScript {
  // Initialize the UI component and return a cleanup function if needed
  init: (container: HTMLElement, api: any, data?: any) => (() => void) | void;
  // Any additional exported functions from the script
  [key: string]: any;
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

export interface IActorTypeDefinition {
  name: string;
  description: string;
  dataSchema: z.ZodSchema;
  uiComponent: string;
}

export interface IItemTypeDefinition {
  name: string;
  description: string;
  dataSchema: z.ZodSchema;
  uiComponent: string;
}

/**
 * Game System Registration interface
 * This defines the metadata for a game system plugin
 */
export interface IGameSystemRegistration {
  actorTypes: IActorTypeDefinition[];
  itemTypes: IItemTypeDefinition[];
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
  serverEntryPoint?: string;
  clientEntryPoint?: string;
  // Legacy UI assets configuration - relative paths within the web/ui directory
  uiAssets?: Record<string, string>;
  // New UI components configuration with more detailed structure
  uiComponents?: Record<string, IPluginUIAssetPaths>;
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
  gameSystem: IGameSystemRegistration;
  validateActorData: (actorType: string, data: unknown) => z.SafeParseReturnType<unknown, unknown>;
  validateItemData: (itemType: string, data: unknown) => z.SafeParseReturnType<unknown, unknown>;
}

/**
 * Web Game System Plugin interface
 * This extends the base Game System Plugin interface with web-specific functionality
 */
export interface IGameSystemPluginWeb extends IGameSystemPlugin, IWebPlugin {
  getActorSheet: (actorType: string) => string | undefined;
  getItemSheet: (itemType: string) => string | undefined;
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
export interface IWebPlugin extends IPlugin {
  // UI asset methods
  getUIAssetPaths(context: string): IPluginUIAssetPaths | undefined; // Get paths to UI assets
  getUIAssets(context: string): IPluginUIAssets | undefined; // Get loaded UI assets
  registerUIAssets(context: string, assets: IPluginUIAssets): void; // Register loaded UI assets
}

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