import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { IGameSession } from '@dungeon-lab/shared/index.mjs';
import type { IActor } from '@dungeon-lab/shared/schemas/actor.schema.mjs';
import type { ICampaign } from '@dungeon-lab/shared/schemas/campaign.schema.mjs';
import { useAuthStore } from './auth.store.mts';
import { useSocketStore } from './socket.store.mjs';
import type { JoinCallback } from '@dungeon-lab/shared/schemas/socket/index.mjs';

// Interface for game state update events
// interface GameStateUpdate {
//   sessionId: string;
//   state: Record<string, unknown>;
//   timestamp: number;
// }

export const useGameSessionStore = defineStore(
  'gameSession',
  () => {
    const authStore = useAuthStore();
    const socketStore = useSocketStore();

    // State
    const currentSession = ref<IGameSession | null>(null);
    const currentCampaign = ref<ICampaign | null>(null);
    const currentCharacter = ref<IActor | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Computed
    const isGameMaster = computed(() => {
      return currentSession.value?.gameMasterId === authStore.user?.id;
    });

    // Actions
    async function joinSession(sessionId: string) {
      loading.value = true;
      error.value = null;

      try {
        if (!socketStore.socket?.connected) {
          console.log(socketStore.socket);
          throw new Error('Socket not connected');
        }

        return new Promise<IGameSession>((resolve, reject) => {
          socketStore.socket?.emit('joinSession', sessionId, (response: JoinCallback) => {
            console.log('joinSession response', response);
            if (response.success && response.data) {
              currentSession.value = response.data;
              loading.value = false;

              // Register socket listeners for this session
              // registerSessionListeners(sessionId);

              resolve(response.data);
            } else {
              const errorMsg = response.error || 'Failed to join game session';
              error.value = errorMsg;
              loading.value = false;
              reject(new Error(errorMsg));
            }
          });

          // Set a timeout in case the server doesn't respond
          setTimeout(() => {
            if (loading.value) {
              loading.value = false;
              error.value = 'Server did not respond to join request';
              reject(new Error('Server did not respond to join request'));
            }
          }, 10000); // 10 second timeout
        });
      } catch (err: unknown) {
        loading.value = false;
        if (err instanceof Error) {
          error.value = err.message || 'Failed to join game session';
        } else {
          error.value = 'Failed to join game session: Unknown error';
        }
        console.error('Error joining game session:', err);
        throw err;
      }
    }

    // function registerSessionListeners(sessionId: string) {
    //   if (!socketStore.socket) return;

    // Remove any existing listeners to prevent duplicates
    // socketStore.socket.off('gameSession:update');
    // socketStore.socket.off('gameSession:end');
    // socketStore.socket.off('gameState:update');

    // // Listen for session updates
    // socketStore.socket.on('gameSession:update', (data: GameSessionWithId) => {
    //   if (data.id === sessionId) {
    //     console.log('[Socket] Received gameSession:update event:', data);
    //     currentSession.value = data;
    //   }
    // });

    // // Listen for session end
    // socketStore.socket.on('gameSession:end', (data: { sessionId: string }) => {
    //   if (data.sessionId === sessionId) {
    //     console.log('[Socket] Received gameSession:end event:', data);
    //     clearSession();
    //   }
    // });

    // // Listen for game state updates
    // socketStore.socket.on('gameState:update', (data: GameStateUpdate) => {
    //   if (data.sessionId === sessionId) {
    //     console.log('[Socket] Received gameState:update event:', data);
    //     // Here we would update game state information
    //     // This is where future game state will be maintained
    //   }
    // });
    //}

    function leaveSession() {
      if (currentSession.value && socketStore.socket) {
        if (currentSession.value.id) {
          socketStore.socket.emit('leaveSession', currentSession.value.id);
        }

        // // Remove listeners
        // socketStore.socket.off('gameSession:update');
        // socketStore.socket.off('gameSession:end');
        // socketStore.socket.off('gameState:update');

        clearSession();
      }
    }

    function clearSession() {
      currentSession.value = null;
      currentCampaign.value = null;
      currentCharacter.value = null;
      error.value = null;
    }

    return {
      currentSession,
      currentCampaign,
      currentCharacter,
      loading,
      error,
      isGameMaster,
      joinSession,
      leaveSession,
      clearSession
    };
  },
  { persist: { storage: localStorage } }
);
