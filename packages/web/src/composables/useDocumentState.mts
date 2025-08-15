/**
 * Document State Management Composable
 * 
 * Provides reactive document state management for both characters and actors:
 * - Standalone editing mode (with auto-save)
 * - Game mode (with WebSocket updates)
 */

import { ref, onUnmounted, type Ref } from 'vue';
import type { ICharacter, IItem } from '@dungeon-lab/shared/types/index.mjs';
import type { CreateDocumentData } from '@dungeon-lab/shared/schemas/document.schema.mjs';
import { DocumentsClient } from '@dungeon-lab/client/index.mjs';
import { useSocketStore } from '../stores/socket.store.mjs';

export interface DocumentStateOptions {
  /** Enable WebSocket integration for real-time server updates (game mode) */
  enableWebSocket?: boolean;
  /** Enable auto-save functionality for user edits (edit mode) */
  enableAutoSave?: boolean;
  /** Auto-save delay in milliseconds */
  autoSaveDelay?: number;
  /** Whether this is readonly mode */
  readonly?: boolean;
}

/**
 * Strip populated and database-specific fields from a character to create a valid PutDocumentRequest
 * This removes fields that are added by the server/database but shouldn't be included in create/update requests
 */
function stripPopulatedFields(character: ICharacter): CreateDocumentData {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, createdBy, updatedBy, avatar, tokenImage, ...coreFields } = character;
  
  return coreFields as CreateDocumentData;
}

export interface DocumentStateReturn {
  /** Reactive document data */
  character: Ref<ICharacter>;
  /** Reactive document items */
  items: Ref<IItem[]>;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: Ref<boolean>;
  /** Whether a save operation is in progress */
  isSaving: Ref<boolean>;
  /** Manually save document changes */
  save: () => Promise<void>;
  /** Reset document to original state (cancel changes) */
  reset: () => void;
  /** Load document items from server */
  loadItems: () => Promise<void>;
  /** Mark document as having unsaved changes */
  markAsChanged: () => void;
}

export function useDocumentState(
  initialCharacter: ICharacter,
  options: DocumentStateOptions = {}
): DocumentStateReturn {
  const {
    enableWebSocket = false,
    readonly = false
  } = options;

  // Reactive state - use JSON clone to avoid structuredClone issues with complex objects
  const character = ref<ICharacter>(JSON.parse(JSON.stringify(initialCharacter)));
  const items = ref<IItem[]>([]);
  const originalCharacter = ref<ICharacter>(JSON.parse(JSON.stringify(initialCharacter)));
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
      const handleCharacterUpdate = (update: Partial<ICharacter>) => {
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
        carrierId: character.value.id
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
      
      // Strip populated fields to create valid PutDocumentRequest
      const characterData = stripPopulatedFields(character.value);
      
      // Save character using putDocument (PUT) to replace entire document
      const updatedCharacter = await documentsClient.putDocument(
        character.value.id,
        characterData
      ) as ICharacter;
      
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