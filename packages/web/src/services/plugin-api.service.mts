import { IPluginAPI } from '@dungeon-lab/shared/types/plugin-api.mjs';
import { useActorStore } from '../stores/actor.mjs';
import { useSocketStore } from '../stores/socket.mjs';
import { pluginRegistry } from './plugin-registry.service.mjs';
import { useAuthStore } from '../stores/auth.mjs';
import { useItemStore } from '../stores/item.mjs';
import type { IActorCreateData, IActorUpdateData, IItemCreateData, IItemUpdateData } from '@dungeon-lab/shared/dist/index.mjs';

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

  private get actorStore() {
    return useActorStore();
  }

  private get socketStore() {
    return useSocketStore();
  }

  private get authStore() {
    return useAuthStore();
  }

  private get itemStore() {
    return useItemStore();
  }

  private getCurrentUserId(): string {
    const userId = this.authStore.user?.id;
    if (!userId) {
      throw new Error('No user logged in');
    }
    return userId;
  }

  // Actor management
  async createActor(type: string, data: unknown): Promise<string> {
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

    const createData: IActorCreateData = {
      name,
      type,
      gameSystemId: this.pluginId,
      data: validatedData
    };

    const actor = await this.actorStore.createActor(createData);
    if (!actor.id) {
      throw new Error('Failed to create actor: No ID returned');
    }
    return actor.id;
  }

  async getActor(id: string): Promise<unknown> {
    const actor = await this.actorStore.fetchActor(id);
    if (!actor) {
      throw new Error('Actor not found');
    }
    return actor.data;
  }

  async updateActor(id: string, data: unknown): Promise<void> {
    const actor = await this.actorStore.fetchActor(id);
    if (!actor) {
      throw new Error('Actor not found');
    }

    // Validate the data
    const validation = this.validateActorData(actor.type, data);
    if (!validation.success) {
      throw new Error(`Invalid actor data: ${validation.error.message}`);
    }

    // Get the current user ID for updatedBy
    const userId = this.getCurrentUserId();

    const updateData: IActorUpdateData = {
      data: validation.data,
      updatedBy: userId
    };

    await this.actorStore.updateActor(id, updateData);
  }

  async deleteActor(id: string): Promise<void> {
    await this.actorStore.deleteActor(id);
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

    const createData: IItemCreateData = {
      name,
      type,
      gameSystemId: this.pluginId,
      data: validatedData
    };

    const item = await this.itemStore.createItem(createData);
    if (!item.id) {
      throw new Error('Failed to create item: No ID returned');
    }
    return item.id;
  }

  async getItem(id: string): Promise<unknown> {
    const item = await this.itemStore.fetchItem(id);
    if (!item) {
      throw new Error('Item not found');
    }
    return item.data;
  }

  async updateItem(id: string, data: unknown): Promise<void> {
    const item = await this.itemStore.fetchItem(id);
    if (!item) {
      throw new Error('Item not found');
    }

    // Validate the data
    const validation = this.validateItemData(item.type, data);
    if (!validation.success) {
      throw new Error(`Invalid item data: ${validation.error.message}`);
    }

    // Get the current user ID for updatedBy
    const userId = this.getCurrentUserId();

    const updateData: IItemUpdateData = {
      data: validation.data as Record<string, unknown>,
      updatedBy: userId
    };

    await this.itemStore.updateItem(id, updateData);
  }

  async deleteItem(id: string): Promise<void> {
    await this.itemStore.deleteItem(id);
  }

  // Data validation
  validateActorData(type: string, data: unknown) {
    const plugin = pluginRegistry.getGameSystemPlugin(this.pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }
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
    if (this.socketStore.socket) {
      this.socketStore.socket.emit('plugin:stateUpdate', {
        pluginId: this.pluginId,
        state: this.pluginState
      });
    }
  }

  // Plugin messaging
  sendPluginMessage(type: string, data: unknown): void {
    if (this.socketStore.socket) {
      this.socketStore.socket.emit('plugin:message', {
        pluginId: this.pluginId,
        type,
        data
      });
    }
  }

  onPluginMessage(type: string, handler: (data: unknown) => void): void {
    // Initialize handler set if it doesn't exist
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());

      // Set up socket listener for this message type if it's the first handler
      if (this.socketStore.socket) {
        this.socketStore.socket.on(`plugin:message:${type}`, (message: { data: unknown }) => {
          const handlers = this.messageHandlers.get(type);
          if (handlers) {
            handlers.forEach(h => h(message.data));
          }
        });
      }
    }

    // Add the handler
    this.messageHandlers.get(type)?.add(handler);
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