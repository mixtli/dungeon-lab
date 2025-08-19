/**
 * Action Handler System Tests
 * 
 * Tests for the new multi-handler action system with Immer integration
 */

import { describe, test, expect, beforeEach } from 'vitest';
import type { ActionHandler, ValidationResult } from '../../services/action-handler.interface.mjs';
import { registerAction, getHandlers, clearAllHandlers } from '../../services/multi-handler-registry.mjs';
import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';

describe('ActionHandler Registration and Priority System', () => {
  beforeEach(() => {
    // Clear all handlers before each test
    clearAllHandlers();
  });

  test('should register a single handler', () => {
    const handler: ActionHandler = {
      priority: 0,
      validate: async () => ({ valid: true })
    };

    registerAction('test-action', handler);
    const handlers = getHandlers('test-action');

    expect(handlers).toHaveLength(1);
    expect(handlers[0]).toBe(handler);
  });

  test('should register multiple handlers for the same action', () => {
    const handler1: ActionHandler = {
      priority: 0,
      validate: async () => ({ valid: true })
    };

    const handler2: ActionHandler = {
      priority: 100,
      validate: async () => ({ valid: true })
    };

    registerAction('test-action', handler1);
    registerAction('test-action', handler2);
    const handlers = getHandlers('test-action');

    expect(handlers).toHaveLength(2);
  });

  test('should sort handlers by priority (lower numbers first)', () => {
    const lowPriorityHandler: ActionHandler = {
      priority: 0,
      validate: async () => ({ valid: true })
    };

    const mediumPriorityHandler: ActionHandler = {
      priority: 50,
      validate: async () => ({ valid: true })
    };

    const highPriorityHandler: ActionHandler = {
      priority: 100,
      validate: async () => ({ valid: true })
    };

    // Register in random order
    registerAction('test-action', highPriorityHandler);
    registerAction('test-action', lowPriorityHandler);
    registerAction('test-action', mediumPriorityHandler);

    const handlers = getHandlers('test-action');

    expect(handlers).toHaveLength(3);
    expect(handlers[0].priority).toBe(0);  // Low priority (core) first
    expect(handlers[1].priority).toBe(50); // Medium priority second
    expect(handlers[2].priority).toBe(100); // High priority (plugin) last
  });

  test('should handle handlers with undefined priority (default to 0)', () => {
    const handlerWithoutPriority: ActionHandler = {
      validate: async () => ({ valid: true })
    };

    const handlerWithPriority: ActionHandler = {
      priority: 10,
      validate: async () => ({ valid: true })
    };

    registerAction('test-action', handlerWithPriority);
    registerAction('test-action', handlerWithoutPriority);

    const handlers = getHandlers('test-action');

    expect(handlers).toHaveLength(2);
    expect(handlers[0].priority || 0).toBe(0);  // Undefined priority should be first
    expect(handlers[1].priority).toBe(10);     // Explicit priority second
  });

  test('should return empty array for unregistered action', () => {
    const handlers = getHandlers('nonexistent-action');
    expect(handlers).toHaveLength(0);
  });

  test('should handle core and plugin handlers correctly', () => {
    const coreHandler: ActionHandler = {
      priority: 0, // Core handler
      validate: async () => ({ valid: true })
    };

    const pluginHandler: ActionHandler = {
      pluginId: 'test-plugin',
      priority: 100, // Plugin handler
      validate: async () => ({ valid: true })
    };

    registerAction('test-action', pluginHandler);
    registerAction('test-action', coreHandler);

    const handlers = getHandlers('test-action');

    expect(handlers).toHaveLength(2);
    expect(handlers[0].priority).toBe(0);     // Core first
    expect(handlers[0].pluginId).toBeUndefined();
    expect(handlers[1].priority).toBe(100);   // Plugin second
    expect(handlers[1].pluginId).toBe('test-plugin');
  });

  test('should preserve handler properties', () => {
    const handler: ActionHandler = {
      pluginId: 'test-plugin',
      priority: 50,
      requiresManualApproval: true,
      gmOnly: true,
      validate: async () => ({ valid: true }),
      execute: async () => {},
      approvalMessage: () => 'Test approval message'
    };

    registerAction('test-action', handler);
    const handlers = getHandlers('test-action');

    expect(handlers[0].pluginId).toBe('test-plugin');
    expect(handlers[0].priority).toBe(50);
    expect(handlers[0].requiresManualApproval).toBe(true);
    expect(handlers[0].gmOnly).toBe(true);
    expect(handlers[0].validate).toBe(handler.validate);
    expect(handlers[0].execute).toBe(handler.execute);
    expect(handlers[0].approvalMessage).toBe(handler.approvalMessage);
  });
});

describe('ActionHandler Interface Validation', () => {
  beforeEach(() => {
    // Clear all handlers before each test
    clearAllHandlers();
  });

  test('should accept handler with only validate function', () => {
    const handler: ActionHandler = {
      validate: async (_request: GameActionRequest, _gameState: ServerGameStateWithVirtuals): Promise<ValidationResult> => {
        return { valid: true };
      }
    };

    registerAction('test-action', handler);
    const handlers = getHandlers('test-action');
    expect(handlers).toHaveLength(1);
  });

  test('should accept handler with only execute function', () => {
    const handler: ActionHandler = {
      execute: async (_request: GameActionRequest, _draft: ServerGameStateWithVirtuals): Promise<void> => {
        // Test execute function
      }
    };

    registerAction('test-action', handler);
    const handlers = getHandlers('test-action');
    expect(handlers).toHaveLength(1);
  });

  test('should accept handler with all optional properties', () => {
    const handler: ActionHandler = {
      pluginId: 'test-plugin',
      priority: 50,
      requiresManualApproval: true,
      gmOnly: false,
      validate: async () => ({ valid: true }),
      execute: async () => {},
      approvalMessage: (request) => `Test message for ${request.action}`
    };

    registerAction('test-action', handler);
    const handlers = getHandlers('test-action');
    expect(handlers).toHaveLength(1);
    expect(handlers[0]).toEqual(handler);
  });
});