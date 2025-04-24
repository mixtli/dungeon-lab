import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { IItem } from '@dungeon-lab/shared/index.mjs';
import * as itemApi from '../api/items.mjs';

export const useItemStore = defineStore('item', () => {
  // State
  const items = ref<IItem[]>([]);
  const currentItem = ref<IItem | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  // Getters
  const myItems = computed(() => items.value);
  const getItemById = (id: string) => items.value.find((i) => i.id === id);

  // Actions
  async function fetchItems() {
    loading.value = true;
    error.value = null;
    try {
      items.value = await itemApi.getItems();
    } catch (err) {
      console.error('Error fetching items:', err);
      error.value = err as Error;
    } finally {
      loading.value = false;
    }
  }

  async function fetchItem(itemId: string) {
    loading.value = true;
    error.value = null;
    try {
      currentItem.value = await itemApi.getItem(itemId);
    } catch (err) {
      console.error('Error fetching item:', err);
      error.value = err as Error;
    } finally {
      loading.value = false;
    }
  }

  async function createItem(data: Omit<IItem, 'id'>) {
    loading.value = true;
    error.value = null;
    try {
      const newItem = await itemApi.createItem(data);
      items.value.push(newItem);
      currentItem.value = newItem;
      return newItem;
    } catch (err) {
      console.error('Error creating item:', err);
      error.value = err as Error;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateItem(itemId: string, data: Partial<IItem>) {
    loading.value = true;
    error.value = null;
    try {
      const updatedItem = await itemApi.updateItem(itemId, data);
      const index = items.value.findIndex((item) => item.id === itemId);
      if (index !== -1) {
        items.value[index] = updatedItem;
      }
      if (currentItem.value?.id === itemId) {
        currentItem.value = updatedItem;
      }
      return updatedItem;
    } catch (err) {
      console.error('Error updating item:', err);
      error.value = err as Error;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteItem(itemId: string) {
    loading.value = true;
    error.value = null;
    try {
      await itemApi.deleteItem(itemId);
      items.value = items.value.filter((item) => item.id !== itemId);
      if (currentItem.value?.id === itemId) {
        currentItem.value = null;
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      error.value = err as Error;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchItemsByCampaign(campaignId: string) {
    loading.value = true;
    error.value = null;
    try {
      items.value = await itemApi.getItemsByCampaign(campaignId);
    } catch (err) {
      console.error('Error fetching campaign items:', err);
      error.value = err as Error;
    } finally {
      loading.value = false;
    }
  }

  async function fetchItemsByActor(actorId: string) {
    loading.value = true;
    error.value = null;
    try {
      items.value = await itemApi.getItemsByActor(actorId);
    } catch (err) {
      console.error('Error fetching actor items:', err);
      error.value = err as Error;
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
