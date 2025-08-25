/**
 * Multi-Handler Integration Tests
 * 
 * Tests for the complete multi-handler workflow including validation, approval, and execution
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import type { ActionHandler, ActionValidationResult, PluginContext } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import { registerAction, getHandlers, clearAllHandlers } from '../../services/multi-handler-registry.mjs';
import { produceGameStateChanges } from '../../services/immer-utils.mjs';
import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';

describe('Multi-Handler Workflow Integration', () => {
  const mockGameState = {
    documents: {
      'char1': {
        id: 'char1',
        name: 'Test Character',
        documentType: 'character',
        pluginId: 'test-plugin',
        data: { speed: 30 },
        pluginData: {},
        state: {
          currentHitPoints: 80,
          movementUsed: 0
        }
      }
    },
    currentEncounter: null,
    turnManager: null
  } as unknown as ServerGameStateWithVirtuals;

  beforeEach(() => {
    clearAllHandlers();
  });

  test('should execute multiple handlers in priority order', async () => {
    const executionOrder: string[] = [];

    // Core handler (priority 0)
    const coreHandler: ActionHandler = {
      priority: 0,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      validate: async (_request, _gameState) => ({ valid: true }),
      execute: async (_request, draft) => {
        executionOrder.push('core');
        draft.documents.char1.state.movementUsed = 10;
      }
    };

    // Plugin handler (priority 100)
    const pluginHandler: ActionHandler = {
      pluginId: 'test-plugin',
      priority: 100,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      validate: async (_request, _gameState) => ({ valid: true }),
      execute: async (_request, draft) => {
        executionOrder.push('plugin');
        draft.documents.char1.state.currentHitPoints = 70;
      }
    };

    // Register in reverse order to test priority sorting
    registerAction('move-token', pluginHandler);
    registerAction('move-token', coreHandler);

    const handlers = getHandlers('move-token');
    expect(handlers).toHaveLength(2);
    expect(handlers[0].priority).toBe(0);   // Core first
    expect(handlers[1].priority).toBe(100); // Plugin second

    // Execute all handlers in order (with async support)
    const [newState, patches] = await produceGameStateChanges(
      mockGameState,
      async (draft) => {
        for (const handler of handlers) {
          if (handler.execute) {
            const mockRequest: GameActionRequest = {
              id: 'test-request',
              action: 'move-token',
              parameters: {},
              timestamp: Date.now(),
              sessionId: 'test-session',
              playerId: 'test-player'
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await handler.execute(mockRequest, draft, {
              pluginContext: {} as PluginContext,
              sendRollRequest: async () => ({} as RollServerResult),
              sendMultipleRollRequests: async () => [],
              sendChatMessage: async () => {},
              sendRollResult: () => {},
              requestGMConfirmation: async () => false
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);
          }
        }
      }
    );

    expect(executionOrder).toEqual(['core', 'plugin']);
    expect(newState.documents.char1.state.movementUsed).toBe(10);
    expect(newState.documents.char1.state.currentHitPoints).toBe(70);
    expect(patches).toHaveLength(2);
  });

  test('should handle validation failures correctly', async () => {
    const validateSpy = vi.fn();
    const executeSpy = vi.fn();

    const failingHandler: ActionHandler = {
      priority: 0,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      validate: async (_request, _gameState): Promise<ActionValidationResult> => {
        validateSpy();
        return {
          valid: false,
          error: { code: 'VALIDATION_FAILED', message: 'Test validation failure' }
        };
      },
      execute: async (_request, draft) => {
        executeSpy();
        draft.documents.char1.state.currentHitPoints = 50;
      }
    };

    registerAction('move-token', failingHandler);
    const handlers = getHandlers('move-token');

    // Run validation phase
    const mockRequest: GameActionRequest = {
      id: 'test-request',
      action: 'move-token',
      parameters: {},
      timestamp: Date.now(),
      sessionId: 'test-session',
      playerId: 'test-player'
    };

    let validationResult: ActionValidationResult | undefined;
    for (const handler of handlers) {
      if (handler.validate) {
        validationResult = await handler.validate(mockRequest, mockGameState);
        if (!validationResult.valid) {
          break; // Stop on validation failure
        }
      }
    }

    expect(validateSpy).toHaveBeenCalledOnce();
    expect(executeSpy).not.toHaveBeenCalled();
    expect(validationResult?.valid).toBe(false);
    expect(validationResult?.error?.code).toBe('VALIDATION_FAILED');
  });

  test('should handle mixed validation results correctly', async () => {
    const passingHandler: ActionHandler = {
      priority: 0,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      validate: async (_request, _gameState) => ({ valid: true }),
      execute: async (_request, draft) => {
        draft.documents.char1.state.movementUsed = 5;
      }
    };

    const failingHandler: ActionHandler = {
      priority: 100,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      validate: async (_request, _gameState): Promise<ActionValidationResult> => ({
        valid: false,
        error: { code: 'PLUGIN_VALIDATION_FAILED', message: 'Plugin validation failed' }
      }),
      execute: async (_request, draft) => {
        draft.documents.char1.state.currentHitPoints = 50;
      }
    };

    registerAction('move-token', passingHandler);
    registerAction('move-token', failingHandler);

    const handlers = getHandlers('move-token');
    const mockRequest: GameActionRequest = {
      id: 'test-request',
      action: 'move-token',
      parameters: {},
      timestamp: Date.now(),
      sessionId: 'test-session',
      playerId: 'test-player'
    };

    // Run validation phase (fail-fast)
    let allValid = true;
    let validationError: { code: string; message: string } | undefined;

    for (const handler of handlers) {
      if (handler.validate) {
        const result = await handler.validate(mockRequest, mockGameState);
        if (!result.valid) {
          allValid = false;
          validationError = result.error;
          break;
        }
      }
    }

    expect(allValid).toBe(false);
    expect(validationError?.code).toBe('PLUGIN_VALIDATION_FAILED');
  });

  test('should handle approval requirements correctly', async () => {
    const autoHandler: ActionHandler = {
      priority: 0,
      requiresManualApproval: false,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      validate: async (_request: GameActionRequest, _gameState: Readonly<ServerGameStateWithVirtuals>) => ({ valid: true }),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      execute: async (_request: GameActionRequest, _draft: ServerGameStateWithVirtuals) => {}
    };

    const manualHandler: ActionHandler = {
      priority: 100,
      requiresManualApproval: true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      validate: async (_request: GameActionRequest, _gameState: Readonly<ServerGameStateWithVirtuals>) => ({ valid: true }),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      execute: async (_request: GameActionRequest, _draft: ServerGameStateWithVirtuals) => {},
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      approvalMessage: async (_request: GameActionRequest) => 'Plugin wants to do something'
    };

    registerAction('move-token', autoHandler);
    registerAction('move-token', manualHandler);

    const handlers = getHandlers('move-token');

    // Check if any handler requires manual approval
    const requiresApproval = handlers.some(h => h.requiresManualApproval);
    expect(requiresApproval).toBe(true);

    // Get approval message from the handler that requires it
    const approvalHandler = handlers.find(h => h.requiresManualApproval);
    expect(approvalHandler?.approvalMessage).toBeDefined();
    
    if (approvalHandler?.approvalMessage) {
      const mockRequest: GameActionRequest = {
        id: 'test-request',
        action: 'move-token',
        parameters: {},
        timestamp: Date.now(),
        sessionId: 'test-session',
        playerId: 'test-player'
      };
      const message = await approvalHandler.approvalMessage(mockRequest);
      expect(message).toBe('Plugin wants to do something');
    }
  });

  test('should handle gmOnly restrictions correctly', async () => {
    const playerHandler: ActionHandler = {
      priority: 0,
      gmOnly: false,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      validate: async (_request: GameActionRequest, _gameState: Readonly<ServerGameStateWithVirtuals>) => ({ valid: true }),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      execute: async (_request: GameActionRequest, _draft: ServerGameStateWithVirtuals) => {}
    };

    const gmOnlyHandler: ActionHandler = {
      priority: 100,
      gmOnly: true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      validate: async (_request: GameActionRequest, _gameState: Readonly<ServerGameStateWithVirtuals>) => ({ valid: true }),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      execute: async (_request: GameActionRequest, _draft: ServerGameStateWithVirtuals) => {}
    };

    registerAction('move-token', playerHandler);
    registerAction('move-token', gmOnlyHandler);

    const handlers = getHandlers('move-token');

    // Check GM-only restrictions
    const gmOnlyHandlers = handlers.filter(h => h.gmOnly);
    const playerHandlers = handlers.filter(h => !h.gmOnly);

    expect(gmOnlyHandlers).toHaveLength(1);
    expect(playerHandlers).toHaveLength(1);
  });

  test('should generate combined patches from multiple handlers', async () => {
    const handler1: ActionHandler = {
      priority: 0,
      execute: async (_request, draft) => {
        draft.documents.char1.state.movementUsed = 15;
      }
    };

    const handler2: ActionHandler = {
      priority: 100,
      execute: async (_request, draft) => {
        draft.documents.char1.state.currentHitPoints = 60;
      }
    };

    registerAction('move-token', handler1);
    registerAction('move-token', handler2);

    const handlers = getHandlers('move-token');
    const mockRequest: GameActionRequest = {
      id: 'test-request',
      action: 'move-token',
      parameters: {},
      timestamp: Date.now(),
      sessionId: 'test-session',
      playerId: 'test-player'
    };

    // Execute all handlers and collect patches (with async support)
    const [newState, patches] = await produceGameStateChanges(
      mockGameState,
      async (draft) => {
        for (const handler of handlers) {
          if (handler.execute) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await handler.execute(mockRequest, draft, {
              pluginContext: {} as PluginContext,
              sendRollRequest: async () => ({} as RollServerResult),
              sendMultipleRollRequests: async () => [],
              sendChatMessage: async () => {},
              sendRollResult: () => {},
              requestGMConfirmation: async () => false
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);
          }
        }
      }
    );

    expect(patches).toHaveLength(2);
    
    // Check that both expected patches are present (order may vary due to async processing)
    expect(patches).toContainEqual({ op: 'replace', path: '/documents/char1/state/movementUsed', value: 15 });
    expect(patches).toContainEqual({ op: 'replace', path: '/documents/char1/state/currentHitPoints', value: 60 });

    expect(newState.documents.char1.state.movementUsed).toBe(15);
    expect(newState.documents.char1.state.currentHitPoints).toBe(60);
  });
});