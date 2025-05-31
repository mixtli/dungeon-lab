import { ref, computed, watch } from 'vue';
import { useSocketStore } from '../stores/socket.store.mjs';
import type { IToken } from '@dungeon-lab/shared/types/encounters.mjs';

export function useEncounterSocket(encounterId?: string) {
  const socketStore = useSocketStore();
  
  // State
  const currentEncounterId = ref<string | null>(encounterId || null);
  const isJoined = ref(false);
  const error = ref<string | null>(null);
  
  // Computed
  const isConnected = computed(() => socketStore.connected);
  const canJoin = computed(() => isConnected.value && currentEncounterId.value && !isJoined.value);
  
  // Join encounter room
  const joinEncounter = async (id: string): Promise<boolean> => {
    if (!socketStore.socket || !socketStore.connected) {
      error.value = 'Socket not connected';
      return false;
    }
    
    try {
      currentEncounterId.value = id;
      
      // For now, we'll use a simple room join pattern
      // TODO: Implement proper encounter socket events when server supports them
      console.log(`Joining encounter room: encounter-${id}`);
      
      // Simulate joining for now
      isJoined.value = true;
      error.value = null;
      
      return true;
    } catch (err) {
      console.error('Error joining encounter:', err);
      error.value = 'Failed to join encounter';
      return false;
    }
  };
  
  // Leave encounter room
  const leaveEncounter = () => {
    if (!socketStore.socket || !currentEncounterId.value) return;
    
    try {
      console.log(`Leaving encounter room: encounter-${currentEncounterId.value}`);
      
      // Simulate leaving for now
      isJoined.value = false;
      currentEncounterId.value = null;
      error.value = null;
    } catch (err) {
      console.error('Error leaving encounter:', err);
    }
  };
  
  // Token movement
  const moveToken = (tokenId: string, position: { x: number; y: number; elevation?: number }) => {
    if (!socketStore.socket || !currentEncounterId.value) return;
    
    // TODO: Implement proper token movement when server supports it
    console.log('Moving token:', { tokenId, position });
    
    // For now, just log the movement
    // In the future, this will emit a socket event
  };
  
  // Create token
  const createToken = (tokenData: Partial<IToken>) => {
    if (!socketStore.socket || !currentEncounterId.value) return;
    
    // TODO: Implement proper token creation when server supports it
    console.log('Creating token:', tokenData);
  };
  
  // Update token
  const updateToken = (tokenId: string, updates: Partial<IToken>) => {
    if (!socketStore.socket || !currentEncounterId.value) return;
    
    // TODO: Implement proper token updates when server supports it
    console.log('Updating token:', { tokenId, updates });
  };
  
  // Delete token
  const deleteToken = (tokenId: string) => {
    if (!socketStore.socket || !currentEncounterId.value) return;
    
    // TODO: Implement proper token deletion when server supports it
    console.log('Deleting token:', tokenId);
  };
  
  // Setup event listeners
  const setupEventListeners = () => {
    if (!socketStore.socket) return;
    
    // TODO: Add proper socket event listeners when server implements encounter events
    console.log('Setting up encounter socket event listeners');
    
    // For now, we'll add placeholder listeners
    // These will be implemented when the server supports encounter socket events
  };
  
  // Cleanup event listeners
  const cleanupEventListeners = () => {
    if (!socketStore.socket) return;
    
    console.log('Cleaning up encounter socket event listeners');
    
    // TODO: Remove socket event listeners when implemented
  };
  
  // Watch for socket connection changes
  watch(
    () => socketStore.connected,
    (connected) => {
      if (connected) {
        setupEventListeners();
      } else {
        cleanupEventListeners();
        isJoined.value = false;
      }
    },
    { immediate: true }
  );
  
  // Watch for encounter ID changes
  watch(
    () => currentEncounterId.value,
    (newId, oldId) => {
      if (oldId && isJoined.value) {
        leaveEncounter();
      }
      if (newId && socketStore.connected) {
        joinEncounter(newId);
      }
    }
  );
  
  return {
    // State
    currentEncounterId,
    isJoined,
    isConnected,
    canJoin,
    error,
    
    // Methods
    joinEncounter,
    leaveEncounter,
    moveToken,
    createToken,
    updateToken,
    deleteToken,
    
    // Lifecycle
    setupEventListeners,
    cleanupEventListeners
  };
} 