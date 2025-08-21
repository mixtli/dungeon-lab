import { defineStore } from 'pinia';
import { ref, computed, watch, onMounted } from 'vue';
import type { IGameSession, IActor } from '@dungeon-lab/shared/types/index.mjs';
import { useAuthStore } from './auth.store.mts';
import { useSocketStore } from './socket.store.mjs';
import { ActorsClient } from '@dungeon-lab/client/index.mjs';
import { gmActionHandlerService } from '../services/gm-action-handler.service.mjs';
import type { z } from 'zod';
import {
  gameSessionJoinCallbackSchema,
  gameSessionLeaveCallbackSchema
} from '@dungeon-lab/shared/schemas/socket/game-state.mjs';
// import { useChatStore } from './chat.store.mts';
// Encounter functionality now handled by game-state.store.mts

export const useGameSessionStore = defineStore(
  'gameSession',
  () => {
    const authStore = useAuthStore();
    const socketStore = useSocketStore();
    // const _chatStore = useChatStore();
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
        console.log('Existing session found on mount (restored from persistence), waiting for socket connection');
        attemptJoinSession();
      } else {
        console.log('No persisted session found');
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
          console.log('Emitting gameSession:join event');
          socketStore.socket?.emit(
            'gameSession:join',
            sessionId,
            async (response: z.infer<typeof gameSessionJoinCallbackSchema>) => {
              console.log('gameSession:join response', response);
              if (response.success && response.session) {
                currentSession.value = response.session as IGameSession;

                // If joining with an actor, set it as the current character
                if (actorId) {
                  // Find the actor in the session's characters
                  const session = response.session as IGameSession;
                  const actor = session.characters?.find((c) => c.id === actorId);
                  if (actor && actor.documentType === 'actor') {
                    currentCharacter.value = actor;
                    // TODO: Update game state store with selected character
                    // const gameStateStore = useGameStateStore();
                    // gameStateStore.selectedCharacter = actor;
                  }
                }

                // Session joined successfully - campaign data will be available through game state
                const session = response.session as IGameSession;

                // Initialize GM action handler if this user is the GM
                const isGM = session.gameMasterId === authStore.user?.id;
                if (isGM) {
                  console.log('[GameSession] User is GM - initializing action handler');
                  gmActionHandlerService.init();
                }

                loading.value = false;

                // Register socket listeners for this session
                registerSessionListeners(sessionId);

                resolve(session);
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
      socketStore.socket.off('gameSession:joined');
      socketStore.socket.off('gameSession:left');
      socketStore.socket.off('gameSession:paused');
      socketStore.socket.off('gameSession:resumed');
      socketStore.socket.off('gameSession:ended');

      // Listen for user joined events
      socketStore.socket.on('gameSession:joined', async (data: { userId: string, sessionId: string, actorId?: string }) => {
        console.log('[Socket] Received gameSession:joined event:', data);
        
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
      socketStore.socket.on('gameSession:left', (data: { 
        userId: string, 
        sessionId: string, 
        userName: string,
        timestamp: number
      }) => {
        console.log('[Socket] Received gameSession:left event:', data);
        
        if (data.sessionId === sessionId) {
          // Remove characters owned by the user who left the session
          if (currentSession.value && currentSession.value.characters) {
            currentSession.value.characters = currentSession.value.characters.filter(
              character => character.createdBy !== data.userId
            );
          }
          
          // System message is now sent from server, no need to send from client
          
          // If this was the current user who left, clear the current character
          if (data.userId === authStore.user?.id) {
            currentCharacter.value = null;
          }
        }
      });

      // Handle session paused events
      socketStore.socket.on('gameSession:paused', (data: { sessionId: string, pausedBy: string, timestamp: number }) => {
        if (data.sessionId === sessionId && currentSession.value) {
          console.log('[Socket] Received gameSession:paused event:', data);
          currentSession.value.status = 'paused';
        }
      });

      // Handle session resumed events
      socketStore.socket.on('gameSession:resumed', (data: { sessionId: string, resumedBy: string, timestamp: number }) => {
        if (data.sessionId === sessionId && currentSession.value) {
          console.log('[Socket] Received gameSession:resumed event:', data);
          currentSession.value.status = 'active';
        }
      });

      // Handle session ended events
      socketStore.socket.on('gameSession:ended', (data: { sessionId: string, endedBy: string, timestamp: number }) => {
        if (data.sessionId === sessionId) {
          console.log('[Socket] Received gameSession:ended event:', data);
          clearSession();
        }
      });

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
        const sessionId = currentSession.value.id;
        if (sessionId) {
          console.log('Emitting gameSession:leave event');
          socketStore.socket.emit(
            'gameSession:leave', 
            sessionId, 
            (response: z.infer<typeof gameSessionLeaveCallbackSchema>) => {
              console.log('gameSession:leave response', response);
              if (response.success) {
                console.log('Successfully left session');
              } else {
                console.error('Failed to leave session:', response.error);
              }
            }
          );
        }

        // Remove listeners
        socketStore.socket.off('gameSession:joined');
        socketStore.socket.off('gameSession:left');
        socketStore.socket.off('gameSession:paused');
        socketStore.socket.off('gameSession:resumed');
        socketStore.socket.off('gameSession:ended');

        clearSession();
      }
    }

    function clearSession() {
      currentSession.value = null;
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
