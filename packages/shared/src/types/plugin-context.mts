/**
 * Plugin Context Types
 * 
 * This file contains all the interfaces and types related to plugin context,
 * including API interfaces, store, events, and data types.
 */

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
  query?: string;
  type?: string;
  pluginId?: string;
  limit?: number;
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