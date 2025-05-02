import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { IItem } from '@dungeon-lab/shared/types/index.mjs';
import { ItemsClient } from '@dungeon-lab/client/index.mjs';
import { CreateItemRequest, PatchItemRequest } from '@dungeon-lab/shared/types/api/index.mjs';

const itemClient = new ItemsClient();

export const useItemStore = defineStore('item', () => {
  // State
  const items = ref<IItem[]>([]);
  const currentItem = ref<IItem | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const myItems = computed(() => items.value);
  const getItemById = (id: string) => items.value.find((i: IItem) => i.id === id);

  // Actions
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

    // Actions
    fetchItems,
    fetchItem,
    createItem,
    updateItem,
    deleteItem,
    fetchItemsByCampaign,
    fetchItemsByActor
  };
});
