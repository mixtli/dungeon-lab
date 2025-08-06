import { defineStore } from 'pinia';
import { ref, watch, computed } from 'vue';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';
import { ActorsClient } from '@dungeon-lab/client/index.mjs';
import { useSocketStore } from './socket.store.mjs';
import { useCampaignStore } from './campaign.store.mjs';
import type { PatchActorRequest } from '@dungeon-lab/shared/types/api/index.mjs';

const actorClient = new ActorsClient();

export const useActorStore = defineStore(
  'actor',
  () => {
    // State
    const actors = ref<IActor[]>([]);
    const currentActor = ref<IActor | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const lastFetched = ref<Date | null>(null);
    
    // Socket store for real-time communication
    const socketStore = useSocketStore();
    const campaignStore = useCampaignStore();

    // Constants
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    // Get current game system ID
    const currentGameSystemId = computed(() => {
      // Try campaign first, then fall back to localStorage
      return campaignStore.currentCampaign?.pluginId || 
             localStorage.getItem('activeGameSystem') || 
             localStorage.getItem('activeGameSession') || 
             null;
    });

    // Socket-based methods
    async function fetchActors(): Promise<IActor[]> {
      return new Promise((resolve, reject) => {
        loading.value = true;
        error.value = null;

        if (!socketStore.socket) {
          reject(new Error('Socket not connected'));
          return;
        }

        const gameSystemId = currentGameSystemId.value;
        if (!gameSystemId) {
          reject(new Error('No active game system'));
          return;
        }

        const filters = { pluginId: gameSystemId };
        socketStore.emit('actor:list', filters, (response: { success: boolean; data?: IActor[]; error?: string }) => {
          if (response.success && response.data) {
            actors.value = response.data;
            lastFetched.value = new Date();
            resolve(response.data);
          } else {
            const errorMsg = response.error || 'Failed to fetch actors';
            error.value = errorMsg;
            reject(new Error(errorMsg));
          }
          loading.value = false;
        });
      });
    }



    async function updateActor(actorId: string, updateData: PatchActorRequest): Promise<IActor> {
      return new Promise((resolve, reject) => {
        loading.value = true;
        error.value = null;

        if (!socketStore.socket) {
          reject(new Error('Socket not connected'));
          return;
        }

        socketStore.emit('actor:update', { id: actorId, ...updateData }, (response: { success: boolean; data?: IActor; error?: string }) => {
          if (response.success && response.data) {
            // Note: Actor will be updated in local state via broadcast event
            resolve(response.data);
          } else {
            const errorMsg = response.error || 'Failed to update actor';
            error.value = errorMsg;
            reject(new Error(errorMsg));
          }
          loading.value = false;
        });
      });
    }

    async function deleteActor(actorId: string): Promise<void> {
      return new Promise((resolve, reject) => {
        loading.value = true;
        error.value = null;

        if (!socketStore.socket) {
          reject(new Error('Socket not connected'));
          return;
        }

        socketStore.emit('actor:delete', actorId, (response: { success: boolean; error?: string }) => {
          if (response.success) {
            // Note: Actor will be removed from local state via broadcast event
            resolve();
          } else {
            const errorMsg = response.error || 'Failed to delete actor';
            error.value = errorMsg;
            reject(new Error(errorMsg));
          }
          loading.value = false;
        });
      });
    }

    async function ensureActorsLoaded(forceRefresh = false): Promise<IActor[]> {
      const now = new Date();
      const shouldRefresh = forceRefresh || 
        actors.value.length === 0 || 
        !lastFetched.value || 
        (now.getTime() - lastFetched.value.getTime()) > CACHE_DURATION;

      if (shouldRefresh) {
        try {
          await fetchActors();
        } catch (error) {
          console.warn('Failed to fetch actors via socket, using existing cache:', error);
          // If we have cached data, use it; otherwise rethrow
          if (actors.value.length === 0) {
            throw error;
          }
        }
      }
      
      return actors.value;
    }

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

    // Socket event handlers for reactive updates
    function setupSocketHandlers() {
      const socket = socketStore.socket;
      if (!socket) {
        console.log('[Actor Store] No socket available, skipping handler setup');
        return;
      }

      console.log('[Actor Store] Setting up socket handlers. Socket connected:', socket.connected);

      // Clean up any existing listeners to prevent duplicates
      socket.off('actor:updated');
      socket.off('actor:deleted');

      socket.on('actor:updated', (updatedActor: Partial<IActor> & { id: string; name: string }) => {
        console.log('[Actor Store] Actor updated event received:', updatedActor);
        // Add default fields if missing
        const actorWithDefaults: IActor = {
          ...updatedActor,
          slug: updatedActor.slug || updatedActor.name?.toLowerCase().replace(/\s+/g, '-') || '',
          userData: updatedActor.userData || {},
          pluginData: updatedActor.pluginData || {},
          itemState: updatedActor.itemState || {}, // Ensure itemState is always defined
          pluginId: updatedActor.pluginId || 'unknown',
          documentType: updatedActor.documentType || 'actor',
          pluginDocumentType: updatedActor.pluginDocumentType || 'unknown'
        };
        const index = actors.value.findIndex(a => a.id === actorWithDefaults.id);
        if (index !== -1) {
          actors.value[index] = actorWithDefaults;
        }
        if (currentActor.value?.id === actorWithDefaults.id) {
          currentActor.value = actorWithDefaults;
        }
      });

      socket.on('actor:deleted', (actorId: string) => {
        console.log('[Actor Store] Actor deleted event received:', actorId);
        actors.value = actors.value.filter((a: { id: string; }) => a.id !== actorId);
        if (currentActor.value?.id === actorId) {
          currentActor.value = null;
        }
      });

      console.log('[Actor Store] Socket handlers setup complete');
    }

    // Watch for socket changes and setup handlers
    watch(
      () => socketStore.socket,
      (newSocket, oldSocket) => {
        console.log('[Actor Store] Socket changed:', {
          newSocketConnected: newSocket?.connected,
          oldSocketConnected: oldSocket?.connected
        });
        setupSocketHandlers();
      },
      { immediate: true }
    );

    // Watch for socket connection status
    watch(
      () => socketStore.connected,
      (isConnected) => {
        console.log('[Actor Store] Socket connection status changed:', isConnected);
        if (isConnected) {
          setupSocketHandlers();
        }
      }
    );

    return {
      // State
      actors,
      currentActor,
      loading,
      error,

      // Actions
      setCurrentActor,
      fetchActors,
      updateActor,
      deleteActor,
      ensureActorsLoaded
    };
  },
  {
    persist: {
      key: 'actor-store',
      storage: localStorage,
      serializer: {
        serialize: (state) => {
          // Custom serializer that properly handles Date objects
          // Only persist actors and currentActor, not socket-related state
          return JSON.stringify({
            actors: state.actors,
            currentActor: state.currentActor
          }, (_, value) => {
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
        }
      }
    }
  }
);
