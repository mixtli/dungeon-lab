import { ComponentRegistry } from './component-registry.mjs';
import { MechanicsRegistry } from './mechanics-registry.mjs';

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
  data?: any;
  errors?: string[];
}

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
 */
export interface GameSystemPlugin extends Plugin {
  /** Game system type identifier */
  readonly gameSystem: string;
  
  /** Supported character types */
  readonly characterTypes: string[];
  
  /** Supported item types */
  readonly itemTypes: string[];
  
  /**
   * Optional: Validate character data against game system rules
   * @param data Character data to validate
   */
  validateCharacterData?(data: any): ValidationResult;
}