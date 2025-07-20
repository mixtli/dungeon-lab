import { defineStore } from 'pinia';
import { ref, computed, watch, onMounted } from 'vue';
import type { IGameSession, IActor } from '@dungeon-lab/shared/types/index.mjs';
import { useAuthStore } from './auth.store.mts';
import { useSocketStore } from './socket.store.mjs';
import { useCampaignStore } from './campaign.store.mts';
import { CampaignsClient, ActorsClient } from '@dungeon-lab/client/index.mjs';
import type { JoinCallback } from '@dungeon-lab/shared/types/socket/index.mjs';
// import { useChatStore } from './chat.store.mts';
import { useEncounterStore } from './encounter.store.mts';

export const useGameSessionStore = defineStore(
  'gameSession',
  () => {
    const authStore = useAuthStore();
    const socketStore = useSocketStore();
    const campaignStore = useCampaignStore();
    // const _chatStore = useChatStore();
    const campaignClient = new CampaignsClient();
    const actorClient = new ActorsClient();

    // State
    const currentSession = ref<IGameSession | null>(null);
    const currentCharacter = ref<IActor | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    console.log('gameSessionStore initialized, session:', currentSession.value);
    
    // Initialize socket and join session when component mounts
    onMounted(async () => {
      console.log('gameSessionStore mounted, attempting to initialize socket');
      if (!authStore.user) {
        // Not authenticated, do not connect socket
        return;
      }
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
        console.log('Attempting to join session:', currentSession.value.id, 'with character:', currentCharacter.value?.id);
        joinSession(currentSession.value.id, currentCharacter.value?.id).catch(err => {
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
        if (!authStore.user) {
          throw new Error('User not authenticated');
        }
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
                    // Also set the current actor in the actor store
                    const { useActorStore } = await import('./actor.store.mjs');
                    const actorStore = useActorStore();
                    actorStore.currentActor = actor;
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
                registerSessionListeners(sessionId);

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

    function registerSessionListeners(sessionId: string) {
      if (!socketStore.socket) return;

      // Remove any existing listeners to prevent duplicates
      socketStore.socket.off('userJoinedSession');
      socketStore.socket.off('userLeftSession');
      socketStore.socket.off('encounter:started');
      // Commented out events that aren't in the socket type definitions yet
      // socketStore.socket.off('gameSession:update');
      // socketStore.socket.off('gameSession:end');
      // socketStore.socket.off('gameState:update');

      // Listen for user joined events
      socketStore.socket.on('userJoinedSession', async (data: { userId: string, sessionId: string, actorId?: string }) => {
        console.log('[Socket] Received userJoinedSession event:', data);
        
        if (data.sessionId === sessionId && data.actorId) {
          try {
            // Fetch the actor details
            const actor = await actorClient.getActor(data.actorId);
            
            if (actor) {
              // Add the character to the current session if not already there
              if (currentSession.value && currentSession.value.characters) {
                const existingIndex = currentSession.value.characters.findIndex(c => c.id === actor.id);
                if (existingIndex === -1) {
                  currentSession.value.characters.push(actor);
                }
              }
              
              // System message is now sent from server, no need to send from client
            }
          } catch (err) {
            console.error('Error fetching actor for joined user:', err);
          }
        }
      });

      // Handle user left session events
      socketStore.socket.on('userLeftSession', (data: { 
        userId: string, 
        sessionId: string, 
        actorIds: string[],
        characterNames: string[]
      }) => {
        console.log('[Socket] Received userLeftSession event:', data);
        
        if (data.sessionId === sessionId) {
          // Remove characters from the current session
          if (currentSession.value && currentSession.value.characters) {
            currentSession.value.characters = currentSession.value.characters.filter(
              character => !data.actorIds.includes(character.id)
            );
          }
          
          // System message is now sent from server, no need to send from client
          
          // If this was the current user who left, clear the current character
          if (data.userId === authStore.user?.id) {
            currentCharacter.value = null;
          }
        }
      });

      // Handle encounter started events
      socketStore.socket.on('encounter:started', (data: { sessionId: string, encounterId: string, encounter: unknown, timestamp?: Date }) => {
        console.log('[Socket] Received encounter:started event:', data);
        
        if (data.sessionId === sessionId) {
          // Update the current session with the new encounter ID
          if (currentSession.value) {
            currentSession.value.currentEncounterId = data.encounterId;
            console.log('[GameSession Store] Updated currentEncounterId:', data.encounterId);
            console.log('[GameSession Store] Current session now:', currentSession.value);
          }
          // Save the encounter to the encounter store
          const encounterStore = useEncounterStore();
          encounterStore.currentEncounter = data.encounter as typeof encounterStore.currentEncounter;
          // System message is now sent from server, no need to send from client
        }
      });

      // TODO: Implement these handlers when the server API is finalized
      // socketStore.socket.on('gameSession:update', (data: GameSessionWithId) => {
      //   if (data.id === sessionId) {
      //     console.log('[Socket] Received gameSession:update event:', data);
      //     currentSession.value = data;
      //   }
      // });

      // socketStore.socket.on('gameSession:end', (data: { sessionId: string }) => {
      //   if (data.sessionId === sessionId) {
      //     console.log('[Socket] Received gameSession:end event:', data);
      //     clearSession();
      //   }
      // });

      // socketStore.socket.on('gameState:update', (data: GameStateUpdate) => {
      //   if (data.sessionId === sessionId) {
      //     console.log('[Socket] Received gameState:update event:', data);
      //     // Here we would update game state information
      //     // This is where future game state will be maintained
      //   }
      // });
    }

    function leaveSession() {
      if (currentSession.value && socketStore.socket) {
        if (currentSession.value.id) {
          socketStore.socket.emit('leaveSession', currentSession.value.id);
        }

        // Remove listeners
        socketStore.socket.off('userJoinedSession');
        socketStore.socket.off('userLeftSession');
        // Commented out events that aren't in the socket type definitions yet
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
  { 
    persist: { 
      storage: sessionStorage,
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
        }
      }
    }
  }
);
