/**
 * @deprecated This file contains legacy plugin interfaces with server-side API cruft.
 * Use plugin-simple.mts instead for the clean, client-only plugin interface.
 * 
 * This file will be removed in a future version once all plugins are migrated
 * to the simplified interface.
 */

import { ComponentRegistry } from './component-registry.mjs';
import { MechanicsRegistry } from './mechanics-registry.mjs';
import type { Component } from 'vue';

/**
 * Plugin store interface for reactive state management
 */
export interface PluginStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  subscribe<T>(key: string, callback: (value: T) => void): () => void;
}

/**
 * Plugin event system interface
 */
export interface PluginEventSystem {
  emit<T = unknown>(event: string, data?: T): void;
  on<T = unknown>(event: string, handler: (data: T) => void): () => void;
}

/**
 * Actors API interface
 */
export interface ActorsAPI {
  create(data: CreateActorData): Promise<ActorData>;
  get(id: string): Promise<ActorData>;
  update(id: string, data: Partial<ActorData>): Promise<ActorData>;
  delete(id: string): Promise<void>;
  list(filters?: ActorFilters): Promise<ActorData[]>;
}

/**
 * Items API interface
 */
export interface ItemsAPI {
  create(data: CreateItemData): Promise<ItemData>;
  get(id: string): Promise<ItemData>;
  update(id: string, data: Partial<ItemData>): Promise<ItemData>;
  delete(id: string): Promise<void>;
  list(filters?: ItemFilters): Promise<ItemData[]>;
}

/**
 * Documents API interface
 */
export interface DocumentsAPI {
  create(data: CreateDocumentData): Promise<DocumentData>;
  get(id: string): Promise<DocumentData>;
  update(id: string, data: Partial<DocumentData>): Promise<DocumentData>;
  delete(id: string): Promise<void>;
  search(query: DocumentSearchQuery): Promise<DocumentData[]>;
}

/**
 * Base data types
 */
export interface CreateActorData {
  name: string;
  type: string;
  gameSystemId: string;
  data: Record<string, unknown>;
}

export interface ActorData extends CreateActorData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActorFilters {
  type?: string;
  gameSystemId?: string;
  name?: string;
}

export interface CreateItemData {
  name: string;
  type: string;
  gameSystemId: string;
  data: Record<string, unknown>;
}

export interface ItemData extends CreateItemData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemFilters {
  type?: string;
  gameSystemId?: string;
  name?: string;
}

export interface CreateDocumentData {
  name: string;
  type: string;
  content: Record<string, unknown>;
  pluginId: string;
}

export interface DocumentData extends CreateDocumentData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSearchQuery {
  type?: string;
  pluginId?: string;
  name?: string;
  slug?: string;
}

/**
 * Plugin context provides access to the application context
 */
export interface PluginContext {
  /** Application API endpoints */
  api: {
    actors: ActorsAPI;
    items: ItemsAPI;
    documents: DocumentsAPI;
  };
  
  /** Reactive store for plugin state */
  store: PluginStore;
  
  /** Event system for communication */
  events: PluginEventSystem;
}

/**
 * Core plugin interface that all plugins must implement
 */
export interface Plugin {
  /** Unique plugin identifier */
  readonly id: string;
  
  /** Display name of the plugin */
  readonly name: string;
  
  /** Plugin version */
  readonly version: string;
  
  /** Plugin description */
  readonly description?: string;
  
  /** Plugin author */
  readonly author?: string;
  
  /** Plugin manifest (optional for backward compatibility) */
  readonly manifest?: PluginManifest;
  
  /**
   * Called when the plugin is loaded into the system
   * @param context Plugin context with access to APIs and services
   */
  onLoad(context: PluginContext): Promise<void>;
  
  /**
   * Called when the plugin is unloaded from the system
   */
  onUnload(): Promise<void>;
  
  /**
   * Register Vue 3 components with the component registry
   * @param registry Component registry to register components with
   */
  registerComponents(registry: ComponentRegistry): void;
  
  /**
   * Register game mechanics and rules with the mechanics registry
   * @param registry Mechanics registry to register mechanics with
   */
  registerMechanics(registry: MechanicsRegistry): void;
  
  /**
   * Optional: Validate actor data
   * @param type Actor type
   * @param data Actor data to validate
   */
  validateActorData?(type: string, data: unknown): { success: boolean; error?: Error; data?: unknown };
  
  /**
   * Optional: Validate item data
   * @param type Item type  
   * @param data Item data to validate
   */
  validateItemData?(type: string, data: unknown): { success: boolean; error?: Error; data?: unknown };
  
  /**
   * Optional: Validate VTT document data
   * @param type Document type
   * @param data Document data to validate
   */
  validateVTTDocumentData?(type: string, data: unknown): { success: boolean; error?: Error; data?: unknown };
}

/**
 * Validation result interface for plugin data validation
 */
export interface ValidationResult {
  success: boolean;
  data?: unknown;
  errors?: string[];
}

/**
 * Standard component types that plugins can provide
 * 
 * These represent the core UI components that game system plugins
 * must implement. Each component type has a defined contract for
 * props and events that must be followed.
 * 
 * @see plugin-contracts.mts for detailed component requirements
 */
export type StandardComponentType = 
  | 'character-sheet'   // Display/edit character data
  | 'character-creator'; // Multi-step character creation wizard

/**
 * Standard data types that plugins can validate
 * 
 * These represent the core data types that game systems need to
 * validate according to their specific rules and schemas.
 */
export type ValidatableDataType = 
  | 'character'   // Character/PC data
  | 'background'  // Character background data  
  | 'item'        // Equipment/inventory items
  | 'spell'       // Spells and magical abilities
  | 'feat';       // Character features and feats

/**
 * Plugin manifest interface - defines plugin metadata and capabilities
 */
export interface PluginManifest {
  /** Unique plugin identifier */
  id: string;
  
  /** Display name of the plugin */
  name: string;
  
  /** Plugin version */
  version: string;
  
  /** Plugin description */
  description?: string;
  
  /** Plugin author */
  author?: string;
  
  /** Game system type identifier (for game system plugins) */
  gameSystem?: string;
  
  /** Supported character types */
  characterTypes?: string[];
  
  /** Supported item types */
  itemTypes?: string[];
  
  /** List of supported features */
  supportedFeatures?: string[];
  
  /** Component definitions */
  components?: Record<string, {
    id: string;
    name: string;
    description?: string;
    category?: string;
    props?: Record<string, any>;
    events?: Record<string, string>;
  }>;
  
  /** Mechanics definitions */
  mechanics?: Record<string, {
    id: string;
    name: string;
    description?: string;
    category?: string;
  }>;
  
  /** Schema references for validation */
  validationSchema?: Record<string, string>;
  
  /** Entry point file path */
  entryPoint: string;
  
  /** Plugin dependencies */
  dependencies?: Record<string, string>;
  
  /** Development dependencies */
  devDependencies?: Record<string, string>;
  
  /** License */
  license?: string;
}

/**
 * Game system specific plugin interface
 * 
 * This interface defines the contract that all game system plugins must implement.
 * Game systems provide the core mechanics, validation, and UI components for
 * specific tabletop RPG systems (D&D 5e, Pathfinder, etc.).
 * 
 * Key Principles:
 * - Plugins provide standard components via getComponent()
 * - Plugins validate data via validate() method
 * - Main app never knows about specific game system details
 * - Components must adhere to contracts defined in plugin-contracts.mts
 */
export interface GameSystemPlugin extends Plugin {
  /** Game system type identifier */
  readonly gameSystem: string;
  
  /** Supported character types */
  readonly characterTypes: string[];
  
  /** Supported item types */
  readonly itemTypes: string[];
  
  /**
   * Get a standard component by type
   * @param type Standard component type
   * @returns Vue component or null if not supported
   */
  getComponent(type: StandardComponentType): Component | null;
  
  /**
   * Validate data against game system rules
   * @param type Type of data to validate
   * @param data Data to validate
   * @returns Validation result
   */
  validate(type: ValidatableDataType, data: unknown): ValidationResult;
  
  /**
   * @deprecated Use validate('character', data) instead
   * Optional: Validate character data against game system rules
   * @param data Character data to validate
   */
  validateCharacterData?(data: unknown): ValidationResult;
}