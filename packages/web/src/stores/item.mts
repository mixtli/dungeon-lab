import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../network/axios.mjs';
import { IItem, IItemCreateData, IItemUpdateData } from '@dungeon-lab/shared/dist/index.mjs';

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
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch items';
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
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch item';
      console.error('Error fetching item:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createItem(data: IItemCreateData) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post('/api/items', data);
      const newItem = response.data;
      items.value.push(newItem);
      return newItem;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to create item';
      console.error('Error creating item:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateItem(id: string, data: IItemUpdateData) {
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
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to update item';
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
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to delete item';
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