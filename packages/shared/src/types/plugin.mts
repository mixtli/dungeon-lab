import { IGameSystemRegistration } from '../schemas/game-system.schema.mjs';
import { Router } from 'express';

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
  // Currently just a marker interface, but can be extended with web-specific functionality
}

/**
 * Game System Plugin interface
 * This extends the base Plugin interface with game system specific functionality
 */
export interface IGameSystemPlugin extends IPlugin {
  type: 'gameSystem';
  gameSystem: IGameSystemRegistration;
  getActorSheet: (actorType: string) => string | undefined;
  getItemSheet: (itemType: string) => string | undefined;
  validateActorData: (actorType: string, data: Record<string, unknown>) => boolean;
  validateItemData: (itemType: string, data: Record<string, unknown>) => boolean;
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