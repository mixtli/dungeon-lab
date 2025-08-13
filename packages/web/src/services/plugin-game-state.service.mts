/**
 * Plugin Game State Service
 * 
 * Provides game state context for plugins by wrapping the game state store
 * and implementing the GameStateContext interface with reactive data access.
 */

import { computed, watch, readonly, type ComputedRef, type Ref } from 'vue';
import type { 
  ICharacter, 
  IActor, 
  IItem, 
  IEncounter, 
  IToken,
  ServerGameStateWithVirtuals,
  StateUpdateBroadcast
} from '@dungeon-lab/shared/types/index.mjs';
import type { GameStateContext } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import { useGameStateStore } from '../stores/game-state.store.mjs';

/**
 * Implementation of GameStateContext that wraps the game state store
 * and provides reactive access to unified game state for plugins
 */
export class PluginGameStateService implements GameStateContext {
  private gameStateStore = useGameStateStore();

  // Direct reactive access to game state arrays (maintains Vue reactivity)
  readonly characters: ComputedRef<ICharacter[]> = computed(() => {
    return this.gameStateStore.characters || [];
  });

  readonly actors: ComputedRef<IActor[]> = computed(() => {
    return this.gameStateStore.actors || [];
  });

  readonly items: ComputedRef<IItem[]> = computed(() => {
    return this.gameStateStore.items || [];
  });

  readonly currentEncounter: ComputedRef<IEncounter | null> = computed(() => {
    return this.gameStateStore.currentEncounter;
  });

  // State metadata
  readonly gameStateVersion: Ref<string | null> = computed(() => {
    return this.gameStateStore.gameStateVersion;
  });

  // Synchronous helper methods for convenience (work with reactive data)
  getActorById(id: string): IActor | null {
    return this.actors.value.find(actor => actor.id === id) || null;
  }

  getCharacterById(id: string): ICharacter | null {
    return this.characters.value.find(character => character.id === id) || null;
  }

  getItemById(id: string): IItem | null {
    return this.items.value.find(item => item.id === id) || null;
  }

  getItemsByCarrier(carrierId: string): IItem[] {
    return this.items.value.filter(item => {
      // IItem has carrierId property from itemDocumentSchema for character/actor inventory relationships
      return item.carrierId === carrierId;
    });
  }

  // Backward compatibility wrapper for old interface
  getItemsByOwner(ownerId: string): IItem[] {
    console.warn('getItemsByOwner is deprecated. Use getItemsByCarrier for character/actor inventory relationships.');
    return this.getItemsByCarrier(ownerId);
  }

  getTokensByDocument(documentId: string, documentType?: string): IToken[] {
    const encounter = this.currentEncounter.value;
    if (!encounter || !encounter.tokens) {
      return [];
    }
    
    return encounter.tokens.filter(token => 
      token.documentId === documentId && 
      (!documentType || token.documentType === documentType)
    );
  }

  // Subscribe to state changes for side effects
  subscribeToState(callback: (state: Readonly<ServerGameStateWithVirtuals>) => void): () => void {
    // Watch the gameState ref for changes and call the callback
    return watch(
      () => this.gameStateStore.gameState,
      (newState) => {
        if (newState) {
          callback(readonly(newState) as Readonly<ServerGameStateWithVirtuals>);
        }
      },
      { immediate: true }
    );
  }

  subscribeToStateUpdates(callback: (broadcast: StateUpdateBroadcast) => void): () => void {
    // Since we don't have direct access to broadcasts, we can create a simple
    // version watcher that provides basic update notification
    let previousVersion = this.gameStateStore.gameStateVersion;
    
    return watch(
      () => this.gameStateStore.gameStateVersion,
      (newVersion) => {
        if (newVersion && previousVersion && newVersion !== previousVersion) {
          // Create a minimal broadcast-like object for plugin compatibility
          const broadcast: StateUpdateBroadcast = {
            gameStateId: '', // GameState document ID not available to client - plugins don't need this
            newVersion,
            operations: [], // We don't have access to the actual operations
            expectedHash: this.gameStateStore.gameStateHash || '',
            source: 'system',
            timestamp: Date.now()
          };
          
          callback(broadcast);
        }
        previousVersion = newVersion;
      }
    );
  }
}

/**
 * Create a new plugin game state service instance
 * This is typically called by the plugin registry when creating plugin contexts
 */
export function createPluginGameStateService(): GameStateContext {
  return new PluginGameStateService();
}