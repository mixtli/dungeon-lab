import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useApi } from '../composables/useApi.js';
import type { IMap } from '@dungeon-lab/shared/src/schemas/map.schema.mjs';

export const useMapStore = defineStore('map', () => {
  const currentMap = ref<IMap | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const api = useApi();

  async function fetchMap(mapId: string) {
    loading.value = true;
    error.value = null;
    
    try {
      const map = await api.get<IMap>(`/maps/${mapId}`);
      currentMap.value = map;
      return map;
    } catch (err) {
      console.error('Failed to fetch map:', err);
      error.value = 'Failed to fetch map';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    currentMap,
    loading,
    error,
    fetchMap,
  };
}); 