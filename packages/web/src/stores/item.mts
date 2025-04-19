import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../network/axios.mjs';
import { type IItem } from '@dungeon-lab/shared/index.mjs';
import { AxiosError } from 'axios';

export const useItemStore = defineStore('item', () => {
  // State
  const items = ref<IItem[]>([]);
  const currentItem = ref<IItem | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const myItems = computed(() => items.value);
  const getItemById = (id: string) => items.value.find(i => i.id === id);

  // Actions
  async function fetchItems() {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get('/api/items');
      items.value = response.data;
      return items.value;
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        error.value = err.response?.data?.message || err.message || 'Failed to fetch items';
      } else if (err instanceof Error) {
        error.value = err.message || 'Failed to fetch items';
      } else {
        error.value = 'Failed to fetch items: Unknown error';
      }
      console.error('Error fetching items:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchItem(id: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get(`/api/items/${id}`);
      currentItem.value = response.data;
      
      // Also update in the items list if it exists
      const index = items.value.findIndex(i => i.id === id);
      if (index !== -1) {
        items.value[index] = response.data;
      }
      
      return currentItem.value;
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        error.value = err.response?.data?.message || err.message || 'Failed to fetch item';
      } else if (err instanceof Error) {
        error.value = err.message || 'Failed to fetch item';
      } else {
        error.value = 'Failed to fetch item: Unknown error';
      }
      console.error('Error fetching item:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createItem(data: IItem) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post('/api/items', data);
      const newItem = response.data;
      items.value.push(newItem);
      return newItem;
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        error.value = err.response?.data?.message || err.message || 'Failed to create item';
      } else if (err instanceof Error) {
        error.value = err.message || 'Failed to create item';
      } else {
        error.value = 'Failed to create item: Unknown error';
      }
      console.error('Error creating item:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateItem(id: string, data: Partial<IItem>) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.patch(`/api/items/${id}`, data);
      const updatedItem = response.data;
      
      // Update in the items list if it exists
      const index = items.value.findIndex(i => i.id === id);
      if (index !== -1) {
        items.value[index] = updatedItem;
      }
      
      // Update current item if it's the one being edited
      if (currentItem.value?.id === id) {
        currentItem.value = updatedItem;
      }
      
      return updatedItem;
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        error.value = err.response?.data?.message || err.message || 'Failed to update item';
      } else if (err instanceof Error) {
        error.value = err.message || 'Failed to update item';
      } else {
        error.value = 'Failed to update item: Unknown error';
      }
      console.error('Error updating item:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteItem(id: string) {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/api/items/${id}`);
      
      // Remove from the items list if it exists
      items.value = items.value.filter(i => i.id !== id);
      
      // Clear current item if it's the one being deleted
      if (currentItem.value?.id === id) {
        currentItem.value = null;
      }
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        error.value = err.response?.data?.message || err.message || 'Failed to delete item';
      } else if (err instanceof Error) {
        error.value = err.message || 'Failed to delete item';
      } else {
        error.value = 'Failed to delete item: Unknown error';
      }
      console.error('Error deleting item:', err);
      throw err;
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
  };
}); 