import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { type IActor } from '@dungeon-lab/shared/index.mjs';
import * as actorApi from '../api/actors.mjs';

export const useActorStore = defineStore('actor', () => {
  // State
  const actors = ref<IActor[]>([]);
  const currentActor = ref<IActor | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const myActors = computed(() => actors.value);
  const getActorById = (id: string) => actors.value.find((a) => a.id === id);

  // Actions
  async function fetchActors() {
    loading.value = true;
    error.value = null;

    try {
      // Assuming we're getting the current user's actors
      const userId = 'current'; // This should come from auth store or similar
      actors.value = await actorApi.getActorsByUser(userId);
      return actors.value;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch actors';
      console.error('Error fetching actors:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchActor(id: string) {
    loading.value = true;
    error.value = null;

    try {
      const actor = await actorApi.getActor(id);
      currentActor.value = actor;

      // Also update in the actors list if it exists
      const index = actors.value.findIndex((a) => a.id === id);
      if (index !== -1) {
        actors.value[index] = actor;
      }

      return currentActor.value;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : `Failed to fetch actor ${id}`;
      console.error(`Error fetching actor ${id}:`, err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createActor(actorData: Omit<IActor, 'id'>) {
    loading.value = true;
    error.value = null;

    try {
      const newActor = await actorApi.createActor(actorData);
      actors.value.push(newActor);
      currentActor.value = newActor;
      return newActor;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to create actor';
      console.error('Error creating actor:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateActor(id: string, actorData: Partial<IActor>) {
    loading.value = true;
    error.value = null;

    try {
      const updatedActor = await actorApi.updateActor(id, actorData);

      // Update in actors list
      const index = actors.value.findIndex((a) => a.id === id);
      if (index !== -1) {
        actors.value[index] = updatedActor;
      }

      // Update current actor if it's the one being edited
      if (currentActor.value?.id === id) {
        currentActor.value = updatedActor;
      }

      return updatedActor;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : `Failed to update actor ${id}`;
      console.error(`Error updating actor ${id}:`, err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteActor(id: string) {
    loading.value = true;
    error.value = null;

    try {
      await actorApi.deleteActor(id);

      // Remove from actors list
      actors.value = actors.value.filter((a) => a.id !== id);

      // Clear current actor if it's the one being deleted
      if (currentActor.value?.id === id) {
        currentActor.value = null;
      }

      return true;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : `Failed to delete actor ${id}`;
      console.error(`Error deleting actor ${id}:`, err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    actors,
    currentActor,
    loading,
    error,

    // Getters
    myActors,
    getActorById,

    // Actions
    fetchActors,
    fetchActor,
    createActor,
    updateActor,
    deleteActor
  };
});
