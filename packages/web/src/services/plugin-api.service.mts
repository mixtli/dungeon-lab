import { IPluginAPI } from '@dungeon-lab/shared/types/plugin-api.mjs';
import { pluginRegistry } from './plugin-registry.service.mjs';
import * as itemApi from '../api/items.client.mjs';
import * as actorApi from '../api/actors.client.mjs';
import * as documentApi from '../api/documents.client.mjs';
import type { IActor, IItem } from '@dungeon-lab/shared/index.mjs';
import type { SearchDocumentsQuery } from '@dungeon-lab/shared/types/api/index.mjs';
/**
 * Implementation of the Plugin API for the web client
 */
export class PluginAPI implements IPluginAPI {
  private readonly pluginId: string;
  private messageHandlers = new Map<string, Set<(data: unknown) => void>>();
  private pluginState: Record<string, unknown> = {};

  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  sendPluginMessage(_type: string, _data: unknown): void {
    console.log('sendPluginMessage', _type, _data);
  }

  // Actor management
  async createActor(type: string, data: Omit<IActor, 'id'>): Promise<string> {
    const plugin = pluginRegistry.getGameSystemPlugin(this.pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    // Validate the data
    const validation = this.validateActorData(type, data);
    if (!validation.success) {
      throw new Error(`Invalid actor data: ${validation.error.message}`);
    }

    // Extract name from validated data if present, or use default
    const validatedData = validation.data as Record<string, unknown>;
    const name = typeof validatedData.name === 'string' ? validatedData.name : `New ${type}`;

    const createData = {
      name,
      type,
      gameSystemId: this.pluginId,
      data: validatedData
    };

    const actor = await actorApi.createActor(createData);
    if (!actor?.id) {
      throw new Error('Failed to create actor: No ID returned');
    }
    return actor.id;
  }

  async getActor(id: string): Promise<unknown> {
    const actor = await actorApi.getActor(id);
    if (!actor) {
      throw new Error('Actor not found');
    }
    return actor.data;
  }

  async updateActor(id: string, data: Omit<IActor, 'id'>): Promise<void> {
    const actor = await actorApi.getActor(id);
    if (!actor) {
      throw new Error('Actor not found');
    }

    // Validate the data
    const validation = this.validateActorData(actor.type, data);
    if (!validation.success) {
      throw new Error(`Invalid actor data: ${validation.error.message}`);
    }
    const { createdBy, updatedBy, token, avatar, ...updatedData } = data;
    // Use the void operator to mark the destructured "createdBy" and "updatedBy" as used, avoiding the unused variable errors.
    void createdBy;
    void updatedBy;
    void token;
    void avatar;
    await actorApi.updateActor(id, updatedData);
  }

  async deleteActor(id: string): Promise<void> {
    await actorApi.deleteActor(id);
  }

  // Item management
  async createItem(type: string, data: unknown): Promise<string> {
    const plugin = pluginRegistry.getGameSystemPlugin(this.pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    // Validate the data
    const validation = this.validateItemData(type, data);
    if (!validation.success) {
      throw new Error(`Invalid item data: ${validation.error.message}`);
    }

    // Extract name from validated data if present, or use default
    const validatedData = validation.data as Record<string, unknown>;
    const name = typeof validatedData.name === 'string' ? validatedData.name : `New ${type}`;

    const createData = {
      name,
      type,
      gameSystemId: this.pluginId,
      pluginId: this.pluginId,
      data: validatedData
    };

    const item = await itemApi.createItem(createData);
    if (!item?.id) {
      throw new Error('Failed to create item: No ID returned');
    }
    return item.id;
  }

  async getItem(id: string): Promise<unknown> {
    const item = await itemApi.getItem(id);
    if (!item) {
      throw new Error('Item not found');
    }
    return item.data;
  }

  async updateItem(id: string, data: unknown): Promise<void> {
    const item = await itemApi.getItem(id);
    if (!item) {
      throw new Error('Item not found');
    }

    // Validate the data
    const validation = this.validateItemData(item.type, data);
    if (!validation.success) {
      throw new Error(`Invalid item data: ${validation.error.message}`);
    }

    const updateData: Partial<IItem> = {
      data: validation.data as Record<string, unknown>
    };

    await itemApi.updateItem(id, updateData);
  }

  async deleteItem(id: string): Promise<void> {
    await itemApi.deleteItem(id);
  }

  // Data validation
  validateActorData(type: string, data: Omit<IActor, 'id'>) {
    const plugin = pluginRegistry.getGameSystemPlugin(this.pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }
    console.log('validateActorData', type, data);
    return plugin.validateActorData(type, data);
  }

  validateItemData(type: string, data: unknown) {
    const plugin = pluginRegistry.getGameSystemPlugin(this.pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }
    return plugin.validateItemData(type, data);
  }

  // Plugin state management
  getPluginState(): Record<string, unknown> {
    return { ...this.pluginState };
  }

  updatePluginState(update: Record<string, unknown>): void {
    this.pluginState = {
      ...this.pluginState,
      ...update
    };

    // Notify other instances of this plugin about the state update
    // if (this.socketStore.socket) {
    //   this.socketStore.socket.emit('plugin:stateUpdate', {
    //     pluginId: this.pluginId,
    //     state: this.pluginState
    //   });
    // }
  }

  // Plugin messaging
  //sendPluginMessage(_type: string, _data: unknown): void {
  // if (this.socketStore.socket) {
  //   this.socketStore.socket.emit('plugin:message', {
  //     pluginId: this.pluginId,
  //     type,
  //     data
  //   });
  // }
  //}

  onPluginMessage(type: string, handler: (data: unknown) => void): void {
    // Initialize handler set if it doesn't exist
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());

      // Set up socket listener for this message type if it's the first handler
      // if (this.socketStore.socket) {
      //   this.socketStore.socket.on(`plugin:message:${type}`, (message: { data: unknown }) => {
      //     const handlers = this.messageHandlers.get(type);
      //     if (handlers) {
      //       handlers.forEach((h) => h(message.data));
      //     }
      //   });
      // }
    }

    // Add the handler
    this.messageHandlers.get(type)?.add(handler);
  }

  /**
   * Fetches a document from the server
   * @param pluginId The ID of the plugin that owns the document
   * @param documentType The type of document to fetch (e.g., 'class', 'race', 'background')
   * @param documentId The ID or name of the document to fetch
   * @returns The document data
   */
  async getDocument(pluginId: string, documentType: string, documentId: string): Promise<unknown> {
    try {
      // We need to search for documents first to find the right one by plugin and type
      const query: SearchDocumentsQuery = {
        pluginId,
        documentType,
        // If documentId is a UUID pattern, then it's an actual ID
        ...(documentId.match(/^[0-9a-f]{24}$/) ? { id: documentId } : { slug: documentId })
      };

      const documents = await documentApi.searchDocuments(query);
      const document = documents.find(
        (doc) =>
          doc.pluginId === pluginId &&
          doc.documentType === documentType &&
          (doc.id === documentId || doc.slug === documentId)
      );

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      return document.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch document: ${error.message}`);
      }
      throw new Error('Failed to fetch document: Unknown error');
    }
  }

  /**
   * Searches for documents using the provided query parameters
   * @param params An object containing key-value pairs to search for (e.g., { pluginId: 'dnd-5e-2024', documentType: 'class' })
   * @returns An array of matching documents
   */
  async searchDocuments(params: Record<string, string>): Promise<unknown[]> {
    try {
      // Convert params to SearchDocumentsQuery
      const query: SearchDocumentsQuery = { ...params };
      const documents = await documentApi.searchDocuments(query);

      // Only return the document data in the same format as the original implementation
      return documents.map((doc) => doc.data || {});
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to search documents: ${error.message}`);
      } else {
        throw new Error('Failed to search documents: Unknown error');
      }
    }
  }
}

/**
 * Create a plugin API instance for a specific plugin
 * @param pluginId The ID of the plugin
 * @returns The plugin API instance
 */
export function createPluginAPI(pluginId: string): IPluginAPI {
  return new PluginAPI(pluginId);
}
