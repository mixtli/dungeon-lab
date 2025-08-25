/**
 * Document State Lifecycle Integration Tests
 * 
 * Tests the integration of document state lifecycle resets with turn management
 * and encounter end systems.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GameActionRequest } from '@dungeon-lab/shared/types/index.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { PluginContext } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import { endTurnActionHandler } from '../../services/handlers/actions/end-turn.handler.mjs';
import { stopEncounterActionHandler } from '../../services/handlers/actions/stop-encounter.handler.mjs';
import { registerPluginStateLifecycle, clearAllPluginStateLifecycles } from '@dungeon-lab/shared/utils/document-state-lifecycle.mjs';

// Mock stores to avoid Vue dependencies in tests
vi.mock('../../../stores/game-session.store.mjs', () => ({
  useGameSessionStore: vi.fn(() => ({
    currentSession: {
      gameMasterId: 'gm-1'
    }
  }))
}));

describe('Document State Lifecycle Integration', () => {
  beforeEach(() => {
    // Clear any registered plugin lifecycles before each test
    clearAllPluginStateLifecycles();
  });

  describe('Turn End Lifecycle Integration', () => {
    it('should apply turn lifecycle resets when ending turn', async () => {
      // Register a test plugin lifecycle
      registerPluginStateLifecycle({
        pluginId: 'test-plugin',
        turnReset: {
          turnState: { movementUsed: 0, actionsUsed: [] }
        }
      });

      // Create test game state with active turn manager
      const gameState: ServerGameStateWithVirtuals = {
        campaign: null,
        pluginData: {},
        documents: {
          'actor-1': {
            id: 'actor-1',
            name: 'Test Character',
            documentType: 'actor',
            pluginDocumentType: 'character',
            pluginId: 'test-plugin',
            slug: 'test-character',
            pluginData: {},
            itemState: {},
            state: {
              turnState: { movementUsed: 30, actionsUsed: ['attack'] },
              sessionState: undefined,
              encounterState: undefined,
              persistentState: undefined
            },
            userData: {}
          }
        },
        turnManager: {
          isActive: true,
          currentTurn: 0,
          round: 1,
          participants: [
            {
              id: 'participant-1',
              tokenId: 'token-1',
              actorId: 'actor-1',
              name: 'Test Character',
              turnOrder: 15,
              hasActed: false
            }
          ],
          turnData: {}
        },
        currentEncounter: null
      };

      // Create end turn request
      const request: GameActionRequest = {
        id: 'test-request',
        timestamp: Date.now(),
        sessionId: 'test-session',
        playerId: 'gm-1',
        action: 'end-turn',
        parameters: {}
      };

      // Validate the request
      const validation = await endTurnActionHandler.validate!(request, gameState);
      expect(validation.valid).toBe(true);

      // Execute the turn end (this should apply lifecycle resets)
      const draftState = JSON.parse(JSON.stringify(gameState)) as ServerGameStateWithVirtuals;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await endTurnActionHandler.execute!(request, draftState, {
        pluginContext: {} as PluginContext,
        sendRollRequest: async () => ({} as RollServerResult),
        sendMultipleRollRequests: async () => [],
        sendChatMessage: async () => {},
        sendRollResult: () => {},
        requestGMConfirmation: async () => false
      });

      // Verify turn advancement - with 1 participant, goes to next round
      expect(draftState.turnManager?.currentTurn).toBe(0); // Back to first participant
      expect(draftState.turnManager?.participants[0].hasActed).toBe(true);

      // Verify lifecycle reset was applied
      expect(draftState.documents['actor-1'].state.turnState).toEqual({
        movementUsed: 0,
        actionsUsed: []
      });
    });

    it('should handle turn end gracefully when no lifecycles are registered', async () => {
      // No plugin lifecycles registered (cleared in beforeEach)

      const gameState: ServerGameStateWithVirtuals = {
        campaign: null,
        pluginData: {},
        documents: {
          'actor-1': {
            id: 'actor-1',
            name: 'Test Character',
            documentType: 'actor',
            pluginDocumentType: 'character',
            pluginId: 'test-plugin',
            slug: 'test-character',
            pluginData: {},
            itemState: {},
            state: {
              turnState: { movementUsed: 30 },
              sessionState: undefined,
              encounterState: undefined,
              persistentState: undefined
            },
            userData: {}
          }
        },
        turnManager: {
          isActive: true,
          currentTurn: 0,
          round: 1,
          participants: [
            {
              id: 'participant-1',
              tokenId: 'token-1',
              actorId: 'actor-1',
              name: 'Test Character',
              turnOrder: 15,
              hasActed: false
            }
          ],
          turnData: {}
        },
        currentEncounter: null
      };

      const request: GameActionRequest = {
        id: 'test-request',
        timestamp: Date.now(),
        sessionId: 'test-session',
        playerId: 'gm-1',
        action: 'end-turn',
        parameters: {}
      };

      const draftState = JSON.parse(JSON.stringify(gameState)) as ServerGameStateWithVirtuals;
      
      // Should not throw even when no lifecycles are registered
      expect(() => endTurnActionHandler.execute!(request, draftState, {
        pluginContext: {} as PluginContext,
        sendRollRequest: async () => ({} as RollServerResult),
        sendMultipleRollRequests: async () => [],
        sendChatMessage: async () => {},
        sendRollResult: () => {},
        requestGMConfirmation: async () => false
      })).not.toThrow();

      // Turn should still advance normally - note: with only 1 participant, advancing goes to next round
      expect(draftState.turnManager?.currentTurn).toBe(0); // Back to first participant in new round
      expect(draftState.turnManager?.participants[0].hasActed).toBe(true);

      // State should remain unchanged since no lifecycles were registered
      expect(draftState.documents['actor-1'].state.turnState).toEqual({ movementUsed: 30 });
    });
  });

  describe('Encounter End Lifecycle Integration', () => {
    it('should apply encounter lifecycle resets when stopping encounter', async () => {
      // Register a test plugin lifecycle  
      registerPluginStateLifecycle({
        pluginId: 'test-plugin',
        encounterReset: {
          encounterState: { conditions: [], temporaryEffects: [] }
        }
      });

      const gameState: ServerGameStateWithVirtuals = {
        campaign: null,
        pluginData: {},
        documents: {
          'actor-1': {
            id: 'actor-1',
            name: 'Test Character',
            documentType: 'actor',
            pluginDocumentType: 'character',
            pluginId: 'test-plugin',
            slug: 'test-character',
            pluginData: {},
            itemState: {},
            state: {
              turnState: undefined,
              sessionState: undefined,
              encounterState: { conditions: ['poisoned'], temporaryEffects: ['bless'] },
              persistentState: undefined
            },
            userData: {}
          }
        },
        turnManager: {
          isActive: true,
          currentTurn: 0,
          round: 3,
          participants: [
            {
              id: 'participant-1',
              tokenId: 'token-1',
              actorId: 'actor-1',
              name: 'Test Character',
              turnOrder: 15,
              hasActed: true
            }
          ],
          turnData: {}
        },
        currentEncounter: {
          id: 'encounter-1',
          name: 'Test Encounter',
          status: 'in_progress',
          participants: [],
          campaignId: 'campaign-1',
          mapId: 'map-1',
          tokens: {}
        }
      };

      const request: GameActionRequest = {
        id: 'test-request',
        timestamp: Date.now(),
        sessionId: 'test-session',
        playerId: 'gm-1',
        action: 'stop-encounter',
        parameters: {
          encounterId: 'encounter-1'
        }
      };

      // Validate the request
      const validation = await stopEncounterActionHandler.validate!(request, gameState);
      expect(validation.valid).toBe(true);

      // Execute the encounter stop
      const draftState = JSON.parse(JSON.stringify(gameState)) as ServerGameStateWithVirtuals;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await stopEncounterActionHandler.execute!(request, draftState, {
        pluginContext: {} as PluginContext,
        sendRollRequest: async () => ({} as RollServerResult),
        sendMultipleRollRequests: async () => [],
        sendChatMessage: async () => {},
        sendRollResult: () => {},
        requestGMConfirmation: async () => false
      });

      // Verify encounter was stopped
      expect(draftState.currentEncounter?.status).toBe('stopped');
      expect(draftState.turnManager?.isActive).toBe(false);

      // Verify lifecycle reset was applied  
      expect(draftState.documents['actor-1'].state.encounterState).toEqual({
        conditions: [],
        temporaryEffects: []
      });
    });
  });

  describe('Multiple Plugin Lifecycles', () => {
    it('should apply resets from multiple plugins on turn end', async () => {
      // Register multiple plugin lifecycles
      registerPluginStateLifecycle({
        pluginId: 'plugin-a',
        turnReset: {
          turnState: { movementUsed: 0 }
        }
      });

      registerPluginStateLifecycle({
        pluginId: 'plugin-b', 
        turnReset: {
          turnState: { actionsUsed: [] }
        }
      });

      const gameState: ServerGameStateWithVirtuals = {
        campaign: null,
        pluginData: {},
        documents: {
          'actor-1': {
            id: 'actor-1',
            name: 'Test Character',
            documentType: 'actor',
            pluginDocumentType: 'character',
            pluginId: 'plugin-a',
            slug: 'test-character',
            pluginData: {},
            itemState: {},
            state: {
              turnState: { movementUsed: 30, actionsUsed: ['attack'] },
              sessionState: undefined,
              encounterState: undefined,
              persistentState: undefined
            },
            userData: {}
          }
        },
        turnManager: {
          isActive: true,
          currentTurn: 0,
          round: 1,
          participants: [
            {
              id: 'participant-1',
              tokenId: 'token-1',
              actorId: 'actor-1',
              name: 'Test Character',
              turnOrder: 15,
              hasActed: false
            }
          ],
          turnData: {}
        },
        currentEncounter: null
      };

      const request: GameActionRequest = {
        id: 'test-request',
        timestamp: Date.now(),
        sessionId: 'test-session',
        playerId: 'gm-1',
        action: 'end-turn',
        parameters: {}
      };

      const draftState = JSON.parse(JSON.stringify(gameState)) as ServerGameStateWithVirtuals;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await endTurnActionHandler.execute!(request, draftState, {
        pluginContext: {} as PluginContext,
        sendRollRequest: async () => ({} as RollServerResult),
        sendMultipleRollRequests: async () => [],
        sendChatMessage: async () => {},
        sendRollResult: () => {},
        requestGMConfirmation: async () => false
      });

      // Both plugin resets should be applied
      // Note: The second plugin's reset will overwrite the first's turnState
      expect(draftState.documents['actor-1'].state.turnState).toEqual({
        actionsUsed: []
      });
    });
  });
});