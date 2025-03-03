import { GameSystemRegistration } from './game-system.js';

/**
 * Plugin Config interface
 * This defines the structure of a plugin's config.json file
 */
export interface PluginConfig {
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
 * This interface defines the structure of a plugin
 */
export interface Plugin {
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
 * This interface defines the structure of a game system plugin
 */
export interface GameSystemPlugin extends Plugin {
  type: 'gameSystem';
  gameSystem: GameSystemRegistration;
  initialize: () => Promise<void>;
  getActorSheet: (actorType: string) => string | undefined;
  getItemSheet: (itemType: string) => string | undefined;
  validateActorData: (actorType: string, data: Record<string, unknown>) => boolean;
  validateItemData: (itemType: string, data: Record<string, unknown>) => boolean;
}

/**
 * Plugin Manager interface
 * This interface defines the methods for managing plugins
 */
export interface PluginManager {
  registerPlugin: (plugin: GameSystemPlugin) => Promise<string>;
  unregisterPlugin: (pluginId: string) => Promise<void>;
  enablePlugin: (pluginId: string) => Promise<void>;
  disablePlugin: (pluginId: string) => Promise<void>;
  getPlugin: (pluginId: string) => Promise<Plugin | undefined>;
  getGameSystemPlugin: (pluginId: string) => Promise<GameSystemPlugin | undefined>;
  getAllPlugins: () => Promise<Plugin[]>;
  getAllGameSystemPlugins: () => Promise<GameSystemPlugin[]>;
}

/**
 * Plugin Registry interface
 * This interface defines methods for managing plugins via file-based configuration
 */
export interface PluginRegistry {
  initialize: () => Promise<void>;
  getPlugin: (pluginId: string) => Plugin | undefined;
  getGameSystemPlugin: (pluginId: string) => GameSystemPlugin | undefined;
  getAllPlugins: () => Plugin[];
  getAllGameSystemPlugins: () => GameSystemPlugin[];
  getEnabledPlugins: () => Plugin[];
} 