/**
 * Minimal Plugin Context Implementation
 * 
 * Provides read-only data access and plugin-specific UI state management.
 */

import type { 
  PluginContext, 
  PluginStore,
  DocumentSearchQuery,
  CompendiumSearchQuery
} from '@dungeon-lab/shared/types/plugin-context.mjs';
import type { BaseDocument, ICompendiumEntry } from '@dungeon-lab/shared/types/index.mjs';
import { ReactivePluginStore } from '../plugin-store.mjs';
import { CompendiumsClient } from '@dungeon-lab/client/index.mjs';
import { DocumentsClient } from '@dungeon-lab/client/index.mjs';

/**
 * Minimal PluginContext implementation focused on read-only data access
 * and plugin-specific UI state management
 */
export class PluginContextImpl implements PluginContext {
  public readonly store: PluginStore;
  private compendiumsClient: CompendiumsClient;
  private documentsClient: DocumentsClient;
  
  constructor(private pluginId: string) {
    // Initialize plugin-scoped store
    this.store = new ReactivePluginStore();
    
    // Initialize API clients for read-only operations
    this.compendiumsClient = new CompendiumsClient();
    this.documentsClient = new DocumentsClient();
    
    console.log(`[PluginContext] Created minimal context for plugin '${pluginId}'`);
  }
  
  /**
   * Get a document by ID for display purposes
   */
  async getDocument(id: string): Promise<BaseDocument> {
    try {
      return await this.documentsClient.getDocument(id);
    } catch (error) {
      console.error(`[PluginContext] Failed to get document ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Search documents for display purposes
   */
  async searchDocuments(query: DocumentSearchQuery): Promise<BaseDocument[]> {
    try {
      return await this.documentsClient.searchDocuments(query);
    } catch (error) {
      console.error('[PluginContext] Failed to search documents:', error);
      throw error;
    }
  }
  
  /**
   * Get a compendium entry by ID for display purposes
   */
  async getCompendiumEntry(id: string): Promise<ICompendiumEntry> {
    try {
      return await this.compendiumsClient.getCompendiumEntry(id);
    } catch (error) {
      console.error(`[PluginContext] Failed to get compendium entry ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Search compendium entries for display purposes
   */
  async searchCompendiumEntries(query: CompendiumSearchQuery): Promise<ICompendiumEntry[]> {
    try {
      const result = await this.compendiumsClient.getAllCompendiumEntries(query);
      return result.entries;
    } catch (error) {
      console.error('[PluginContext] Failed to search compendium entries:', error);
      throw error;
    }
  }
  
  /**
   * Get the plugin ID this context belongs to
   */
  getPluginId(): string {
    return this.pluginId;
  }
  
  /**
   * Cleanup resources when plugin is unloaded
   */
  destroy(): void {
    // Clear store
    (this.store as ReactivePluginStore).clear();
    
    console.log(`[PluginContext] Destroyed context for plugin '${this.pluginId}'`);
  }
}

/**
 * Factory function to create PluginContext instances
 */
export function createPluginContext(pluginId: string): PluginContext {
  return new PluginContextImpl(pluginId);
}