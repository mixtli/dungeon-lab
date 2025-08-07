import { defineStore } from 'pinia';
import { ref, computed, watch, readonly } from 'vue';
import { z } from 'zod';
import type { 
  ServerGameState,
  StateUpdate, 
  StateUpdateResponse,
  StateUpdateBroadcast,
  StateOperation,
  ICharacter,
  IActor,
  IItem,
  IEncounter,
  IGameSessionPopulated
} from '@dungeon-lab/shared/types/index.mjs';
import {
  gameSessionJoinCallbackSchema,
  gameSessionLeaveCallbackSchema,
  gameStateRequestFullCallbackSchema
} from '@dungeon-lab/shared/schemas/socket/game-state.mjs';
import { useSocketStore } from './socket.store.mjs';
import { useAuthStore } from './auth.store.mjs';

/**
 * Unified Game State Store
 * 
 * This store manages the complete game state for a session using the new
 * unified architecture. It replaces the separate actor, item, encounter,
 * and character-sheet stores.
 * 
 * Key Principles:
 * - GM Authority: GM client sends updates, players receive broadcasts
 * - Sequential Updates: GM updates are queued and processed one at a time
 * - Version Control: Optimistic concurrency with version tracking
 * - State Integrity: Hash verification prevents corruption
 * - Single Source of Truth: All game entities in one reactive object
 */
export const useGameStateStore = defineStore(
  'gameState',
  () => {
    const socketStore = useSocketStore();
    const authStore = useAuthStore();

    // ============================================================================
    // REACTIVE STATE
    // ============================================================================

    // Server-controlled state (wrapped for integrity)
    const gameState = ref<ServerGameState | null>(null);
    const gameStateVersion = ref<string | null>(null);
    const gameStateHash = ref<string | null>(null);

    // Client-only state
    const sessionId = ref<string | null>(null);
    const isGM = ref<boolean>(false);
    
    // UI state
    const selectedCharacter = ref<ICharacter | null>(null);
    const loading = ref<boolean>(false);
    const error = ref<string | null>(null);

    // Update management (GM only)
    const isUpdating = ref<boolean>(false);
    const updateQueue = ref<StateUpdate[]>([]);

    // ============================================================================
    // COMPUTED PROPERTIES - DATA ACCESS
    // ============================================================================

    // Convenient access to game entities
    const characters = computed<ICharacter[]>(() => gameState.value?.characters || []);
    const actors = computed<IActor[]>(() => gameState.value?.actors || []);
    const items = computed<IItem[]>(() => gameState.value?.items || []);
    const currentEncounter = computed<IEncounter | null>(() => gameState.value?.currentEncounter || null);

    // ============================================================================
    // ITEM RELATIONSHIP HELPERS (Plugin-Agnostic)
    // ============================================================================

    /**
     * Get all items owned by a specific character/actor
     * @param ownerId - Character or Actor ID
     * @returns Array of items where item.ownerId matches the provided ID
     */
    const getCharacterItems = computed(() => (ownerId: string): IItem[] => {
      if (!gameState.value) return [];
      return gameState.value.items.filter(item => item.ownerId === ownerId);
    });

    /**
     * Get count of items owned by a character/actor
     * @param ownerId - Character or Actor ID  
     * @returns Number of items owned
     */
    const getCharacterItemCount = computed(() => (ownerId: string): number => {
      return getCharacterItems.value(ownerId).length;
    });

    // Plugin data access
    const pluginData = computed(() => gameState.value?.pluginData || {});

    // Session info
    const hasGameState = computed(() => gameState.value !== null);
    const isInSession = computed(() => sessionId.value !== null);
    const canUpdate = computed(() => isGM.value && hasGameState.value);

    // ============================================================================
    // CORE METHODS - SESSION MANAGEMENT
    // ============================================================================

    /**
     * Join a game session and initialize state
     */
    async function joinGameSession(targetSessionId: string): Promise<boolean> {
      try {
        loading.value = true;
        error.value = null;

        if (!socketStore.socket) {
          throw new Error('Socket not connected');
        }

        // Join session via socket
        return new Promise((resolve, reject) => {
          socketStore.emit('gameSession:join', targetSessionId, (response: z.infer<typeof gameSessionJoinCallbackSchema>) => {
            if (response.success && response.session) {
              sessionId.value = targetSessionId;
              const session = response.session as IGameSessionPopulated;
              isGM.value = session.gameMasterId === authStore.user?.id;
              
              console.log('Joined game session successfully', { 
                sessionId: targetSessionId, 
                isGM: isGM.value 
              });

              // Request initial game state
              requestFullState();
              resolve(true);
            } else {
              const errorMsg = response.error || 'Failed to join session';
              error.value = errorMsg;
              reject(new Error(errorMsg));
            }
          });
        });

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to join session';
        error.value = errorMsg;
        console.error('Error joining game session:', { sessionId: targetSessionId, error: err });
        return false;
      } finally {
        loading.value = false;
      }
    }

    /**
     * Leave the current game session
     */
    async function leaveGameSession(): Promise<void> {
      try {
        if (!sessionId.value || !socketStore.socket) return;

        return new Promise((resolve, reject) => {
          socketStore.emit('gameSession:leave', sessionId.value!, (response: z.infer<typeof gameSessionLeaveCallbackSchema>) => {
            if (response.success) {
              clearState();
              resolve();
            } else {
              reject(new Error(response.error || 'Failed to leave session'));
            }
          });
        });

      } catch (err) {
        console.error('Error leaving game session:', err);
        // Always clear state on error to avoid stuck state
        clearState();
      }
    }

    /**
     * Request full game state from server
     */
    async function requestFullState(): Promise<void> {
      try {
        if (!sessionId.value || !socketStore.socket) {
          throw new Error('No active session or socket connection');
        }

        loading.value = true;
        error.value = null;

        return new Promise((resolve, reject) => {
          socketStore.emit('gameState:requestFull', sessionId.value!, (response: z.infer<typeof gameStateRequestFullCallbackSchema>) => {
            if (response.success && response.data) {
              // Update state with server data
              gameState.value = response.data.gameState as ServerGameState;
              gameStateVersion.value = response.data.gameStateVersion;
              gameStateHash.value = response.data.gameStateHash;


              console.log('Game state refreshed from server', { 
                version: gameStateVersion.value,
                hash: gameStateHash.value 
              });

              resolve();
            } else {
              const errorMsg = response.error || 'Failed to get game state';
              error.value = errorMsg;
              reject(new Error(errorMsg));
            }
          });
        });

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to refresh state';
        error.value = errorMsg;
        console.error('Error requesting full state:', err);
        throw err;
      } finally {
        loading.value = false;
      }
    }

    // ============================================================================
    // GM UPDATE METHODS
    // ============================================================================

    /**
     * Update game state (GM only)
     * Handles sequential processing with optimistic concurrency control
     */
    async function updateGameState(operations: StateOperation[]): Promise<StateUpdateResponse> {
      if (!canUpdate.value) {
        throw new Error('Not authorized to update game state');
      }

      if (!socketStore.socket) {
        throw new Error('Socket not connected');
      }

      // Queue update if another update is in progress
      if (isUpdating.value) {
        const queuedUpdate: StateUpdate = {
          id: generateUpdateId(),
          sessionId: sessionId.value!,
          version: gameStateVersion.value!,
          operations,
          timestamp: Date.now(),
          source: 'gm'
        };
        updateQueue.value.push(queuedUpdate);
        
        console.log('Update queued (another update in progress)', { 
          queuedId: queuedUpdate.id,
          queueLength: updateQueue.value.length 
        });

        // Return a pending response - the queued update will be processed later
        return {
          success: true,
          newVersion: gameStateVersion.value || undefined
        };
      }

      // Process update immediately
      return await processUpdate(operations);
    }

    /**
     * Process a single state update
     */
    async function processUpdate(operations: StateOperation[]): Promise<StateUpdateResponse> {
      isUpdating.value = true;
      
      try {
        const update: StateUpdate = {
          id: generateUpdateId(),
          sessionId: sessionId.value!,
          version: gameStateVersion.value!,
          operations,
          timestamp: Date.now(),
          source: 'gm'
        };

        console.log('Processing state update', { 
          updateId: update.id,
          operationCount: operations.length,
          currentVersion: gameStateVersion.value 
        });

        return new Promise((resolve) => {
          socketStore.emit('gameState:update', update, (response: StateUpdateResponse) => {
            if (response.success) {
              // Apply changes locally only after server confirmation
              applyStateOperations(operations);
              
              if (response.newVersion) {
                gameStateVersion.value = response.newVersion;
              }
              if (response.newHash) {
                gameStateHash.value = response.newHash;
              }


              console.log('State update successful', { 
                updateId: update.id,
                newVersion: response.newVersion 
              });

              resolve(response);
            } else {
              console.error('State update failed', { 
                updateId: update.id,
                error: response.error 
              });
              
              handleUpdateError(response.error);
              resolve(response);
            }
          });
        });

      } finally {
        isUpdating.value = false;
        // Process next queued update if any
        processUpdateQueue();
      }
    }

    /**
     * Process queued updates sequentially
     */
    async function processUpdateQueue(): Promise<void> {
      if (updateQueue.value.length === 0 || isUpdating.value) {
        return;
      }

      const nextUpdate = updateQueue.value.shift();
      if (nextUpdate) {
        console.log('Processing queued update', { 
          queuedId: nextUpdate.id,
          remainingQueue: updateQueue.value.length 
        });
        
        await processUpdate(nextUpdate.operations);
      }
    }

    // ============================================================================
    // STATE OPERATIONS
    // ============================================================================

    /**
     * Apply state operations to local game state
     * This mirrors the server-side operation processing
     */
    function applyStateOperations(operations: StateOperation[]): void {
      if (!gameState.value) return;

      for (const op of operations) {
        applyOperation(gameState.value, op);
      }
    }

    /**
     * Apply a single state operation to the game state object
     */
    function applyOperation(state: ServerGameState, operation: StateOperation): void {
      const path = operation.path;
      const pathParts = path.split('.');

      // Navigate to the target object/array
      let current: Record<string, unknown> = state as Record<string, unknown>;

      for (let i = 0; i < pathParts.length - 1; i++) {
        const key = pathParts[i];
        
        if (current[key] === undefined) {
          // Create missing intermediate objects
          current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
      }

      const finalKey = pathParts[pathParts.length - 1];

      // Apply the operation
      switch (operation.operation) {
        case 'set':
          current[finalKey] = operation.value;
          break;
          
        case 'unset':
          delete current[finalKey];
          break;
          
        case 'inc': {
          const currentValue = typeof current[finalKey] === 'number' ? current[finalKey] : 0;
          current[finalKey] = currentValue + (operation.value as number);
          break;
        }
          
        case 'push':
          if (!Array.isArray(current[finalKey])) {
            current[finalKey] = [];
          }
          (current[finalKey] as unknown[]).push(operation.value);
          break;
          
        case 'pull':
          if (Array.isArray(current[finalKey])) {
            current[finalKey] = (current[finalKey] as unknown[]).filter((item: unknown) => 
              JSON.stringify(item) !== JSON.stringify(operation.value)
            );
          }
          break;
      }
    }

    // ============================================================================
    // SOCKET EVENT HANDLERS
    // ============================================================================

    /**
     * Handle incoming state updates from server
     */
    function handleGameStateUpdated(broadcast: StateUpdateBroadcast): void {
      console.log('Received game state update broadcast', { 
        newVersion: broadcast.newVersion,
        operationCount: broadcast.operations.length,
        source: broadcast.source 
      });

      // Check if this is the expected next version
      const expectedVersion = incrementVersion(gameStateVersion.value);
      if (broadcast.newVersion !== expectedVersion) {
        console.warn('Version mismatch detected, requesting full state refresh', {
          expected: expectedVersion,
          received: broadcast.newVersion,
          current: gameStateVersion.value
        });
        
        requestFullState();
        return;
      }

      // Apply operations directly
      applyStateOperations(broadcast.operations);
      gameStateVersion.value = broadcast.newVersion;
      gameStateHash.value = broadcast.expectedHash;

      // Verify state integrity
      if (!verifyStateIntegrity()) {
        console.warn('State integrity check failed, requesting full refresh');
        requestFullState();
        return;
      }


      console.log('State update applied successfully', { 
        newVersion: broadcast.newVersion 
      });
    }

    /**
     * Handle state update errors
     */
    function handleGameStateError(errorData: { sessionId: string; error: { code: string; message: string; currentVersion?: string; currentHash?: string } }): void {
      console.error('Game state error received', errorData);
      error.value = errorData.error.message || 'Game state error occurred';
      
      // Handle specific error types
      if (errorData.error.code === 'VERSION_CONFLICT') {
        console.log('Version conflict detected, refreshing state');
        requestFullState();
      }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Clear all state (on disconnect/leave)
     */
    function clearState(): void {
      gameState.value = null;
      gameStateVersion.value = null;
      gameStateHash.value = null;
      sessionId.value = null;
      isGM.value = false;
      selectedCharacter.value = null;
      error.value = null;
      isUpdating.value = false;
      updateQueue.value = [];
      
      console.log('Game state cleared');
    }

    /**
     * Generate unique update ID
     */
    function generateUpdateId(): string {
      return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }

    /**
     * Increment version string (simple integer increment)
     */
    function incrementVersion(currentVersion: string | null): string {
      const current = parseInt(currentVersion || '0') || 0;
      return (current + 1).toString();
    }

    /**
     * Verify state integrity using hash
     */
    function verifyStateIntegrity(): boolean {
      // TODO: Implement hash verification when needed
      // For now, always return true to avoid blocking updates
      return true;
    }

    /**
     * Handle update errors with appropriate user feedback
     */
    function handleUpdateError(errorData: { code?: string; message?: string } | undefined): void {
      if (errorData?.code === 'VERSION_CONFLICT') {
        error.value = 'Another user made changes. Refreshing...';
        requestFullState();
      } else {
        error.value = errorData?.message || 'Failed to update game state';
      }
    }


    // ============================================================================
    // SOCKET EVENT SETUP
    // ============================================================================

    /**
     * Setup socket event handlers
     */
    function setupSocketHandlers(): void {
      const socket = socketStore.socket;
      if (!socket) return;

      // Clean up existing listeners
      socket.off('gameState:updated');
      socket.off('gameState:error');
      socket.off('gameSession:joined');
      socket.off('gameSession:left');

      // Setup new listeners
      socket.on('gameState:updated', handleGameStateUpdated);
      socket.on('gameState:error', handleGameStateError);
      
      socket.on('gameSession:joined', (data: { sessionId: string; userId: string; userName: string; isGM: boolean; timestamp: number }) => {
        console.log('User joined session', data);
      });
      
      socket.on('gameSession:left', (data: { sessionId: string; userId: string; userName: string; timestamp: number }) => {
        console.log('User left session', data);
      });

      console.log('Game state socket handlers setup complete');
    }

    // ============================================================================
    // WATCHERS AND INITIALIZATION
    // ============================================================================

    // Watch for socket changes and setup handlers
    watch(
      () => socketStore.socket,
      (newSocket) => {
        if (newSocket) {
          setupSocketHandlers();
        }
      },
      { immediate: true }
    );

    // Watch for socket connection changes
    watch(
      () => socketStore.connected,
      (isConnected) => {
        if (isConnected) {
          setupSocketHandlers();
          
          // If we have a session from persistence, verify it's still valid
          if (sessionId.value) {
            console.log('Reconnected to socket, verifying session state');
            requestFullState().catch(() => {
              console.warn('Failed to verify session state on reconnect, clearing');
              clearState();
            });
          }
        } else {
          console.log('Socket disconnected');
        }
      }
    );


    // ============================================================================
    // PUBLIC API
    // ============================================================================

    return {
      // State (read-only)
      gameState: readonly(gameState),
      gameStateVersion: readonly(gameStateVersion),
      gameStateHash: readonly(gameStateHash),
      sessionId: readonly(sessionId),
      isGM: readonly(isGM),
      selectedCharacter,
      loading: readonly(loading),
      error: readonly(error),
      isUpdating: readonly(isUpdating),

      // Computed data access
      characters,
      actors,
      items,
      currentEncounter,
      pluginData,
      hasGameState,
      isInSession,
      canUpdate,

      // Item relationship helpers (plugin-agnostic)
      getCharacterItems,
      getCharacterItemCount,

      // Session management
      joinGameSession,
      leaveGameSession,
      requestFullState,

      // State updates (GM only)
      updateGameState,

      // Utilities
      clearState
    };
  },
  {
    persist: {
      key: 'game-state-store',
      storage: localStorage,
      pick: ['gameState', 'gameStateVersion', 'gameStateHash', 'sessionId', 'isGM']
    }
  }
);