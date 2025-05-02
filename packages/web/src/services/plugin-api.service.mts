import { IPluginAPI } from '@dungeon-lab/shared/types/plugin-api.mjs';
import { pluginRegistry } from './plugin-registry.service.mjs';
import { ActorsClient } from '@dungeon-lab/client/actors.client.mjs';
import { ItemsClient } from '@dungeon-lab/client/items.client.mjs';
import { DocumentsClient } from '@dungeon-lab/client/documents.client.mjs';
import type { IActor, IItem, IVTTDocument } from '@dungeon-lab/shared/types/index.mjs';
import type {
  CreateActorRequest,
  CreateItemRequest,
  SearchDocumentsQuery
} from '@dungeon-lab/shared/types/api/index.mjs';
/**
 * Implementation of the Plugin API for the web client
 */
const actorClient = new ActorsClient();
const itemClient = new ItemsClient();
const documentClient = new DocumentsClient();

export class PluginAPI implements IPluginAPI {
  private readonly pluginId: string;
  private messageHandlers = new Map<string, Set<(data: unknown) => void>>();
  private pluginState: Record<string, unknown> = {};

  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  // Actor management
  async createActor(type: string, data: CreateActorRequest): Promise<IActor> {
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

    const actor = await actorClient.createActor(createData);
    if (!actor?.id) {
      throw new Error('Failed to create actor: No ID returned');
    }
    return actor;
  }

  async getActor(id: string): Promise<IActor> {
    const actor = await actorClient.getActor(id);
    if (!actor) {
      throw new Error('Actor not found');
    }
    return actor;
  }

  async updateActor(id: string, data: CreateActorRequest): Promise<IActor> {
    const actor = await actorClient.getActor(id);
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
    return await actorClient.updateActor(id, updatedData);
  }

  async deleteActor(id: string): Promise<void> {
    await actorClient.deleteActor(id);
  }

  // Item management
  async createItem(type: string, data: Omit<IItem, 'id'>): Promise<IItem> {
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

    const item = await itemClient.createItem(createData);
    if (!item?.id) {
      throw new Error('Failed to create item: No ID returned');
    }
    return item;
  }

  async getItem(id: string): Promise<IItem> {
    const item = await itemClient.getItem(id);
    if (!item) {
      throw new Error('Item not found');
    }
    return item;
  }

  async updateItem(id: string, data: Omit<IItem, 'id'>): Promise<IItem> {
    const item = await itemClient.getItem(id);
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

    return await itemClient.updateItem(id, updateData);
  }

  async deleteItem(id: string): Promise<void> {
    await itemClient.deleteItem(id);
  }

  // Data validation
  validateActorData(type: string, data: CreateActorRequest) {
    const plugin = pluginRegistry.getGameSystemPlugin(this.pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }
    console.log('validateActorData', type, data);
    return plugin.validateActorData(type, data);
  }

  validateItemData(type: string, data: CreateItemRequest) {
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
  async getDocument(
    pluginId: string,
    documentType: string,
    documentId: string
  ): Promise<IVTTDocument> {
    try {
      // We need to search for documents first to find the right one by plugin and type
      const query: SearchDocumentsQuery = {
        pluginId,
        documentType,
        // If documentId is a UUID pattern, then it's an actual ID
        ...(documentId.match(/^[0-9a-f]{24}$/) ? { id: documentId } : { slug: documentId })
      };

      const documents = await documentClient.searchDocuments(query);
      const document = documents.find(
        (doc) =>
          doc.pluginId === pluginId &&
          doc.documentType === documentType &&
          (doc.id === documentId || doc.slug === documentId)
      );

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      return document;
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
  async searchDocuments(query: SearchDocumentsQuery): Promise<IVTTDocument[]> {
    try {
      // Convert params to SearchDocumentsQuery
      const documents = await documentClient.searchDocuments(query);

      // Only return the document data in the same format as the original implementation
      return documents;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to search documents: ${error.message}`);
      } else {
        throw new Error('Failed to search documents: Unknown error');
      }
    }
  }

  /**
   * Send a message to the plugin
   * @param type The type of message to send
   * @param data The data to send
   */
  sendPluginMessage(type: string, data: unknown): void {
    console.log('sendPluginMessage', type, data);
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
