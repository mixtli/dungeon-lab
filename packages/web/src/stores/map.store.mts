import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { IMap } from '@dungeon-lab/shared/types/index.mjs';
import { MapsClient } from '@dungeon-lab/client/index.mjs';
import { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';

const mapClient = new MapsClient();

export const useMapStore = defineStore('map', () => {
  const currentMap = ref<IMapResponse | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchMap(mapId: string): Promise<IMap | null> {
    loading.value = true;
    error.value = null;

    try {
      const map = await mapClient.getMap(mapId);
      if (map) {
        currentMap.value = map;
        return map;
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch map:', err);
      error.value = err instanceof Error ? err.message : 'Failed to fetch map';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createMap(data: Omit<IMap, 'id'>): Promise<IMap> {
    loading.value = true;
    error.value = null;

    try {
      const map = await mapClient.createMap(data);
      if (map) {
        currentMap.value = map;
        return map;
      }
      throw new Error('Failed to create map: No map returned from API');
    } catch (err) {
      console.error('Failed to create map:', err);
      error.value = err instanceof Error ? err.message : 'Failed to create map';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateMap(mapId: string, data: Partial<IMap>): Promise<IMap> {
    loading.value = true;
    error.value = null;

    try {
      const map = await mapClient.updateMap(mapId, data);
      if (map) {
        if (currentMap.value?.id === mapId) {
          currentMap.value = map;
        }
        return map;
      }
      throw new Error('Failed to update map: No map returned from API');
    } catch (err) {
      console.error('Failed to update map:', err);
      error.value = err instanceof Error ? err.message : 'Failed to update map';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteMap(mapId: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await mapClient.deleteMap(mapId);
      if (currentMap.value?.id === mapId) {
        currentMap.value = null;
      }
    } catch (err) {
      console.error('Failed to delete map:', err);
      error.value = err instanceof Error ? err.message : 'Failed to delete map';
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
    createMap,
    updateMap,
    deleteMap
  };
});
