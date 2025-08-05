/**
 * Plugin Context Types
 * 
 * This file contains interfaces for the minimal plugin context that provides
 * read-only data access and plugin-specific UI state management.
 */

import type { BaseDocument, ICompendiumEntry } from './index.mjs';

/**
 * Plugin store interface for reactive state management of plugin-specific UI state
 * (e.g., active tabs, expanded sections, UI preferences)
 */
export interface PluginStore {
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
 * Plugin context provides minimal read-only access to application data
 * and plugin-specific UI state management
 */
export interface PluginContext {
  /** Read-only data access for ancillary display information */
  getDocument(id: string): Promise<BaseDocument>;
  searchDocuments(query: DocumentSearchQuery): Promise<BaseDocument[]>;
  getCompendiumEntry(id: string): Promise<ICompendiumEntry>;
  searchCompendiumEntries(query: CompendiumSearchQuery): Promise<ICompendiumEntry[]>;
  
  /** Reactive store for plugin UI state */
  store: PluginStore;
}