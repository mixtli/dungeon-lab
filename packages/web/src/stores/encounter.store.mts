import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { 
  IEncounter, 
  IToken, 
  TokenSize,
  TokenMoveCallback,
  EncounterCallback,
  IActor,
  CreateTokenData
} from '@dungeon-lab/shared/types/index.mjs';
import { EncountersClient, ActorsClient } from '@dungeon-lab/client/index.mjs';
import { useSocketStore } from './socket.store.mjs';
import { useAuthStore } from './auth.store.mjs';
import { useGameSessionStore } from './game-session.store.mjs';

const encounterClient = new EncountersClient();
const actorClient = new ActorsClient();

export interface IEncounterWithActors extends Omit<IEncounter, 'participants'> {
  participants: IActor[];
}

export const useEncounterStore = defineStore('encounter', () => {
  const socketStore = useSocketStore();
  const authStore = useAuthStore();
  const gameSessionStore = useGameSessionStore();
  const currentEncounter = ref<IEncounterWithActors | null>(null);
  const encounterTokens = ref<IToken[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed property for getting a token by ID
  const getTokenById = computed(() => (tokenId: string) => {
    return encounterTokens.value.find(token => token.id === tokenId);
  });

  // Token Management Methods
  async function createToken(tokenData: {
    name: string;
    imageUrl: string;
    size: TokenSize;
    position: { x: number; y: number; elevation: number };
    actorId?: string;
    isVisible: boolean;
    isPlayerControlled: boolean;
    data?: Record<string, unknown>;
  }): Promise<void> {
    if (!currentEncounter.value) throw new Error('No active encounter');
    if (!authStore.user?.id) throw new Error('User not authenticated');
    
    loading.value = true;
    error.value = null;

    try {
      // Emit socket event for token creation
      if (!gameSessionStore.currentSession?.id) {
        throw new Error('No active game session');
      }
      
      socketStore.emit('token:create', {
        sessionId: gameSessionStore.currentSession.id,
        encounterId: currentEncounter.value.id,
        userId: authStore.user.id,
        tokenData: {
          name: tokenData.name,
          imageUrl: tokenData.imageUrl,
          size: tokenData.size,
          position: tokenData.position,
          actorId: tokenData.actorId,
          isVisible: tokenData.isVisible,
          isPlayerControlled: tokenData.isPlayerControlled,
          data: tokenData.data || {}
        }
      });

      // Note: The actual token will be added to the state when we receive the 'token:created' event
    } catch (err) {
      console.error('Failed to create token:', err);
      error.value = err instanceof Error ? err.message : 'Failed to create token';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createTokenFromActor(tokenData: {
    actorId: string;
    name: string;
    isVisible: boolean;
    position?: { x: number; y: number; elevation: number };
  }): Promise<void> {
    if (!currentEncounter.value) throw new Error('No active encounter');
    if (!authStore.user?.id) throw new Error('User not authenticated');
    
    loading.value = true;
    error.value = null;

    try {
      // Fetch the actor to get its stats and details
      const actor = await actorClient.getActor(tokenData.actorId);
      if (!actor) throw new Error('Actor not found');

      // Get the image URL from either token or avatar
      const imageUrl = actor.token?.url || actor.avatar?.url;
      if (!imageUrl) throw new Error('No token or avatar image available for this actor');

      // Get the actor's size (default to medium if not specified)
      const pluginData = actor.pluginData as Record<string, unknown>;
      const size = (pluginData?.size as string)?.toLowerCase() || 'medium';
      if (!['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'].includes(size)) {
        throw new Error('Invalid token size');
      }

      // Default position if not provided
      const position = tokenData.position || { x: 0, y: 0, elevation: 0 };

      // Determine if the token is player controlled based on actor type
      const isPlayerControlled = actor.pluginDocumentType === 'character';

      // Create the token data object that matches CreateTokenData type
      const createData = {
        name: tokenData.name,
        imageUrl,
        size: size as TokenSize,
        encounterId: currentEncounter.value.id,
        position,
        actorId: tokenData.actorId,
        isVisible: tokenData.isVisible,
        isPlayerControlled,
        data: actor.pluginData || {}, // Copy the entire actor plugin data field
        conditions: []
      } as const;

      // Emit socket event for token creation
      if (!gameSessionStore.currentSession?.id) {
        throw new Error('No active game session');
      }
      
      socketStore.emit('token:create', {
        sessionId: gameSessionStore.currentSession.id,
        encounterId: currentEncounter.value.id,
        userId: authStore.user.id,
        tokenData: createData
      });

      // Note: The actual token will be added to the state when we receive the 'token:created' event
    } catch (err) {
      console.error('Failed to create token from actor:', err);
      error.value = err instanceof Error ? err.message : 'Failed to create token from actor';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Socket event handlers
  function setupSocketHandlers() {
    const socket = socketStore.socket;
    if (!socket) {
      console.log('[Encounter Store] No socket available, skipping handler setup');
      return;
    }

    console.log('[Encounter Store] Setting up socket handlers. Socket connected:', socket.connected);
    console.log('[Encounter Store] Current encounter:', currentEncounter.value?.id);
    console.log('[Encounter Store] Current tokens:', encounterTokens.value);

    // Clean up any existing listeners to prevent duplicates
    socket.off('token:created');
    socket.off('token:moved');
    socket.off('token:updated');
    socket.off('token:deleted');
    socket.off('encounter:started');

    socket.on('token:created', (data) => {
      console.log('[Encounter Store] Token created event received:', data);
      console.log('[Encounter Store] Current encounter:', currentEncounter.value?.id);
      console.log('[Encounter Store] Encounter tokens before:', encounterTokens.value);
      
      if (data.encounterId === currentEncounter.value?.id) {
        console.log('[Encounter Store] Adding token to encounter:', data.token);
        encounterTokens.value.push(data.token);
        console.log('[Encounter Store] Encounter tokens after:', encounterTokens.value);
      } else {
        console.log('[Encounter Store] Token not added - encounter ID mismatch');
      }
    });

    socket.on('token:moved', (data) => {
      console.log('Token moved:', data);
      if (data.encounterId === currentEncounter.value?.id) {
        const token = encounterTokens.value.find(t => t.id === data.tokenId);
        if (token) {
          token.position = data.position;
        }
      }
    });

    socket.on('token:updated', (data) => {
      console.log('Token updated:', data);
      if (data.encounterId === currentEncounter.value?.id) {
        const index = encounterTokens.value.findIndex(t => t.id === data.tokenId);
        if (index !== -1) {
          encounterTokens.value[index] = data.token;
        }
      }
    });

    socket.on('token:deleted', (data) => {
      console.log('Token deleted:', data);
      if (data.encounterId === currentEncounter.value?.id) {
        encounterTokens.value = encounterTokens.value.filter(t => t.id !== data.tokenId);
      }
    });

    socket.on('encounter:started', (data) => {
      
      // Set this encounter as the current encounter
      if (data.encounter) {
        // The encounter from the socket has participants as string[], 
        // but we need IActor[], so we'll fetch them separately
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { participants, ...encounterWithoutParticipants } = data.encounter;
        currentEncounter.value = {
          ...encounterWithoutParticipants,
          status: data.encounter.status || 'draft', // Provide default status
          participants: [] as IActor[] // We'll populate this later via fetchEncounter if needed
        } as IEncounterWithActors;
        
        // Reset tokens for the new encounter - tokens are now fetched via data.encounter.tokens
        const rawSocketTokens = (data.encounter as IEncounter & { tokens?: IToken[] }).tokens || [];
        
        // Process socket tokens the same way as fetchEncounter does
        const processedSocketTokens = rawSocketTokens
          .map((token: IToken) => {
            const hasUnderscoreId = typeof (token as unknown as { _id?: unknown })._id === 'string';
            const id = token.id || (hasUnderscoreId ? (token as unknown as { _id: string })._id : undefined);
            return id ? { ...token, id } : undefined;
          })
          .filter((token: IToken | undefined): token is IToken => !!token && !!token.id);
        
        encounterTokens.value = processedSocketTokens;
      }
    });

    console.log('[Encounter Store] Socket handlers setup complete');
  }

  // Watch for socket changes
  watch(
    () => socketStore.socket,
    (newSocket, oldSocket) => {
      console.log('[Encounter Store] Socket changed:', {
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
      console.log('[Encounter Store] Socket connection status changed:', isConnected);
      if (isConnected) {
        setupSocketHandlers();
      }
    }
  );

  async function updateToken(tokenId: string, updates: CreateTokenData) {
    if (!currentEncounter.value) throw new Error('No active encounter');
    if (!authStore.user?.id) throw new Error('User not authenticated');
    
    loading.value = true;
    error.value = null;

    try {
      // Update token through API
      const updatedToken = await encounterClient.updateToken(currentEncounter.value.id, tokenId, {
        ...updates,
        updatedBy: authStore.user.id
      });
      
      // Update local state
      const index = encounterTokens.value.findIndex(t => t.id === tokenId);
      if (index !== -1) {
        encounterTokens.value[index] = updatedToken;
      }

      // Emit socket event
      if (!gameSessionStore.currentSession?.id) {
        throw new Error('No active game session');
      }
      
      socketStore.emit('token:update', {
        sessionId: gameSessionStore.currentSession.id,
        encounterId: currentEncounter.value.id,
        tokenId,
        userId: authStore.user.id,
        updates: {
          name: updates.name,
          imageUrl: updates.imageUrl,
          size: updates.size,
          isVisible: updates.isVisible,
          data: updates.data
        }
      }, (response: EncounterCallback) => {
        if (!response.success) {
          console.error('Socket token update failed:', response.error);
        }
      });

      return updatedToken;
    } catch (err) {
      console.error('Failed to update token:', err);
      error.value = err instanceof Error ? err.message : 'Failed to update token';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteToken(tokenId: string) {
    if (!currentEncounter.value) throw new Error('No active encounter');
    if (!authStore.user?.id) throw new Error('User not authenticated');
    
    loading.value = true;
    error.value = null;

    try {
      // Delete through API
      await encounterClient.deleteToken(currentEncounter.value.id, tokenId);
      
      // Update local state
      encounterTokens.value = encounterTokens.value.filter(t => t.id !== tokenId);
      
      // Emit socket event
      if (!gameSessionStore.currentSession?.id) {
        throw new Error('No active game session');
      }
      
      socketStore.emit('token:delete', {
        sessionId: gameSessionStore.currentSession.id,
        encounterId: currentEncounter.value.id,
        tokenId,
        userId: authStore.user.id
      }, (response: EncounterCallback) => {
        if (!response.success) {
          console.error('Socket token deletion failed:', response.error);
        }
      });
    } catch (err) {
      console.error('Failed to delete token:', err);
      error.value = err instanceof Error ? err.message : 'Failed to delete token';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function moveToken(tokenId: string, position: { x: number; y: number; elevation: number }) {
    if (!currentEncounter.value) throw new Error('No active encounter');
    if (!authStore.user?.id) throw new Error('User not authenticated');
    
    try {
      // Find the token and store original position for potential revert
      const token = encounterTokens.value.find(t => t.id === tokenId);
      if (!token) {
        throw new Error('Token not found');
      }
      
      const originalPosition = { ...token.position }; // Store original position
      
      // Update local state immediately for responsiveness
      token.position = position;

      // Emit socket event (we'll handle the actual movement through sockets)
      if (!gameSessionStore.currentSession?.id) {
        throw new Error('No active game session');
      }
      
      socketStore.emit('token:move', {
        sessionId: gameSessionStore.currentSession.id,
        encounterId: currentEncounter.value.id,
        tokenId,
        userId: authStore.user.id,
        position
      }, (response: TokenMoveCallback) => {
        if (!response.success) {
          console.error('Socket token movement failed:', response.error);
          // Revert to original position on failure
          token.position = originalPosition;
        }
      });
    } catch (err) {
      console.error('Failed to move token:', err);
      error.value = err instanceof Error ? err.message : 'Failed to move token';
      throw err;
    }
  }

  // Modified fetchEncounter to also fetch tokens
  async function fetchEncounter(encounterId: string) {
    loading.value = true;
    error.value = null;

    try {
      const encounter = await encounterClient.getEncounter(encounterId);
      const tokens = await encounterClient.getTokens(encounterId);

      // Initialize with empty participants array in case participants don't exist
      let participants: IActor[] = [];

      if (encounter && Array.isArray(encounter.participants) && encounter.participants.length > 0) {
        const participantPromises = encounter.participants.map(async (participantId: string) => {
          if (!participantId) return null;
          try {
            const actor = await actorClient.getActor(participantId);
            return actor;
          } catch (error) {
            console.error(`Failed to fetch actor ${participantId}:`, error);
            return null;
          }
        });

        const participantResults = await Promise.all(participantPromises);
        participants = participantResults.filter((p): p is IActor => p !== null);
      }

      currentEncounter.value = {
        ...encounter,
        participants
      };
      
      // Set tokens
      const processedTokens = tokens
        .map(token => {
          const hasUnderscoreId = typeof (token as unknown as { _id?: unknown })._id === 'string';
          const id = token.id || (hasUnderscoreId ? (token as unknown as { _id: string })._id : undefined);
          return id ? { ...token, id } : undefined;
        })
        .filter((token): token is typeof tokens[number] & { id: string } => !!token);
      
      encounterTokens.value = processedTokens;
    } catch (err) {
      console.error('Failed to fetch encounter:', err);
      error.value = err instanceof Error ? err.message : 'Failed to fetch encounter';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateEncounterStatus(
    encounterId: string,
    status: 'draft' | 'ready' | 'in_progress' | 'completed'
  ) {
    loading.value = true;
    error.value = null;

    try {
      const updatedEncounter = await encounterClient.updateEncounterStatus(encounterId, status);
      if (currentEncounter.value && currentEncounter.value.id === encounterId) {
        currentEncounter.value = { ...currentEncounter.value, status: updatedEncounter.status };
      }
    } catch (err) {
      console.error('Failed to update encounter status:', err);
      error.value = err instanceof Error ? err.message : 'Failed to update encounter status';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createEncounter(data: Omit<IEncounter, 'id'>) {
    loading.value = true;
    error.value = null;

    try {
      const encounter = await encounterClient.createEncounter(data);
      return encounter.id;
    } catch (err: unknown) {
      console.error('Failed to create encounter:', err);
      error.value = err instanceof Error ? err.message : 'Failed to create encounter';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getEncounter(encounterId: string): Promise<IEncounter> {
    return encounterClient.getEncounter(encounterId);
  }

  async function updateEncounter(
    encounterId: string,
    data: Partial<IEncounter>
  ): Promise<IEncounter> {
    return encounterClient.updateEncounter(encounterId, data);
  }

  async function deleteEncounter(encounterId: string): Promise<void> {
    await encounterClient.deleteEncounter(encounterId);
  }

  async function addParticipant(encounterId: string, actorId: string) {
    if (!currentEncounter.value) return;

    // Ensure we have a valid participants array
    const currentParticipants = currentEncounter.value.participants || [];
    const participants = [...currentParticipants.map((p: IActor | null) => p?.id || ''), actorId];

    await updateEncounter(encounterId, { participants });
    await fetchEncounter(encounterId);
  }

  return {
    currentEncounter,
    encounterTokens,
    loading,
    error,
    getTokenById,
    createToken,
    updateToken,
    deleteToken,
    moveToken,
    createEncounter,
    getEncounter,
    updateEncounter,
    deleteEncounter,
    addParticipant,
    fetchEncounter,
    updateEncounterStatus,
    createTokenFromActor
  };
});
