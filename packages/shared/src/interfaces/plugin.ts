import { IGameSystemRegistration } from '../schemas/game-system.schema.js';

/**
 * Plugin Config interface
 * This defines the structure of a plugin's config.json file
 */
export interface IPluginConfig {
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
 * Plugin interface
 * This defines the base structure of a plugin
 */
export interface IPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  website?: string;
  type: 'gameSystem' | 'extension' | 'theme';
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Game System Plugin interface
 * This extends the base Plugin interface with game system specific functionality
 */
export interface IGameSystemPlugin extends IPlugin {
  type: 'gameSystem';
  gameSystem: IGameSystemRegistration;
  initialize: () => Promise<void>;
  getActorSheet: (actorType: string) => string | undefined;
  getItemSheet: (itemType: string) => string | undefined;
  validateActorData: (actorType: string, data: Record<string, unknown>) => boolean;
  validateItemData: (itemType: string, data: Record<string, unknown>) => boolean;
}

/**
 * Plugin Manager interface
 * This defines the functionality for managing plugins
 */
export interface IPluginManager {
  registerPlugin: (plugin: IGameSystemPlugin) => Promise<string>;
  unregisterPlugin: (pluginId: string) => Promise<void>;
  enablePlugin: (pluginId: string) => Promise<void>;
  disablePlugin: (pluginId: string) => Promise<void>;
  getPlugin: (pluginId: string) => Promise<IPlugin | undefined>;
  getGameSystemPlugin: (pluginId: string) => Promise<IGameSystemPlugin | undefined>;
  getAllPlugins: () => Promise<IPlugin[]>;
  getAllGameSystemPlugins: () => Promise<IGameSystemPlugin[]>;
}

/**
 * Plugin Registry interface
 * This defines the functionality for a plugin registry
 */
export interface IPluginRegistry {
  initialize: () => Promise<void>;
  getPlugin: (pluginId: string) => IPlugin | undefined;
  getGameSystemPlugin: (pluginId: string) => IGameSystemPlugin | undefined;
  getAllPlugins: () => IPlugin[];
  getAllGameSystemPlugins: () => IGameSystemPlugin[];
  getEnabledPlugins: () => IPlugin[];
} 