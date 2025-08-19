/**
 * Multi-Handler Integration Tests
 * 
 * Tests for the complete multi-handler workflow including validation, approval, and execution
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import type { ActionHandler, ValidationResult } from '../../services/action-handler.interface.mjs';
import { registerAction, getHandlers, clearAllHandlers } from '../../services/multi-handler-registry.mjs';
import { produceGameStateChanges } from '../../services/immer-utils.mjs';
import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';

describe('Multi-Handler Workflow Integration', () => {
  const mockGameState: ServerGameStateWithVirtuals = {
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
  } as ServerGameStateWithVirtuals;

  beforeEach(() => {
    clearAllHandlers();
  });

  test('should execute multiple handlers in priority order', async () => {
    const executionOrder: string[] = [];

    // Core handler (priority 0)
    const coreHandler: ActionHandler = {
      priority: 0,
      validate: async () => ({ valid: true }),
      execute: (request, draft) => {
        executionOrder.push('core');
        draft.documents.char1.state.movementUsed = 10;
      }
    };

    // Plugin handler (priority 100)
    const pluginHandler: ActionHandler = {
      pluginId: 'test-plugin',
      priority: 100,
      validate: async () => ({ valid: true }),
      execute: (request, draft) => {
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

    // Execute all handlers in order (synchronously, as recommended)
    const [newState, patches] = await produceGameStateChanges(
      mockGameState,
      (draft) => {
        for (const handler of handlers) {
          if (handler.execute) {
            const mockRequest: GameActionRequest = {
              id: 'test-request',
              action: 'move-token',
              parameters: {},
              timestamp: Date.now()
            };
            handler.execute(mockRequest, draft);
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
      validate: async (request, gameState): Promise<ValidationResult> => {
        validateSpy();
        return {
          valid: false,
          error: { code: 'VALIDATION_FAILED', message: 'Test validation failure' }
        };
      },
      execute: (request, draft) => {
        executeSpy();
        draft.documents.char1.state.currentHitPoints = 50;
      }
    };

    registerAction('test-action', failingHandler);
    const handlers = getHandlers('test-action');

    // Run validation phase
    const mockRequest: GameActionRequest = {
      id: 'test-request',
      action: 'test-action',
      parameters: {},
      timestamp: Date.now()
    };

    let validationResult: ValidationResult | undefined;
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
      validate: async () => ({ valid: true }),
      execute: (request, draft) => {
        draft.documents.char1.state.movementUsed = 5;
      }
    };

    const failingHandler: ActionHandler = {
      priority: 100,
      validate: async (): Promise<ValidationResult> => ({
        valid: false,
        error: { code: 'PLUGIN_VALIDATION_FAILED', message: 'Plugin validation failed' }
      }),
      execute: (request, draft) => {
        draft.documents.char1.state.currentHitPoints = 50;
      }
    };

    registerAction('test-action', passingHandler);
    registerAction('test-action', failingHandler);

    const handlers = getHandlers('test-action');
    const mockRequest: GameActionRequest = {
      id: 'test-request',
      action: 'test-action',
      parameters: {},
      timestamp: Date.now()
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
      validate: async () => ({ valid: true }),
      execute: () => {}
    };

    const manualHandler: ActionHandler = {
      priority: 100,
      requiresManualApproval: true,
      validate: async () => ({ valid: true }),
      execute: () => {},
      approvalMessage: (request) => 'Plugin wants to do something'
    };

    registerAction('test-action', autoHandler);
    registerAction('test-action', manualHandler);

    const handlers = getHandlers('test-action');

    // Check if any handler requires manual approval
    const requiresApproval = handlers.some(h => h.requiresManualApproval);
    expect(requiresApproval).toBe(true);

    // Get approval message from the handler that requires it
    const approvalHandler = handlers.find(h => h.requiresManualApproval);
    expect(approvalHandler?.approvalMessage).toBeDefined();
    
    if (approvalHandler?.approvalMessage) {
      const mockRequest: GameActionRequest = {
        id: 'test-request',
        action: 'test-action',
        parameters: {},
        timestamp: Date.now()
      };
      const message = approvalHandler.approvalMessage(mockRequest);
      expect(message).toBe('Plugin wants to do something');
    }
  });

  test('should handle gmOnly restrictions correctly', async () => {
    const playerHandler: ActionHandler = {
      priority: 0,
      gmOnly: false,
      validate: async () => ({ valid: true }),
      execute: () => {}
    };

    const gmOnlyHandler: ActionHandler = {
      priority: 100,
      gmOnly: true,
      validate: async () => ({ valid: true }),
      execute: () => {}
    };

    registerAction('test-action', playerHandler);
    registerAction('test-action', gmOnlyHandler);

    const handlers = getHandlers('test-action');

    // Check GM-only restrictions
    const gmOnlyHandlers = handlers.filter(h => h.gmOnly);
    const playerHandlers = handlers.filter(h => !h.gmOnly);

    expect(gmOnlyHandlers).toHaveLength(1);
    expect(playerHandlers).toHaveLength(1);
  });

  test('should generate combined patches from multiple handlers', async () => {
    const handler1: ActionHandler = {
      priority: 0,
      execute: (request, draft) => {
        draft.documents.char1.state.movementUsed = 15;
      }
    };

    const handler2: ActionHandler = {
      priority: 100,
      execute: (request, draft) => {
        draft.documents.char1.state.currentHitPoints = 60;
      }
    };

    registerAction('test-action', handler1);
    registerAction('test-action', handler2);

    const handlers = getHandlers('test-action');
    const mockRequest: GameActionRequest = {
      id: 'test-request',
      action: 'test-action',
      parameters: {},
      timestamp: Date.now()
    };

    // Execute all handlers and collect patches (synchronously)
    const [newState, patches] = await produceGameStateChanges(
      mockGameState,
      (draft) => {
        for (const handler of handlers) {
          if (handler.execute) {
            handler.execute(mockRequest, draft);
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