/**
 * Character State Management Composable
 * 
 * Provides reactive character state management for both:
 * - Standalone editing mode (with auto-save)
 * - Game mode (with WebSocket updates)
 */

import { ref, onUnmounted, type Ref } from 'vue';
import type { IActor, IItem } from '@dungeon-lab/shared/types/index.mjs';
import { DocumentsClient } from '@dungeon-lab/client/index.mjs';
import { useSocketStore } from '../stores/socket.store.mjs';

export interface CharacterStateOptions {
  /** Enable WebSocket integration for real-time server updates (game mode) */
  enableWebSocket?: boolean;
  /** Enable auto-save functionality for user edits (edit mode) */
  enableAutoSave?: boolean;
  /** Auto-save delay in milliseconds */
  autoSaveDelay?: number;
  /** Whether this is readonly mode */
  readonly?: boolean;
}

export interface CharacterStateReturn {
  /** Reactive character data */
  character: Ref<IActor>;
  /** Reactive character items */
  items: Ref<IItem[]>;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: Ref<boolean>;
  /** Whether a save operation is in progress */
  isSaving: Ref<boolean>;
  /** Manually save character changes */
  save: () => Promise<void>;
  /** Reset character to original state (cancel changes) */
  reset: () => void;
  /** Load character items from server */
  loadItems: () => Promise<void>;
  /** Mark character as having unsaved changes */
  markAsChanged: () => void;
}

export function useCharacterState(
  initialCharacter: IActor,
  options: CharacterStateOptions = {}
): CharacterStateReturn {
  const {
    enableWebSocket = false,
    readonly = false
  } = options;

  // Reactive state - use JSON clone to avoid structuredClone issues with complex objects
  const character = ref<IActor>(JSON.parse(JSON.stringify(initialCharacter)));
  const items = ref<IItem[]>([]);
  const originalCharacter = ref<IActor>(JSON.parse(JSON.stringify(initialCharacter)));
  const hasUnsavedChanges = ref(false);
  const isSaving = ref(false);

  // API client
  const documentsClient = new DocumentsClient();

  // WebSocket integration for game mode
  let socketCleanup: (() => void) | null = null;
  if (enableWebSocket) {
    const socketStore = useSocketStore();
    const socket = socketStore.socket;
    
    if (socket) {
      const handleCharacterUpdate = (update: Partial<IActor>) => {
        console.log('[useCharacterState] Received WebSocket character update:', update);
        
        // Apply server updates directly to character
        Object.assign(character.value, update);
        
        // Update original character to reflect server state
        originalCharacter.value = JSON.parse(JSON.stringify(character.value));
        hasUnsavedChanges.value = false;
      };

      const eventName = `character:${character.value.id}:update`;
      // Use any to bypass strict socket typing for custom events
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket as any).on(eventName, handleCharacterUpdate);
      
      socketCleanup = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (socket as any).off(eventName, handleCharacterUpdate);
      };
      
      console.log('[useCharacterState] WebSocket integration enabled for character:', character.value.id);
    }
  }

  // Manual change tracking - will need to be triggered explicitly
  const markAsChanged = () => {
    hasUnsavedChanges.value = true;
  };

  // Load character items
  const loadItems = async () => {
    try {
      const characterItems = await documentsClient.searchDocuments({
        documentType: 'item',
        'pluginData.characterId': character.value.id
      }) as IItem[];
      
      items.value = characterItems;
      console.log('[useCharacterState] Loaded character items:', characterItems.length);
    } catch (error) {
      console.error('[useCharacterState] Failed to load character items:', error);
      items.value = [];
    }
  };

  // Manual save function - uses PUT to replace entire character document
  const save = async () => {
    if (isSaving.value || readonly) {
      return;
    }

    try {
      isSaving.value = true;
      
      console.log('[useCharacterState] Saving character with PUT (full replace):', character.value.name);
      
      // Save character using putDocument (PUT) to replace entire document
      const updatedCharacter = await documentsClient.putDocument(
        character.value.id,
        character.value
      ) as IActor;
      
      // Update state with server response
      character.value = updatedCharacter;
      originalCharacter.value = JSON.parse(JSON.stringify(updatedCharacter));
      hasUnsavedChanges.value = false;
      
      console.log('[useCharacterState] Character saved successfully with PUT');
      
    } catch (error) {
      console.error('[useCharacterState] Failed to save character:', error);
      throw error;
    } finally {
      isSaving.value = false;
    }
  };

  // Reset to original state
  const reset = () => {
    character.value = JSON.parse(JSON.stringify(originalCharacter.value));
    hasUnsavedChanges.value = false;
    
    console.log('[useCharacterState] Character reset to original state');
  };

  // Cleanup on unmount
  onUnmounted(() => {
    if (socketCleanup) {
      socketCleanup();
    }
  });

  // Initialize items on creation
  loadItems();

  return {
    character,
    items,
    hasUnsavedChanges,
    isSaving,
    save,
    reset,
    loadItems,
    markAsChanged
  };
}