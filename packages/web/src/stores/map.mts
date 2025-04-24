import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { IMap } from '@dungeon-lab/shared/schemas/map.schema.mjs';
import * as mapApi from '../api/maps.mjs';

export const useMapStore = defineStore('map', () => {
  const currentMap = ref<IMap | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchMap(mapId: string) {
    loading.value = true;
    error.value = null;

    try {
      const map = await mapApi.getMap(mapId);
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

  async function createMap(data: Omit<IMap, 'id'>): Promise<IMap> {
    loading.value = true;
    error.value = null;

    try {
      const map = await mapApi.createMap(data);
      currentMap.value = map;
      return map;
    } catch (err) {
      console.error('Failed to create map:', err);
      error.value = 'Failed to create map';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateMap(mapId: string, data: Partial<IMap>): Promise<IMap> {
    loading.value = true;
    error.value = null;

    try {
      const map = await mapApi.updateMap(mapId, data);
      if (currentMap.value?.id === mapId) {
        currentMap.value = map;
      }
      return map;
    } catch (err) {
      console.error('Failed to update map:', err);
      error.value = 'Failed to update map';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteMap(mapId: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await mapApi.deleteMap(mapId);
      if (currentMap.value?.id === mapId) {
        currentMap.value = null;
      }
    } catch (err) {
      console.error('Failed to delete map:', err);
      error.value = 'Failed to delete map';
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
