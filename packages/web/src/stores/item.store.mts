import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { IItem } from '@dungeon-lab/shared/types/index.mjs';
import { ItemsClient } from '@dungeon-lab/client/index.mjs';
import { CreateItemRequest, PatchItemRequest } from '@dungeon-lab/shared/types/api/index.mjs';
import { useSocketStore } from './socket.store.mjs';
import { useCampaignStore } from './campaign.store.mjs';

const itemClient = new ItemsClient();

export const useItemStore = defineStore('item', () => {
  // State
  const items = ref<IItem[]>([]);
  const currentItem = ref<IItem | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastFetched = ref<Date | null>(null);
  
  // Socket store for real-time communication
  const socketStore = useSocketStore();
  const campaignStore = useCampaignStore();

  // Constants
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Get current game system ID
  const currentGameSystemId = computed(() => {
    return campaignStore.currentCampaign?.gameSystemId || null;
  });

  // Getters
  const myItems = computed(() => items.value);
  const getItemById = (id: string) => items.value.find((i: IItem) => i.id === id);

  // Socket-based methods
  async function fetchItemsSocket(): Promise<IItem[]> {
    return new Promise((resolve, reject) => {
      loading.value = true;
      error.value = null;

      if (!socketStore.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      const gameSystemId = currentGameSystemId.value;
      if (!gameSystemId) {
        reject(new Error('No active game system'));
        return;
      }

      const filters = { gameSystemId };
      socketStore.emit('item:list', filters, (response: { success: boolean; data?: IItem[]; error?: string }) => {
        if (response.success && response.data) {
          items.value = response.data;
          lastFetched.value = new Date();
          resolve(response.data);
        } else {
          const errorMsg = response.error || 'Failed to fetch items';
          error.value = errorMsg;
          reject(new Error(errorMsg));
        }
        loading.value = false;
      });
    });
  }

  async function createItemSocket(itemData: CreateItemRequest): Promise<IItem> {
    return new Promise((resolve, reject) => {
      loading.value = true;
      error.value = null;

      if (!socketStore.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socketStore.emit('item:create', itemData, (response: { success: boolean; data?: IItem; error?: string }) => {
        if (response.success && response.data) {
          // Note: Item will be added to local state via broadcast event
          resolve(response.data);
        } else {
          const errorMsg = response.error || 'Failed to create item';
          error.value = errorMsg;
          reject(new Error(errorMsg));
        }
        loading.value = false;
      });
    });
  }

  async function updateItemSocket(itemId: string, updateData: PatchItemRequest): Promise<IItem> {
    return new Promise((resolve, reject) => {
      loading.value = true;
      error.value = null;

      if (!socketStore.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socketStore.emit('item:update', { id: itemId, ...updateData }, (response: { success: boolean; data?: IItem; error?: string }) => {
        if (response.success && response.data) {
          // Note: Item will be updated in local state via broadcast event
          resolve(response.data);
        } else {
          const errorMsg = response.error || 'Failed to update item';
          error.value = errorMsg;
          reject(new Error(errorMsg));
        }
        loading.value = false;
      });
    });
  }

  async function deleteItemSocket(itemId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      loading.value = true;
      error.value = null;

      if (!socketStore.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socketStore.emit('item:delete', itemId, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          // Note: Item will be removed from local state via broadcast event
          resolve();
        } else {
          const errorMsg = response.error || 'Failed to delete item';
          error.value = errorMsg;
          reject(new Error(errorMsg));
        }
        loading.value = false;
      });
    });
  }

  async function ensureItemsLoaded(forceRefresh = false): Promise<IItem[]> {
    const now = new Date();
    const shouldRefresh = forceRefresh || 
      items.value.length === 0 || 
      !lastFetched.value || 
      (now.getTime() - lastFetched.value.getTime()) > CACHE_DURATION;

    if (shouldRefresh) {
      try {
        await fetchItemsSocket();
      } catch (error) {
        console.warn('Failed to fetch items via socket, using existing cache:', error);
        // If we have cached data, use it; otherwise rethrow
        if (items.value.length === 0) {
          throw error;
        }
      }
    }
    
    return items.value;
  }

  // Socket event handlers for reactive updates
  function setupSocketHandlers() {
    const socket = socketStore.socket;
    if (!socket) {
      console.log('[Item Store] No socket available, skipping handler setup');
      return;
    }

    console.log('[Item Store] Setting up socket handlers. Socket connected:', socket.connected);

    // Clean up any existing listeners to prevent duplicates
    socket.off('item:created');
    socket.off('item:updated');
    socket.off('item:deleted');

    socket.on('item:created', (item: IItem) => {
      console.log('[Item Store] Item created event received:', item);
      items.value.push(item);
    });

    socket.on('item:updated', (updatedItem: IItem) => {
      console.log('[Item Store] Item updated event received:', updatedItem);
      const index = items.value.findIndex(i => i.id === updatedItem.id);
      if (index !== -1) {
        items.value[index] = updatedItem;
      }
      if (currentItem.value?.id === updatedItem.id) {
        currentItem.value = updatedItem;
      }
    });

    socket.on('item:deleted', (itemId: string) => {
      console.log('[Item Store] Item deleted event received:', itemId);
      items.value = items.value.filter(i => i.id !== itemId);
      if (currentItem.value?.id === itemId) {
        currentItem.value = null;
      }
    });

    console.log('[Item Store] Socket handlers setup complete');
  }

  // Watch for socket changes and setup handlers
  watch(
    () => socketStore.socket,
    (newSocket, oldSocket) => {
      console.log('[Item Store] Socket changed:', {
        newSocketConnected: newSocket?.connected,
        oldSocketConnected: oldSocket?.connected
      });
      setupSocketHandlers();
    },
    { immediate: true }
  );

  // Watch for socket connection status
  watch(
    () => socketStore.connected,
    (isConnected) => {
      console.log('[Item Store] Socket connection status changed:', isConnected);
      if (isConnected) {
        setupSocketHandlers();
      }
    }
  );

  // Legacy REST-based actions (kept for backward compatibility)
  async function fetchItems() {
    loading.value = true;
    error.value = null;
    try {
      items.value = await itemClient.getItems();
    } catch (err) {
      console.error('Error fetching items:', err);
      error.value = err instanceof Error ? err.message : 'Failed to fetch items';
    } finally {
      loading.value = false;
    }
  }

  async function fetchItem(itemId: string) {
    loading.value = true;
    error.value = null;
    try {
      const item = await itemClient.getItem(itemId);
      if (item) {
        currentItem.value = item;
      }
    } catch (err) {
      console.error('Error fetching item:', err);
      error.value = err instanceof Error ? err.message : 'Failed to fetch item';
    } finally {
      loading.value = false;
    }
  }

  async function createItem(data: CreateItemRequest) {
    loading.value = true;
    error.value = null;
    try {
      const newItem = await itemClient.createItem(data);
      if (newItem) {
        items.value.push(newItem);
        currentItem.value = newItem;
        return newItem;
      }
      return null;
    } catch (err) {
      console.error('Error creating item:', err);
      error.value = err instanceof Error ? err.message : 'Failed to create item';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateItem(itemId: string, data: PatchItemRequest) {
    loading.value = true;
    error.value = null;
    try {
      const updatedItem = await itemClient.updateItem(itemId, data);
      if (updatedItem) {
        const index = items.value.findIndex((item: IItem) => item.id === itemId);
        if (index !== -1) {
          items.value[index] = updatedItem;
        }
        if (currentItem.value?.id === itemId) {
          currentItem.value = updatedItem;
        }
        return updatedItem;
      }
      return null;
    } catch (err) {
      console.error('Error updating item:', err);
      error.value = err instanceof Error ? err.message : 'Failed to update item';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteItem(itemId: string) {
    loading.value = true;
    error.value = null;
    try {
      await itemClient.deleteItem(itemId);
      items.value = items.value.filter((item: IItem) => item.id !== itemId);
      if (currentItem.value?.id === itemId) {
        currentItem.value = null;
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      error.value = err instanceof Error ? err.message : 'Failed to delete item';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchItemsByCampaign(campaignId: string) {
    loading.value = true;
    error.value = null;
    try {
      items.value = await itemClient.getItemsByCampaign(campaignId);
    } catch (err) {
      console.error('Error fetching campaign items:', err);
      error.value = err instanceof Error ? err.message : 'Failed to fetch campaign items';
    } finally {
      loading.value = false;
    }
  }

  async function fetchItemsByActor(actorId: string) {
    loading.value = true;
    error.value = null;
    try {
      items.value = await itemClient.getItemsByActor(actorId);
    } catch (err) {
      console.error('Error fetching actor items:', err);
      error.value = err instanceof Error ? err.message : 'Failed to fetch actor items';
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    items,
    currentItem,
    loading,
    error,

    // Getters
    myItems,
    getItemById,

    // Socket-based Actions
    fetchItemsSocket,
    createItemSocket,
    updateItemSocket,
    deleteItemSocket,
    ensureItemsLoaded,

    // Legacy REST Actions
    fetchItems,
    fetchItem,
    createItem,
    updateItem,
    deleteItem,
    fetchItemsByCampaign,
    fetchItemsByActor
  };
}, {
  persist: {
    key: 'item-store',
    storage: localStorage,
    serializer: {
      serialize: (state) => {
        // Custom serializer that properly handles Date objects
        // Only persist items and currentItem, not socket-related state
        return JSON.stringify({
          items: state.items,
          currentItem: state.currentItem
        }, (_, value) => {
          // Convert Date objects to a special format with a type marker
          if (value instanceof Date) {
            return { __type: 'Date', value: value.toISOString() };
          }
          return value;
        });
      },
      deserialize: (state) => {
        // Custom deserializer that properly restores Date objects
        return JSON.parse(state, (_, value) => {
          // Check for our special Date object marker
          if (value && typeof value === 'object' && value.__type === 'Date') {
            return new Date(value.value);
          }
          return value;
        });
      }
    }
  }
});
