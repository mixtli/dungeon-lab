import { defineStore } from 'pinia';
import { ref, computed, watch, readonly, toRaw } from 'vue';
import { z } from 'zod';
import type { 
  StateUpdate, 
  StateUpdateResponse,
  StateUpdateBroadcast,
  JsonPatchOperation,
  ICharacter,
  IActor,
  IItem,
  IEncounter,
  BaseDocument,
  ServerGameStateWithVirtuals
} from '@dungeon-lab/shared/types/index.mjs';
import {
  gameStateRequestFullCallbackSchema
} from '@dungeon-lab/shared/schemas/socket/game-state.mjs';
import {
  GameStateOperations,
  generateStateHash
} from '@dungeon-lab/shared/utils/index.mjs';
import { useSocketStore } from './socket.store.mjs';
import { useGameSessionStore } from './game-session.store.mjs';
import { useAuthStore } from './auth.store.mjs';
import { useNotificationStore } from './notification.store.mjs';
import { transformAssetUrl } from '../utils/asset-utils.mjs';
import { pluginTokenService } from '../services/plugin-token.service.mjs';

/**
 * Unified Game State Store
 * 
 * This store manages the complete game state for a session using the new
 * unified architecture. It replaces the separate actor, item, encounter,
 * and character-sheet stores.
 * 
 * Key Principles:
 * - GM Authority: GM client sends updates, players receive broadcasts (authority comes from Game Session Store)
 * - Sequential Updates: GM updates are queued and processed one at a time
 * - Version Control: Optimistic concurrency with version tracking
 * - State Integrity: Hash verification prevents corruption
 * - Single Source of Truth: All game entities in one reactive object
 * - Session Aware: Operates within sessions managed by Game Session Store
 */
export const useGameStateStore = defineStore(
  'gameState',
  () => {
    const socketStore = useSocketStore();
    const gameSessionStore = useGameSessionStore();
    const authStore = useAuthStore();
    const notificationStore = useNotificationStore();

    // ============================================================================
    // REACTIVE STATE
    // ============================================================================

    // Server-controlled state (wrapped for integrity)
    const gameState = ref<ServerGameStateWithVirtuals | null>(null);
    const gameStateId = ref<string | null>(null); // GameState document ID (separate from content)
    const gameStateVersion = ref<string | null>(null);
    const gameStateHash = ref<string | null>(null);
    
    // UI state
    const selectedCharacter = ref<ICharacter | null>(null);
    const loading = ref<boolean>(false);
    const error = ref<string | null>(null);

    // Update management (GM only)
    const isUpdating = ref<boolean>(false);
    const updateQueue = ref<StateUpdate[]>([]);
    
    // Initialization tracking to prevent race condition clearing
    const isInitialized = ref<boolean>(false);

    // ============================================================================
    // COMPUTED PROPERTIES - DATA ACCESS
    // ============================================================================

    // Convenient access to game entities (filtered from unified documents)
    const characters = computed<ICharacter[]>(() => {
      if (!gameState.value?.documents) return [];
      return Object.values(gameState.value.documents).filter(doc => doc.documentType === 'character') as ICharacter[];
    });
    
    const actors = computed<IActor[]>(() => {
      if (!gameState.value?.documents) return [];
      return Object.values(gameState.value.documents).filter(doc => doc.documentType === 'actor') as IActor[];
    });
    
    const items = computed<IItem[]>(() => {
      if (!gameState.value?.documents) return [];
      return Object.values(gameState.value.documents).filter(doc => doc.documentType === 'item') as IItem[];
    });
    const currentEncounter = computed<IEncounter | null>(() => gameState.value?.currentEncounter || null);

    // ============================================================================
    // ITEM RELATIONSHIP HELPERS (Plugin-Agnostic)
    // ============================================================================

    /**
     * Get all items carried by a specific character/actor
     * @param carrierId - Character or Actor ID
     * @returns Array of items where item.carrierId matches the provided ID
     */
    const getCharacterItems = computed(() => (carrierId: string): IItem[] => {
      if (!gameState.value?.documents) return [];
      return Object.values(gameState.value.documents)
        .filter(doc => doc.documentType === 'item' && (doc as IItem).carrierId === carrierId) as IItem[];
    });

    /**
     * Get count of items carried by a character/actor
     * @param carrierId - Character or Actor ID  
     * @returns Number of items carried
     */
    const getCharacterItemCount = computed(() => (carrierId: string): number => {
      return getCharacterItems.value(carrierId).length;
    });

    // ============================================================================
    // UNIFIED DOCUMENT HELPERS
    // ============================================================================

    /**
     * Get a document by ID
     * @param documentId - Document ID
     * @returns Document or null if not found
     */
    const getDocument = computed(() => (documentId: string): BaseDocument | null => {
      if (!gameState.value?.documents) return null;
      return gameState.value.documents[documentId] || null;
    });

    /**
     * Get documents by type
     * @param documentType - Type of documents to get
     * @returns Array of documents of the specified type
     */
    const getDocumentsByType = computed(() => (documentType: string): BaseDocument[] => {
      if (!gameState.value?.documents) return [];
      return Object.values(gameState.value.documents).filter(doc => doc.documentType === documentType);
    });

    /**
     * Get documents by plugin type
     * @param pluginDocumentType - Plugin-specific document type
     * @returns Array of documents of the specified plugin type
     */
    const getDocumentsByPluginType = computed(() => (pluginDocumentType: string): BaseDocument[] => {
      if (!gameState.value?.documents) return [];
      return Object.values(gameState.value.documents).filter(doc => doc.pluginDocumentType === pluginDocumentType);
    });

    // Plugin data access
    const pluginData = computed(() => gameState.value?.pluginData || {});

    // Session info (from Game Session Store)
    const hasGameState = computed(() => gameState.value !== null);
    const isInSession = computed(() => gameSessionStore.currentSession !== null);
    const canUpdate = computed(() => gameSessionStore.isGameMaster && hasGameState.value);

    // ============================================================================
    // CORE METHODS - GAME STATE MANAGEMENT
    // ============================================================================

    /**
     * Request full game state from server
     */
    async function requestFullState(): Promise<void> {
      try {
        const currentSessionId = gameSessionStore.currentSession?.id;
        const socketConnected = socketStore.connected;
        const socketExists = !!socketStore.socket;
        
        console.log('[GameState] requestFullState called', { 
          currentSessionId, 
          socketConnected, 
          socketExists 
        });
        
        if (!currentSessionId || !socketStore.socket) {
          const error = `Missing requirements: sessionId=${currentSessionId}, socket=${socketExists}, connected=${socketConnected}`;
          console.error('[GameState] Cannot request full state:', error);
          throw new Error('No active session or socket connection');
        }

        loading.value = true;
        error.value = null;

        console.log('[GameState] Emitting gameState:requestFull for session:', currentSessionId);

        return new Promise((resolve, reject) => {
          socketStore.emit('gameState:requestFull', currentSessionId, (response: z.infer<typeof gameStateRequestFullCallbackSchema>) => {
            console.log('[GameState] gameState:requestFull response received:', { 
              success: response.success, 
              hasData: !!response.data,
              error: response.error 
            });
            
            if (response.success && response.data) {
              // Update state with server data (cast from unknown to typed)
              gameState.value = response.data.gameState as ServerGameStateWithVirtuals;
              gameStateId.value = response.data.gameStateId; // Extract gameState document ID
              gameStateVersion.value = response.data.gameStateVersion;
              gameStateHash.value = response.data.gameStateHash;

              console.log('[GameState] Game state refreshed from server', { 
                version: gameStateVersion.value,
                hash: gameStateHash.value,
                hasDocuments: Object.keys(gameState.value?.documents || {}).length,
                hasCurrentEncounter: !!gameState.value?.currentEncounter,
                encounterTokenCount: gameState.value?.currentEncounter?.tokens?.length || 0,
                encounterTokenIds: gameState.value?.currentEncounter?.tokens?.map(t => t.id) || []
              });

              resolve();
            } else {
              const errorMsg = response.error || 'Failed to get game state';
              console.error('[GameState] Game state request failed:', errorMsg);
              error.value = errorMsg;
              reject(new Error(errorMsg));
            }
          });
        });

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to refresh state';
        error.value = errorMsg;
        console.error('[GameState] Error requesting full state:', err);
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
    async function updateGameState(operations: JsonPatchOperation[]): Promise<StateUpdateResponse> {
      if (!canUpdate.value) {
        throw new Error('Not authorized to update game state');
      }

      // Get stack trace to see who called this
      const stack = new Error().stack;
      const caller = stack?.split('\n')[2]?.trim() || 'unknown';
      
      console.log('[GameStateStore] updateGameState called:', {
        operationCount: operations.length,
        caller: caller.substring(0, 100),
        operations: operations,
        gameStateType: gameState.value && typeof gameState.value,
        hasProxy: gameState.value && 'toRaw' in (gameState.value.constructor.prototype || {})
      });

      if (!socketStore.socket) {
        throw new Error('Socket not connected');
      }

      // Queue update if another update is in progress
      if (isUpdating.value) {
        const currentSessionId = gameSessionStore.currentSession?.id;
        
        if (!currentSessionId) {
          throw new Error('No active session');
        }

        const queuedUpdate: StateUpdate = {
          id: generateUpdateId(),
          gameStateId: '', // GameState document ID not available to client
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
    async function processUpdate(operations: JsonPatchOperation[]): Promise<StateUpdateResponse> {
      //isUpdating.value = true;
      
      try {
        const currentSessionId = gameSessionStore.currentSession?.id;
        
        if (!currentSessionId) {
          throw new Error('No active session');
        }

        const update: StateUpdate = {
          id: generateUpdateId(),
          gameStateId: gameStateId.value!,
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
              console.log('State update sent successfully', { 
                updateId: update.id,
                willReceiveBroadcast: true 
              });
              // NOTE: State will be updated via gameState:updated broadcast
              // This ensures GM follows same pattern as all other clients
              
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
     * Apply JSON Patch operations to local game state
     * Uses in-place operations to preserve Vue reactivity for unchanged portions
     * Only the specific paths that change will trigger reactivity, not the entire state tree
     */
    function applyStateOperations(operations: JsonPatchOperation[]): void {
      if (!gameState.value) return;

      // Get stack trace to see who called this
      const stack = new Error().stack;
      const caller = stack?.split('\n')[2]?.trim() || 'unknown';
      
      console.log('[GameStateStore] applyStateOperations called:', {
        operationCount: operations.length,
        caller: caller.substring(0, 100),
        operations: operations.slice(0, 2), // Log first 2 operations only
        gameStateProxy: gameState.value && 'toRaw' in (gameState.value.constructor.prototype || {})
      });

      try {
        // Apply operations in-place to preserve Vue reactivity tracking
        // This ensures only changed paths trigger re-renders, not the entire state
        GameStateOperations.applyOperationsInPlace(gameState.value, operations);
        console.log('[GameStateStore] applyOperationsInPlace completed successfully');
      } catch (error) {
        console.error('[GameStateStore] applyOperationsInPlace failed:', error);
        throw error;
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

      // Verify state integrity with expected hash
      if (!verifyStateIntegrity(broadcast.expectedHash)) {
        console.warn('Client-side hash verification failed after applying operations, requesting full state refresh');
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

    /**
     * Handle game state reinitialization from another client
     */
    function handleGameStateReinitialized(reinitializeData: {
      gameStateId: string;
      gameState?: unknown;
      gameStateVersion: string;
      gameStateHash: string;
      timestamp: number;
      reinitializedBy: string;
    }): void {
      console.log('Game state reinitialized by another user:', {
        reinitializedBy: reinitializeData.reinitializedBy,
        newVersion: reinitializeData.gameStateVersion,
        timestamp: reinitializeData.timestamp
      });

      // Validate and cast the gameState
      if (!reinitializeData.gameState) {
        console.error('Game state reinitialization received without game state data');
        return;
      }

      // Replace local state with the fresh state (cast from unknown)
      gameState.value = reinitializeData.gameState as ServerGameStateWithVirtuals;
      gameStateId.value = reinitializeData.gameStateId;
      gameStateVersion.value = reinitializeData.gameStateVersion;
      gameStateHash.value = reinitializeData.gameStateHash;

      // Clear any pending errors
      error.value = null;

      // Show user notification
      notificationStore.addNotification({
        type: 'info',
        message: 'Game state was reset by the Game Master. All data has been refreshed.',
        duration: 6000
      });

      console.log('Local game state updated from reinitialization broadcast:', {
        newVersion: reinitializeData.gameStateVersion,
        hasDocuments: Object.keys(gameState.value?.documents || {}).length,
        hasCurrentEncounter: !!gameState.value?.currentEncounter
      });
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Clear game state (called when leaving session or on errors)
     */
    function clearState(): void {
      gameState.value = null;
      gameStateId.value = null;
      gameStateVersion.value = null;
      gameStateHash.value = null;
      selectedCharacter.value = null;
      error.value = null;
      isUpdating.value = false;
      updateQueue.value = [];
      // Note: Don't reset isInitialized here, we want to keep track that initialization completed
      
      console.log('[GameState] Game state cleared');
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
    function verifyStateIntegrity(expectedHash: string): boolean {
      if (!gameState.value) {
        console.error('Cannot verify hash: game state is null');
        return false;
      }

      try {
        // Use toRaw to get plain object (remove Vue reactivity proxy) for hash calculation
        const rawGameState = toRaw(gameState.value) as ServerGameStateWithVirtuals;
        const calculatedHash = generateStateHash(rawGameState);
        const isValid = calculatedHash === expectedHash;
        
        if (!isValid) {
          console.error('Client-side hash mismatch after applying operations', {
            expected: expectedHash.substring(0, 16) + '...',
            calculated: calculatedHash.substring(0, 16) + '...',
            gameStateKeys: Object.keys(gameState.value),
            documentsCount: Object.keys(gameState.value.documents || {}).length,
            documentTypes: Object.values(gameState.value.documents || {}).reduce((types, doc) => {
              types[doc.documentType] = (types[doc.documentType] || 0) + 1;
              return types;
            }, {} as Record<string, number>)
          });
          
          // Show user notification about hash validation failure
          notificationStore.addNotification({
            type: 'warning',
            message: 'Game state synchronization issue detected. Resyncing with server...',
            duration: 5000
          });
        }
        
        return isValid;
      } catch (error) {
        console.error('Error verifying state integrity on client:', error);
        
        // Show user notification about hash verification error
        notificationStore.addNotification({
          type: 'error',
          message: 'Unable to verify game state integrity. Please refresh the page.',
          duration: 8000
        });
        
        return false;
      }
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
     * Setup socket event handlers for game state operations
     */
    function setupSocketHandlers(): void {
      const socket = socketStore.socket;
      if (!socket) return;

      // Clean up existing listeners
      socket.off('gameState:updated');
      socket.off('gameState:error');
      socket.off('gameState:reinitialized');

      // Setup game state listeners only
      socket.on('gameState:updated', handleGameStateUpdated);
      socket.on('gameState:error', handleGameStateError);
      socket.on('gameState:reinitialized', handleGameStateReinitialized);

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
        } else {
          console.log('Socket disconnected');
        }
      }
    );

    // Initialize game state if session already exists (handles timing issue where session join happens before store initialization)
    const initializeIfSessionExists = async () => {
      // Give a small delay to allow Game Session Store to load from sessionStorage
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const existingSessionId = gameSessionStore.currentSession?.id;
      console.log('[GameState] Store initialized, checking for existing session:', existingSessionId);
      
      if (existingSessionId) {
        console.log('[GameState] Found existing session on store init, requesting game state:', existingSessionId);
        try {
          await requestFullState();
        } catch (error) {
          console.error('[GameState] Failed to load game state for existing session:', error);
        }
      } else {
        console.log('[GameState] No existing session found on store init');
      }
      
      // Mark as initialized after the check completes
      isInitialized.value = true;
      console.log('[GameState] Store initialization complete');
    };

    // Call initialization check immediately
    initializeIfSessionExists();

    // Watch for Game Session Store changes to initialize/clear game state
    watch(
      () => gameSessionStore.currentSession?.id,
      (newSessionId, oldSessionId) => {
        console.log('[GameState] Game session ID changed', { 
          newSessionId, 
          oldSessionId, 
          isInitialized: isInitialized.value 
        });
        
        if (newSessionId && newSessionId !== oldSessionId) {
          // New session - request game state
          console.log('[GameState] Requesting game state for new session:', newSessionId);
          requestFullState().catch((error) => {
            console.error('[GameState] Failed to load game state for session:', error);
          });
        } else if (!newSessionId && oldSessionId && isInitialized.value) {
          // Session ended - but only clear if we're past initialization to avoid race conditions
          console.log('[GameState] Session ended after initialization, clearing game state');
          clearState();
        } else if (!newSessionId && oldSessionId && !isInitialized.value) {
          console.log('[GameState] Session appears ended but during initialization - skipping clear to avoid race condition');
        }
      },
      { immediate: false } // Changed to false since we handle initialization explicitly above
    );


    // ============================================================================
    // TOKEN MANAGEMENT
    // ============================================================================

    /**
     * Create a token from any BaseDocument at a specific position
     * This is the primary method for drag-and-drop token creation
     */
    const createTokenFromDocument = async (
      document: BaseDocument, 
      position: { x: number; y: number; elevation?: number },
      options: {
        name?: string;
        isHidden?: boolean;
        scale?: number;
        isPlayerControlled?: boolean;
      } = {}
    ) => {
      if (!gameState.value?.currentEncounter) {
        throw new Error('No active encounter to create token in');
      }

      // Validate GM permissions
      if (!canUpdate.value) {
        throw new Error('Only the GM can create tokens');
      }

      // Generate unique token ID
      const tokenId = `token_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // Get token image URL from document, with preference for token over avatar
      // Token images are specifically for map/encounter display
      let tokenImage: string | undefined;
      
      // Documents with virtuals include tokenImage, avatar, and image asset objects
      const documentWithAssets = document as {
        tokenImage?: { url: string };
        avatar?: { url: string };
        image?: { url: string };
      };
      
      if (documentWithAssets.tokenImage?.url) {
        tokenImage = transformAssetUrl(documentWithAssets.tokenImage.url);
      } else if (documentWithAssets.avatar?.url) {
        tokenImage = transformAssetUrl(documentWithAssets.avatar.url);
      } else if (documentWithAssets.image?.url) {
        tokenImage = transformAssetUrl(documentWithAssets.image.url);
      }

      if (!tokenImage) {
        throw new Error('Document must have a token image URL (tokenImage.url, avatar.url, or image.url)');
      }

      // Get token grid size from plugin
      const tokenGridSize = await pluginTokenService.getTokenGridSize(document);
      
      // Helper function to create bounds from center position and grid size
      const createBoundsFromGridSize = (centerX: number, centerY: number, gridSize: number, elevation: number = 0) => {
        // Convert grid size multiplier to actual grid cell count
        const gridCells = Math.max(1, Math.round(gridSize));
        
        // Calculate bounds - for odd sizes, center aligns naturally
        // For even sizes, we offset slightly to align with grid
        const halfSize = Math.floor(gridCells / 2);
        const isEven = gridCells % 2 === 0;
        
        // Get the actual grid size from current map data
        const currentMap = gameState.value?.currentEncounter?.currentMap;
        const pixelsPerGrid = currentMap?.uvtt?.resolution?.pixels_per_grid || 50; // fallback to 50
        
        console.log('[GameState] createBoundsFromGridSize:', {
          worldPosition: { centerX, centerY },
          pixelsPerGrid,
          gridSizeMultiplier: gridSize,
          gridCells
        });
        
        const centerGridX = Math.round(centerX / pixelsPerGrid);
        const centerGridY = Math.round(centerY / pixelsPerGrid);
        
        console.log('[GameState] Grid conversion:', {
          centerGridX,
          centerGridY,
          calculation: `${centerX} / ${pixelsPerGrid} = ${centerX / pixelsPerGrid} -> ${centerGridX}`
        });
        
        // For even-sized tokens, adjust center to align with grid intersection
        const adjustedCenterX = isEven ? centerGridX - 0.5 : centerGridX;
        const adjustedCenterY = isEven ? centerGridY - 0.5 : centerGridY;
        
        const bounds = {
          topLeft: {
            x: Math.floor(adjustedCenterX - halfSize),
            y: Math.floor(adjustedCenterY - halfSize)
          },
          bottomRight: {
            x: Math.floor(adjustedCenterX - halfSize) + gridCells - 1,
            y: Math.floor(adjustedCenterY - halfSize) + gridCells - 1
          },
          elevation
        };
        
        console.log('[GameState] Final bounds:', bounds);
        return bounds;
      };

      const tokenData = {
        id: tokenId,
        name: options.name || document.name,
        imageUrl: tokenImage,
        encounterId: gameState.value.currentEncounter.id,
        bounds: createBoundsFromGridSize(
          position.x,
          position.y,
          tokenGridSize,
          position.elevation || 0
        ),
        documentId: document.id,
        documentType: document.documentType,
        notes: '',
        isVisible: !options.isHidden,
        isPlayerControlled: options.isPlayerControlled ?? (document.documentType === 'character'),
        data: document.pluginData || {},
        conditions: [],
        version: 1,
        createdBy: authStore.user?.id || '',
        updatedBy: authStore.user?.id || '',
        ownerId: document.ownerId || authStore.user?.id || ''
      };

      const operations: JsonPatchOperation[] = [{
        op: 'add',
        path: '/currentEncounter/tokens/-',
        value: tokenData
      }];

      // Add document to encounter participants if not already present
      const isAlreadyParticipant = gameState.value.currentEncounter.participants?.includes(document.id);
      if (!isAlreadyParticipant) {
        operations.push({
          op: 'add',
          path: '/currentEncounter/participants/-',
          value: document.id
        });
        console.log(`Adding document to encounter participants: ${document.name}`);
      }

      // If turn order is active, add new participant only if one doesn't already exist for this document
      if (gameState.value.turnManager?.isActive) {
        // Check if participant already exists for this document
        const existingParticipant = gameState.value.turnManager.participants?.some(p => p.actorId === tokenData.documentId);
        
        if (!existingParticipant) {
          const newParticipant = {
            id: `participant_${tokenData.documentId}`,
            name: tokenData.name,
            actorId: tokenData.documentId,
            hasActed: false,
            turnOrder: 0 // Start with 0 initiative
          };
          
          operations.push({
            op: 'add',
            path: '/turnManager/participants/-',
            value: newParticipant
          });
          
          console.log(`Adding document to active turn order: ${tokenData.name}`);
        } else {
          console.log(`Document already exists in turn order, skipping: ${tokenData.name}`);
        }
      }

      const response = await updateGameState(operations);

      if (response.success) {
        console.log(`Created token for document: ${document.name} at position:`, position);
        return tokenId;
      } else {
        throw new Error(response.error?.message || 'Failed to create token');
      }
    };

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    return {
      // State (read-only)
      gameState: readonly(gameState),
      gameStateId: readonly(gameStateId),
      gameStateVersion: readonly(gameStateVersion),
      gameStateHash: readonly(gameStateHash),
      selectedCharacter,
      loading: readonly(loading),
      error: readonly(error),
      isUpdating: readonly(isUpdating),
      isInitialized: readonly(isInitialized),

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

      // Unified document helpers
      getDocument,
      getDocumentsByType,
      getDocumentsByPluginType,

      // Game state management
      requestFullState,

      // State updates (GM only)
      updateGameState,

      // Token management
      createTokenFromDocument,

      // Utilities
      clearState
    };
  },
  {
    persist: {
      key: 'game-state-store',
      storage: localStorage,
      pick: ['gameState', 'gameStateId', 'gameStateVersion', 'gameStateHash', 'selectedCharacter']
    }
  }
);