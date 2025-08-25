import { describe, it, expect } from 'vitest';
import { GameStateOperations } from '../utils/game-state-operations.mjs';
import type { ServerGameStateWithVirtuals, JsonPatchOperation } from '../types/index.mjs';

describe('GameStateOperations', () => {
  const createTestState = (): ServerGameStateWithVirtuals => ({
    documents: {
      'char1': {
        id: 'char1',
        name: 'Test Character',
        documentType: 'character',
        pluginDocumentType: 'character',
        pluginId: 'test',
        pluginData: { hp: 10 },
        campaignId: 'campaign1',
        createdBy: 'user1',
        updatedBy: 'user1',
        ownerId: 'user1'
      }
    },
    currentEncounter: {
      id: 'encounter1',
      name: 'Test Encounter',
      mapId: 'map1',
      tokens: {
        token1: {
          id: 'token1',
          name: 'Token 1',
          imageUrl: 'test.png',
          encounterId: 'encounter1',
          bounds: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 1, y: 1 }, elevation: 0 },
          documentId: 'char1',
          documentType: 'character',
          notes: '',
          isVisible: true,
          isPlayerControlled: true,
          data: {},
          conditions: [],
          version: 1,
          createdBy: 'user1',
          updatedBy: 'user1',
          ownerId: 'user1'
        }
      },
      campaignId: 'campaign1',
      createdBy: 'user1',
      updatedBy: 'user1'
    },
    campaign: {
      id: 'campaign1',
      name: 'Test Campaign',
      pluginId: 'test',
      createdBy: 'user1',
      updatedBy: 'user1'
    },
    turnManager: {
      isActive: false,
      currentTurn: 0,
      participants: []
    },
    pluginData: {}
  });

  it('should apply operations normally with applyOperations', () => {
    const state = createTestState();
    const originalState = state;
    
    const operations: JsonPatchOperation[] = [
      {
        op: 'replace',
        path: '/documents/char1/name',
        value: 'Updated Character'
      }
    ];

    const newState = GameStateOperations.applyOperations(state, operations);
    
    // Should return a completely new object
    expect(newState).not.toBe(originalState);
    expect(newState.documents.char1.name).toBe('Updated Character');
    expect(originalState.documents.char1.name).toBe('Test Character'); // Original unchanged
  });

  it('should apply operations in-place with applyOperationsInPlace', () => {
    const state = createTestState();
    const originalState = state;
    const originalDocuments = state.documents;
    const originalCharacter = state.documents.char1;
    
    const operations: JsonPatchOperation[] = [
      {
        op: 'replace',
        path: '/documents/char1/name',
        value: 'Updated Character'
      }
    ];

    GameStateOperations.applyOperationsInPlace(state, operations);
    
    // Should mutate the same object
    expect(state).toBe(originalState);
    expect(state.documents).toBe(originalDocuments); // Documents object preserved
    expect(state.documents.char1).toBe(originalCharacter); // Character object preserved
    expect(state.documents.char1.name).toBe('Updated Character'); // But name updated
  });

  it('should handle adding tokens to encounter in-place', () => {
    const state = createTestState();
    const originalEncounter = state.currentEncounter;
    const originalTokens = state.currentEncounter?.tokens;
    
    const newToken = {
      id: 'token2',
      name: 'Token 2',
      imageUrl: 'test2.png',
      encounterId: 'encounter1',
      bounds: { topLeft: { x: 2, y: 2 }, bottomRight: { x: 3, y: 3 }, elevation: 0 },
      documentId: 'char1',
      documentType: 'character',
      notes: '',
      isVisible: true,
      isPlayerControlled: true,
      data: {},
      conditions: [],
      version: 1,
      createdBy: 'user1',
      updatedBy: 'user1',
      ownerId: 'user1'
    };

    const operations: JsonPatchOperation[] = [
      {
        op: 'add',
        path: '/currentEncounter/tokens/token2',
        value: newToken
      }
    ];

    GameStateOperations.applyOperationsInPlace(state, operations);
    
    // Encounter object should be preserved
    expect(state.currentEncounter).toBe(originalEncounter);
    // Tokens record should be modified in-place (even better!)
    expect(state.currentEncounter?.tokens).toBe(originalTokens);
    expect(Object.keys(state.currentEncounter?.tokens || {})).toHaveLength(2);
    expect(state.currentEncounter?.tokens.token2).toEqual(newToken);
  });
});