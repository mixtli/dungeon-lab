/**
 * Base Plugin Context Types (Vue-free)
 * 
 * This file contains the core plugin context interfaces without Vue dependencies.
 * Vue-specific versions are available in @dungeon-lab/shared-ui.
 */

import type { BaseDocument, ICompendiumEntry } from './index.mjs';

/**
 * Basic plugin store interface without Vue reactivity
 */
export interface PluginStoreBase {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  subscribe<T>(key: string, callback: (value: T) => void): () => void;
}

/**
 * Search query interface for documents
 */
export interface DocumentSearchQuery {
  query?: string;
  documentType?: string;
  pluginId?: string;
  limit?: number;
  [key: string]: unknown; // Allow additional query parameters
}

/**
 * Search query interface for compendium entries
 */
export interface CompendiumSearchQuery {
  search?: string;
  pluginId?: string;
  documentType?: string;
  pluginDocumentType?: string;
  category?: string;
  isActive?: boolean;
  limit?: number;
  [key: string]: unknown; // Allow additional query parameters
}

/**
 * Base plugin context provides minimal read-only access to application data
 * This is the Vue-free version used by server-side code
 */
export interface PluginContextBase {
  /** Read-only data access for ancillary display information */
  getDocument(id: string): Promise<BaseDocument>;
  searchDocuments(query: DocumentSearchQuery): Promise<BaseDocument[]>;
  getCompendiumEntry(id: string): Promise<ICompendiumEntry>;
  searchCompendiumEntries(query: CompendiumSearchQuery): Promise<ICompendiumEntry[]>;
  
  /** Basic store for plugin state */
  store: PluginStoreBase;
}