import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActionContextImpl, createActionContext } from '../action-context.service.mts';
import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { RollData, RollRequestSpec } from '@dungeon-lab/shared/interfaces/action-context.interface.mjs';

// Mock the RollRequestService
const mockRollRequestService = {
  sendRollRequest: vi.fn(),
  sendMultipleRollRequests: vi.fn(),
  cancelRequest: vi.fn()
};

vi.mock('./roll-request.service.mts', () => ({
  RollRequestService: vi.fn(() => mockRollRequestService)
}));

// Mock the chat store - need to mock this before importing
vi.mock('../stores/chat.store.mts', () => ({
  useChatStore: vi.fn(() => ({
    sendMessage: vi.fn()
  }))
}));

describe('ActionContextImpl', () => {
  let actionContext: ActionContextImpl;
  let mockGameState: ServerGameStateWithVirtuals;
  let mockChatStore: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked chat store
    const { useChatStore } = await vi.importMock('../stores/chat.store.mts') as any;
    mockChatStore = useChatStore();
    
    // Create mock game state
    mockGameState = {
      documents: {},
      virtuals: {}
    } as ServerGameStateWithVirtuals;

    actionContext = new ActionContextImpl(mockGameState, mockRollRequestService as any);
  });

  afterEach(() => {
    actionContext.cleanup();
  });

  describe('constructor', () => {
    it('should initialize with game state and roll request service', () => {
      expect(actionContext.gameState).toBe(mockGameState);
      expect(actionContext).toBeInstanceOf(ActionContextImpl);
    });
  });

  describe('sendRollRequest', () => {
    it('should delegate to RollRequestService and return result', async () => {
      const rollData: RollData = {
        message: 'Fire Bolt attack',
        dice: [{ sides: 20, quantity: 1 }],
        metadata: { spellId: 'fire-bolt' }
      };

      const mockResult: RollServerResult = {
        rollId: 'test-roll-id',
        rollType: 'spell-attack',
        pluginId: 'dnd-5e-2024',
        dice: [{ sides: 20, quantity: 1 }],
        recipients: 'gm',
        arguments: { customModifier: 0 },
        modifiers: [],
        metadata: { title: 'Fire Bolt attack' },
        results: [{ sides: 20, quantity: 1, results: [15] }],
        userId: 'player1',
        timestamp: new Date()
      };

      mockRollRequestService.sendRollRequest.mockResolvedValueOnce(mockResult);

      const result = await actionContext.sendRollRequest('player1', 'spell-attack', rollData);

      expect(mockRollRequestService.sendRollRequest).toHaveBeenCalledWith(
        'player1',
        'spell-attack',
        rollData
      );
      expect(result).toBe(mockResult);
    });

    it('should handle roll request errors', async () => {
      const rollData: RollData = {
        dice: [{ sides: 20, quantity: 1 }]
      };

      const error = new Error('Roll request timeout');
      mockRollRequestService.sendRollRequest.mockRejectedValueOnce(error);

      await expect(
        actionContext.sendRollRequest('player1', 'attack', rollData)
      ).rejects.toThrow('Roll request timeout');
    });

    it('should log roll request details', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const rollData: RollData = {
        message: 'Test roll',
        dice: [{ sides: 6, quantity: 1 }]
      };

      const mockResult: RollServerResult = {
        rollId: 'test-id',
        rollType: 'test',
        pluginId: 'test-plugin',
        dice: [{ sides: 6, quantity: 1 }],
        recipients: 'gm',
        arguments: { customModifier: 0 },
        modifiers: [],
        metadata: { title: 'Test' },
        results: [{ sides: 6, quantity: 1, results: [4] }],
        userId: 'player1',
        timestamp: new Date()
      };

      mockRollRequestService.sendRollRequest.mockResolvedValueOnce(mockResult);

      await actionContext.sendRollRequest('player1', 'test', rollData);

      expect(consoleSpy).toHaveBeenCalledWith('[ActionContext] Sending roll request:', {
        playerId: 'player1',
        rollType: 'test',
        message: 'Test roll'
      });

      consoleSpy.mockRestore();
    });
  });

  describe('sendMultipleRollRequests', () => {
    it('should delegate to RollRequestService for multiple requests', async () => {
      const requests: RollRequestSpec[] = [
        {
          playerId: 'player1',
          rollType: 'saving-throw',
          rollData: { dice: [{ sides: 20, quantity: 1 }], message: 'Dex Save' }
        },
        {
          playerId: 'player2',
          rollType: 'saving-throw',
          rollData: { dice: [{ sides: 20, quantity: 1 }], message: 'Dex Save' }
        }
      ];

      const mockResults: RollServerResult[] = [
        {
          rollId: 'roll1',
          rollType: 'saving-throw',
          pluginId: 'dnd-5e-2024',
          dice: [{ sides: 20, quantity: 1 }],
          recipients: 'gm',
          arguments: { customModifier: 0 },
          modifiers: [],
          metadata: { title: 'Dex Save' },
          results: [{ sides: 20, quantity: 1, results: [15] }],
          userId: 'player1',
          timestamp: new Date()
        },
        {
          rollId: 'roll2',
          rollType: 'saving-throw',
          pluginId: 'dnd-5e-2024',
          dice: [{ sides: 20, quantity: 1 }],
          recipients: 'gm',
          arguments: { customModifier: 0 },
          modifiers: [],
          metadata: { title: 'Dex Save' },
          results: [{ sides: 20, quantity: 1, results: [8] }],
          userId: 'player2',
          timestamp: new Date()
        }
      ];

      mockRollRequestService.sendMultipleRollRequests.mockResolvedValueOnce(mockResults);

      const results = await actionContext.sendMultipleRollRequests(requests);

      expect(mockRollRequestService.sendMultipleRollRequests).toHaveBeenCalledWith(requests);
      expect(results).toBe(mockResults);
    });

    it('should handle multiple roll request errors', async () => {
      const requests: RollRequestSpec[] = [
        {
          playerId: 'player1',
          rollType: 'save',
          rollData: { dice: [{ sides: 20, quantity: 1 }] }
        }
      ];

      const error = new Error('Multi-roll request failed');
      mockRollRequestService.sendMultipleRollRequests.mockRejectedValueOnce(error);

      await expect(
        actionContext.sendMultipleRollRequests(requests)
      ).rejects.toThrow('Multi-roll request failed');
    });

    it('should return empty array for empty requests', async () => {
      mockRollRequestService.sendMultipleRollRequests.mockResolvedValueOnce([]);

      const results = await actionContext.sendMultipleRollRequests([]);

      expect(results).toEqual([]);
      expect(mockRollRequestService.sendMultipleRollRequests).toHaveBeenCalledWith([]);
    });
  });

  describe('sendChatMessage', () => {
    it('should attempt to send message and handle errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const message = 'Fire Bolt cast successfully!';

      // Should not throw even if chat store fails
      expect(() => {
        actionContext.sendChatMessage(message);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('[ActionContext] Sending chat message:', {
        message: 'Fire Bolt cast successfully!',
        options: undefined
      });

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle recipient options in logging', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const message = 'Private message to player';
      const options = {
        recipientId: 'player1',
        recipientType: 'user' as const
      };

      actionContext.sendChatMessage(message, options);

      expect(consoleSpy).toHaveBeenCalledWith('[ActionContext] Sending chat message:', {
        message: 'Private message to player',
        options: { recipientId: 'player1', recipientType: 'user' }
      });

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle chat store errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockChatStore.sendMessage.mockImplementationOnce(() => {
        throw new Error('Chat store error');
      });

      // Should not throw - chat errors shouldn't break action execution
      expect(() => {
        actionContext.sendChatMessage('Test message');
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ActionContext] Failed to send chat message:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle long messages in logging', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const longMessage = 'A'.repeat(150);

      actionContext.sendChatMessage(longMessage);

      expect(consoleSpy).toHaveBeenCalledWith('[ActionContext] Sending chat message:', {
        message: 'A'.repeat(100) + '...',
        options: undefined
      });

      consoleSpy.mockRestore();
    });
  });

  describe('requestGMConfirmation', () => {
    it('should return true for auto-approval (placeholder implementation)', async () => {
      const message = 'Cast spell with higher level slot?';

      const result = await actionContext.requestGMConfirmation(message);

      expect(result).toBe(true);
    });

    it('should log confirmation request', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const message = 'Test confirmation';

      await actionContext.requestGMConfirmation(message);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ActionContext] GM confirmation requested:',
        'Test confirmation'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ActionContext] Auto-approving GM confirmation (placeholder implementation)'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should cancel active requests and clear tracking', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Simulate some active requests
      (actionContext as any).activeRequests.add('request1');
      (actionContext as any).activeRequests.add('request2');

      actionContext.cleanup();

      expect(mockRollRequestService.cancelRequest).toHaveBeenCalledWith('request1');
      expect(mockRollRequestService.cancelRequest).toHaveBeenCalledWith('request2');
      expect((actionContext as any).activeRequests.size).toBe(0);

      expect(consoleSpy).toHaveBeenCalledWith('[ActionContext] Cleaning up action context:', {
        activeRequestCount: 2
      });

      consoleSpy.mockRestore();
    });
  });

  describe('createActionContext factory', () => {
    it('should create ActionContextImpl with provided dependencies', () => {
      const context = createActionContext(mockGameState, mockRollRequestService as any);

      expect(context).toBeInstanceOf(ActionContextImpl);
      expect(context.gameState).toBe(mockGameState);
    });

    it('should create ActionContextImpl with default RollRequestService', () => {
      const context = createActionContext(mockGameState);

      expect(context).toBeInstanceOf(ActionContextImpl);
      expect(context.gameState).toBe(mockGameState);
    });
  });
});