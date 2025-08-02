import type { 
  PluginContext, 
  ActorsAPI, 
  ItemsAPI, 
  DocumentsAPI,
  PluginStore,
  PluginEventSystem,
  CreateActorData,
  ActorData,
  ActorFilters,
  CreateItemData,
  ItemData,
  ItemFilters,
  DocumentData
} from '@dungeon-lab/shared/types/plugin-context.mjs';

import { PluginStoreImpl } from './plugin-store-impl.mjs';
import { PluginEventSystemImpl } from './plugin-event-system-impl.mjs';

/**
 * Socket connection interface for plugin context
 * This matches the socket.io client interface pattern
 */
export interface SocketConnection {
  emit(event: string, ...args: unknown[]): void;
  on(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener?: (...args: unknown[]) => void): void;
}

/**
 * Socket-based ActorsAPI implementation
 */
class SocketActorsAPI implements ActorsAPI {
  constructor(private socket: SocketConnection) {}
  
  async create(data: CreateActorData): Promise<ActorData> {
    return new Promise((resolve, reject) => {
      this.socket.emit('actor:create', data, (response: { success: boolean; data?: ActorData; error?: string }) => {
        if (response.success && response.data) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Failed to create actor'));
        }
      });
    });
  }
  
  async get(id: string): Promise<ActorData> {
    return new Promise((resolve, reject) => {
      this.socket.emit('actor:get', { id }, (response: { success: boolean; data?: ActorData; error?: string }) => {
        if (response.success && response.data) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Failed to get actor'));
        }
      });
    });
  }
  
  async update(id: string, data: Partial<ActorData>): Promise<ActorData> {
    return new Promise((resolve, reject) => {
      this.socket.emit('actor:update', { id, ...data }, (response: { success: boolean; data?: ActorData; error?: string }) => {
        if (response.success && response.data) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Failed to update actor'));
        }
      });
    });
  }
  
  async delete(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit('actor:delete', { id }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to delete actor'));
        }
      });
    });
  }
  
  async list(filters?: ActorFilters): Promise<ActorData[]> {
    return new Promise((resolve, reject) => {
      this.socket.emit('actor:list', { filters }, (response: { success: boolean; data?: ActorData[]; error?: string }) => {
        if (response.success && response.data) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Failed to list actors'));
        }
      });
    });
  }
}

/**
 * Socket-based ItemsAPI implementation
 */
class SocketItemsAPI implements ItemsAPI {
  constructor(private socket: SocketConnection) {}
  
  async create(data: CreateItemData): Promise<ItemData> {
    return new Promise((resolve, reject) => {
      this.socket.emit('item:create', data, (response: { success: boolean; data?: ItemData; error?: string }) => {
        if (response.success && response.data) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Failed to create item'));
        }
      });
    });
  }
  
  async get(id: string): Promise<ItemData> {
    return new Promise((resolve, reject) => {
      this.socket.emit('item:get', { id }, (response: { success: boolean; data?: ItemData; error?: string }) => {
        if (response.success && response.data) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Failed to get item'));
        }
      });
    });
  }
  
  async update(id: string, data: Partial<ItemData>): Promise<ItemData> {
    return new Promise((resolve, reject) => {
      this.socket.emit('item:update', { id, ...data }, (response: { success: boolean; data?: ItemData; error?: string }) => {
        if (response.success && response.data) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Failed to update item'));
        }
      });
    });
  }
  
  async delete(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit('item:delete', { id }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to delete item'));
        }
      });
    });
  }
  
  async list(filters?: ItemFilters): Promise<ItemData[]> {
    return new Promise((resolve, reject) => {
      this.socket.emit('item:list', { filters }, (response: { success: boolean; data?: ItemData[]; error?: string }) => {
        if (response.success && response.data) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Failed to list items'));
        }
      });
    });
  }
}

/**
 * Socket-based DocumentsAPI implementation (placeholder)
 */
class SocketDocumentsAPI implements DocumentsAPI {
  constructor() {
    // Documents API not yet implemented - socket parameter ignored for now
  }
  
  async create(): Promise<DocumentData> {
    // Documents API not yet implemented in socket layer
    throw new Error('Documents API not yet implemented');
  }
  
  async get(): Promise<DocumentData> {
    throw new Error('Documents API not yet implemented');
  }
  
  async update(): Promise<DocumentData> {
    throw new Error('Documents API not yet implemented');
  }
  
  async delete(): Promise<void> {
    throw new Error('Documents API not yet implemented');
  }
  
  async search(): Promise<DocumentData[]> {
    throw new Error('Documents API not yet implemented');
  }
}

/**
 * Socket-based PluginContext implementation
 * Provides real plugin context that connects to the socket infrastructure
 */
export class PluginContextImpl implements PluginContext {
  public readonly api: {
    actors: ActorsAPI;
    items: ItemsAPI;
    documents: DocumentsAPI;
  };
  
  public readonly store: PluginStore;
  public readonly events: PluginEventSystem;
  
  constructor(
    private socket: SocketConnection,
    private pluginId: string
  ) {
    // Initialize API clients
    this.api = {
      actors: new SocketActorsAPI(socket),
      items: new SocketItemsAPI(socket),
      documents: new SocketDocumentsAPI()
    };
    
    // Initialize plugin-scoped store and event system
    this.store = new PluginStoreImpl();
    this.events = new PluginEventSystemImpl(pluginId);
    
    console.log(`[PluginContext] Created context for plugin '${pluginId}'`);
  }
  
  /**
   * Get the plugin ID this context belongs to
   */
  getPluginId(): string {
    return this.pluginId;
  }
  
  /**
   * Get direct access to the socket for plugin-specific events
   */
  getSocket(): SocketConnection {
    return this.socket;
  }
  
  /**
   * Cleanup resources when plugin is unloaded
   */
  destroy(): void {
    // Clear store (cast to implementation to access clear method)
    (this.store as PluginStoreImpl).clear();
    
    // Remove all event listeners (cast to implementation to access removeAllListeners method)
    (this.events as PluginEventSystemImpl).removeAllListeners();
    
    console.log(`[PluginContext] Destroyed context for plugin '${this.pluginId}'`);
  }
}

/**
 * Factory function to create PluginContext instances
 */
export function createPluginContext(socket: SocketConnection, pluginId: string): PluginContext {
  return new PluginContextImpl(socket, pluginId);
}