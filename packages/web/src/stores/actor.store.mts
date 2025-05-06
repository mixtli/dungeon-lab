import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';
import { ActorsClient } from '@dungeon-lab/client/index.mjs';

const actorClient = new ActorsClient();

export const useActorStore = defineStore(
  'actor',
  () => {
    // State
    const currentActor = ref<IActor | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Actions
    async function setCurrentActor(actorId: string) {
      loading.value = true;
      error.value = null;

      try {
        const actor = await actorClient.getActor(actorId);
        if (actor) {
          currentActor.value = actor;
        }
        return currentActor.value;
      } catch (err: unknown) {
        error.value = err instanceof Error ? err.message : `Failed to fetch actor ${actorId}`;
        console.error(`Error fetching actor ${actorId}:`, err);
        return null;
      } finally {
        loading.value = false;
      }
    }

    return {
      // State
      currentActor,
      loading,
      error,

      // Actions
      setCurrentActor
    };
  },
  {
    // @ts-ignore - The type definitions for Pinia persist don't include all available options
    persist: {
      key: 'actor-store',
      storage: localStorage,
      serializer: {
        serialize: (state) => {
          // Custom serializer that properly handles Date objects
          return JSON.stringify(state, (_, value) => {
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
        },
      },
    },
  }
);
