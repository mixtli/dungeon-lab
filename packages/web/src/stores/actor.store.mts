import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { type IActor } from '@dungeon-lab/shared/schemas/actor.schema.mjs';
import * as actorApi from '../api/actors.client.mts';
import { CreateActorRequest, PatchActorRequest } from '@dungeon-lab/shared/types/api/index.mjs';

export const useActorStore = defineStore('actor', () => {
  // State
  const actors = ref<IActor[]>([]);
  const currentActor = ref<IActor | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const myActors = computed(() => actors.value);
  const getActorById = (id: string) => actors.value.find((a: IActor) => a.id === id);

  // Actions
  async function fetchActors() {
    loading.value = true;
    error.value = null;

    try {
      // Get all actors (the API will filter for the current user's actors)
      actors.value = await actorApi.getActors();
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
      if (actor) {
        currentActor.value = actor;

        // Also update in the actors list if it exists
        const index = actors.value.findIndex((a: IActor) => a.id === id);
        if (index !== -1) {
          actors.value[index] = actor;
        }
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

  async function createActor(actorData: CreateActorRequest) {
    loading.value = true;
    error.value = null;

    try {
      const newActor = await actorApi.createActor(actorData);
      if (newActor) {
        actors.value.push(newActor as IActor);
        currentActor.value = newActor as IActor;
      }
      return newActor as IActor;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to create actor';
      console.error('Error creating actor:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateActor(id: string, actorData: PatchActorRequest) {
    loading.value = true;
    error.value = null;

    try {
      const updatedActor = await actorApi.patchActor(id, actorData);

      // Update in actors list if actor was returned and exists in the list
      if (updatedActor) {
        const index = actors.value.findIndex((a: IActor) => a.id === id);
        if (index !== -1) {
          actors.value[index] = updatedActor as IActor;
        }

        // Update current actor if it's the one being edited
        if (currentActor.value?.id === id) {
          currentActor.value = updatedActor as IActor;
        }
      }

      return updatedActor as IActor;
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
      actors.value = actors.value.filter((a: IActor) => a.id !== id);

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
