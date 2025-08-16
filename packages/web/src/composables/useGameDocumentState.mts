/**
 * Game Document State Management Composable
 * 
 * Provides reactive document state management for game sessions:
 * - Gets document data from gameState (not REST API)
 * - Sends updates via gameAction:request (maintains GM authority)
 * - Automatic reactivity when gameState updates
 */

import { computed, ref, type Ref } from 'vue';
import type { BaseDocument, ICharacter, IActor, IItem, StateOperation } from '@dungeon-lab/shared/types/index.mjs';
import { useGameStateStore } from '../stores/game-state.store.mts';

export interface GameDocumentStateOptions {
  /** Whether this is readonly mode */
  readonly?: boolean;
}

export interface GameDocumentStateReturn<T extends BaseDocument = BaseDocument> {
  /** Reactive document data from gameState */
  document: Ref<T | null>;
  /** Reactive document items (for characters) */
  items: Ref<IItem[]>;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: Ref<boolean>;
  /** Whether a save operation is in progress */
  isSaving: Ref<boolean>;
  /** Save document changes via gameAction:request */
  save: () => Promise<void>;
  /** Reset document to original state (cancel changes) */
  reset: () => void;
  /** Mark document as having unsaved changes */
  markAsChanged: () => void;
}

export function useGameDocumentState<T extends BaseDocument = BaseDocument>(
  documentId: string,
  documentType: 'character' | 'actor',
  options: GameDocumentStateOptions = {}
): GameDocumentStateReturn<T> {
  const {
    readonly = false
  } = options;

  const gameStateStore = useGameStateStore();
  
  // State for tracking changes and saving
  const hasUnsavedChanges = ref(false);
  const isSaving = ref(false);
  const pendingChanges = ref<Partial<T>>({});

  // Reactive document from gameState
  const document = computed(() => {
    console.log(`[useGameDocumentState] Looking for ${documentType} with id:`, documentId);
    console.log(`[useGameDocumentState] Available ${documentType}s in gameState:`, 
      documentType === 'character' ? gameStateStore.characters.map(c => ({ id: c.id, name: c.name })) :
      documentType === 'actor' ? gameStateStore.actors.map(a => ({ id: a.id, name: a.name })) : []);
    
    if (documentType === 'character') {
      const found = gameStateStore.characters.find((c: ICharacter) => c.id === documentId) as T | null;
      console.log(`[useGameDocumentState] Found character:`, found ? { id: found.id, name: found.name } : null);
      return found;
    } else if (documentType === 'actor') {
      const found = gameStateStore.actors.find((a: IActor) => a.id === documentId) as T | null;
      console.log(`[useGameDocumentState] Found actor:`, found ? { id: found.id, name: found.name } : null);
      return found;
    }
    console.log(`[useGameDocumentState] Unknown document type:`, documentType);
    return null;
  });

  // Reactive items (for characters)
  const items = computed(() => {
    if (documentType === 'character' && document.value) {
      // Items would be part of character data or fetched separately
      // For now, return empty array - this can be enhanced later
      return [];
    }
    return [];
  });

  // Save function - sends updates via gameState:update (maintains GM authority)
  const save = async (): Promise<void> => {
    if (readonly || !document.value || Object.keys(pendingChanges.value).length === 0) {
      return;
    }

    try {
      isSaving.value = true;

      // Create state operations for document update
      const operations: StateOperation[] = Object.entries(pendingChanges.value).map(([field, value]) => ({
        path: `${documentType}s.${documentId}.${field}`,
        operation: 'set',
        value
      }));

      // Send update via game state system (respects GM authority)
      const response = await gameStateStore.updateGameState(operations);

      if (response.success) {
        // Clear pending changes on successful save
        pendingChanges.value = {};
        hasUnsavedChanges.value = false;
        console.log(`[useGameDocumentState] Document ${documentId} saved via gameState:update`);
      } else {
        console.error(`[useGameDocumentState] Failed to save document ${documentId}:`, response.error);
        throw new Error(response.error?.message || 'Save failed via game state system');
      }
    } catch (error) {
      console.error('[useGameDocumentState] Save error:', error);
      throw error;
    } finally {
      isSaving.value = false;
    }
  };

  // Reset function - clear pending changes
  const reset = (): void => {
    pendingChanges.value = {};
    hasUnsavedChanges.value = false;
    console.log(`[useGameDocumentState] Document ${documentId} reset to gameState version`);
  };

  // Mark as changed - add to pending changes
  const markAsChanged = (): void => {
    hasUnsavedChanges.value = true;
  };

  // Helper function to track field changes
  const updateField = <K extends keyof T>(field: K, value: T[K]): void => {
    if (readonly) {
      console.warn('[useGameDocumentState] Attempted to update readonly document');
      return;
    }

    pendingChanges.value = {
      ...pendingChanges.value,
      [field]: value
    };
    hasUnsavedChanges.value = true;
    console.log(`[useGameDocumentState] Field ${String(field)} changed for document ${documentId}`);
  };

  return {
    document: document as Ref<T | null>,
    items,
    hasUnsavedChanges,
    isSaving,
    save,
    reset,
    markAsChanged,
    // Expose updateField for components that need to track specific changes
    updateField
  } as GameDocumentStateReturn<T> & { updateField: typeof updateField };
}