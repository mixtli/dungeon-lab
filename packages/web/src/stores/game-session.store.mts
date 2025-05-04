import { defineStore } from 'pinia';
import { ref, computed, watch, onMounted } from 'vue';
import type { IGameSession } from '@dungeon-lab/shared/types/index.mjs';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';
import { useAuthStore } from './auth.store.mts';
import { useSocketStore } from './socket.store.mjs';
import { useCampaignStore } from './campaign.store.mts';
import { CampaignsClient } from '@dungeon-lab/client/index.mjs';
import type { JoinCallback } from '@dungeon-lab/shared/types/socket/index.mjs';

export const useGameSessionStore = defineStore(
  'gameSession',
  () => {
    const authStore = useAuthStore();
    const socketStore = useSocketStore();
    const campaignStore = useCampaignStore();
    const campaignClient = new CampaignsClient();

    // State
    const currentSession = ref<IGameSession | null>(null);
    const currentCharacter = ref<IActor | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    console.log('gameSessionStore initialized, session:', currentSession.value);
    
    // Initialize socket and join session when component mounts
    onMounted(async () => {
      console.log('gameSessionStore mounted, attempting to initialize socket');
      
      if (!socketStore.socket) {
        console.log('Socket not initialized, calling initSocket');
        await socketStore.initSocket();
      }
      
      if (currentSession.value) {
        console.log('Existing session found on mount, waiting for socket connection');
        attemptJoinSession();
      }
    });

    // Watch for socket connected state changes
    watch(
      () => socketStore.connected,
      (isConnected) => {
        console.log('socket connected state changed:', isConnected);
        if (isConnected && currentSession.value) {
          console.log('Socket now connected and session exists, joining session:', currentSession.value.id);
          attemptJoinSession();
        }
      }
    );
    
    // Helper function to attempt joining a session with the current session
    function attemptJoinSession() {
      if (currentSession.value && socketStore.connected) {
        console.log('Attempting to join session:', currentSession.value.id);
        joinSession(currentSession.value.id).catch(err => {
          console.error('Failed to join session:', err);
        });
      }
    }

    // Computed
    const isGameMaster = computed(() => {
      return currentSession.value?.gameMasterId === authStore.user?.id;
    });

    // Actions
    async function joinSession(sessionId: string, actorId?: string) {
      console.log('joinSession called with sessionId:', sessionId);
      loading.value = true;
      error.value = null;

      try {
        // Ensure socket is connected before proceeding
        if (!socketStore.socket) {
          console.log('Socket not initialized, initializing now');
          await socketStore.initSocket();
        }
        
        if (!socketStore.connected) {
          console.log('Socket not connected, waiting for connection...');
          // Wait up to 5 seconds for the socket to connect
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Socket connection timeout'));
            }, 5000);
            
            const unwatch = watch(
              () => socketStore.connected,
              (isConnected) => {
                if (isConnected) {
                  clearTimeout(timeout);
                  unwatch();
                  resolve();
                }
              },
              { immediate: true }
            );
          });
        }

        // Double-check that socket is connected before proceeding
        if (!socketStore.connected || !socketStore.socket) {
          throw new Error('Socket not connected after waiting');
        }

        return new Promise<IGameSession>((resolve, reject) => {
          console.log('Emitting joinSession event');
          socketStore.socket?.emit(
            'joinSession',
            sessionId,
            actorId,
            async (response: JoinCallback) => {
              console.log('joinSession response', response);
              if (response.success && response.data) {
                currentSession.value = response.data;

                // If joining with an actor, set it as the current character
                if (actorId) {
                  // Find the actor in the session's characters
                  const actor = response.data.characters?.find((c) => c.id === actorId);
                  if (actor) {
                    currentCharacter.value = actor;
                  }
                }

                // Fetch and set the active campaign
                if (response.data.campaignId) {
                  try {
                    const campaign = await campaignClient.getCampaign(response.data.campaignId);
                    campaignStore.setActiveCampaign(campaign);
                  } catch (err) {
                    console.error('Error fetching campaign for session:', err);
                  }
                }

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
            }
          );

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
      campaignStore.setActiveCampaign(null);
      currentCharacter.value = null;
      error.value = null;
    }

    return {
      currentSession,
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
