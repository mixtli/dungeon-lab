import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RollRequestService, type RollData, type RollRequestSpec } from '../roll-request.service.mts';
import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';

// Mock the socket store
const mockEmit = vi.fn();
const mockSocketStore = {
  socket: { connected: true },
  connected: true,
  emit: mockEmit
};

vi.mock('../stores/socket.store.mts', () => ({
  useSocketStore: () => mockSocketStore
}));

describe('RollRequestService', () => {
  let service: RollRequestService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RollRequestService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('sendRollRequest', () => {
    it('should send roll request and return promise', async () => {
      const rollData: RollData = {
        message: 'Fire Bolt attack',
        dice: [{ sides: 20, quantity: 1 }],
        metadata: { spellId: 'fire-bolt' }
      };

      const requestPromise = service.sendRollRequest('player1', 'spell-attack', rollData);

      // Verify WebSocket emission
      expect(mockEmit).toHaveBeenCalledWith('roll:request', {
        id: expect.stringMatching(/^roll_\d+_.{9}$/),
        playerId: 'player1',
        rollType: 'spell-attack',
        message: 'Fire Bolt attack',
        dice: [{ sides: 20, quantity: 1 }],
        metadata: {
          spellId: 'fire-bolt'
        }
      });

      // Simulate server response  
      const mockResult: RollServerResult = {
        id: mockEmit.mock.calls[0][1].id, // Same ID flows through
        rollType: 'spell-attack',
        pluginId: 'dnd-5e-2024',
        dice: [{ sides: 20, quantity: 1 }],
        recipients: 'gm',
        arguments: { customModifier: 0 },
        modifiers: [],
        metadata: {
          title: 'Fire Bolt attack',
          spellId: 'fire-bolt'
        },
        results: [{ sides: 20, quantity: 1, results: [18] }],
        userId: 'player1',
        timestamp: new Date()
      };

      // Resolve the promise by handling the result
      service.handleRollResult(mockResult);

      const result = await requestPromise;
      expect(result).toEqual(mockResult);
    });

    it('should use default message when none provided', async () => {
      const rollData: RollData = {
        dice: [{ sides: 6, quantity: 1 }]
      };

      service.sendRollRequest('player1', 'damage', rollData);

      expect(mockEmit).toHaveBeenCalledWith('roll:request', expect.objectContaining({
        message: 'Roll damage'
      }));
    });

    it('should throw error when WebSocket not connected', async () => {
      mockSocketStore.socket = null;

      const rollData: RollData = {
        dice: [{ sides: 20, quantity: 1 }]
      };

      await expect(
        service.sendRollRequest('player1', 'attack', rollData)
      ).rejects.toThrow('WebSocket not connected - cannot send roll request');
    });

    it('should timeout when no response received', async () => {
      const rollData: RollData = {
        dice: [{ sides: 20, quantity: 1 }]
      };

      const requestPromise = service.sendRollRequest('player1', 'attack', rollData, 100);

      // Wait for timeout
      await expect(requestPromise).rejects.toThrow(
        'Roll request timeout for player player1 (attack)'
      );
    }, 1000);

    it('should generate unique request IDs', () => {
      const rollData: RollData = {
        dice: [{ sides: 20, quantity: 1 }]
      };

      service.sendRollRequest('player1', 'attack1', rollData);
      service.sendRollRequest('player2', 'attack2', rollData);

      expect(mockEmit).toHaveBeenCalledTimes(2);
      const requestId1 = mockEmit.mock.calls[0][1].requestId;
      const requestId2 = mockEmit.mock.calls[1][1].requestId;

      expect(requestId1).not.toEqual(requestId2);
      expect(requestId1).toMatch(/^roll_\d+_.{9}$/);
      expect(requestId2).toMatch(/^roll_\d+_.{9}$/);
    });
  });

  describe('sendMultipleRollRequests', () => {
    it('should send multiple requests and await all results', async () => {
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

      const resultsPromise = service.sendMultipleRollRequests(requests);

      // Verify both requests were sent
      expect(mockEmit).toHaveBeenCalledTimes(2);
      
      // Simulate responses
      const mockResult1: RollServerResult = {
        id: mockEmit.mock.calls[0][1].id, // Same ID flows through
        rollType: 'saving-throw',
        pluginId: 'dnd-5e-2024',
        dice: [{ sides: 20, quantity: 1 }],
        recipients: 'gm',
        arguments: { customModifier: 0 },
        modifiers: [],
        metadata: {
          title: 'Dex Save'
        },
        results: [{ sides: 20, quantity: 1, results: [15] }],
        userId: 'player1',
        timestamp: new Date()
      };

      const mockResult2: RollServerResult = {
        id: mockEmit.mock.calls[1][1].id, // Same ID flows through
        rollType: 'saving-throw',
        pluginId: 'dnd-5e-2024',
        dice: [{ sides: 20, quantity: 1 }],
        recipients: 'gm',
        arguments: { customModifier: 0 },
        modifiers: [],
        metadata: {
          title: 'Dex Save'
        },
        results: [{ sides: 20, quantity: 1, results: [8] }],
        userId: 'player2',
        timestamp: new Date()
      };

      service.handleRollResult(mockResult1);
      service.handleRollResult(mockResult2);

      const results = await resultsPromise;
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(mockResult1);
      expect(results[1]).toEqual(mockResult2);
    });

    it('should return empty array for empty requests', async () => {
      const results = await service.sendMultipleRollRequests([]);
      expect(results).toEqual([]);
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should handle partial failures with enhanced error', async () => {
      const requests: RollRequestSpec[] = [
        {
          playerId: 'player1',
          rollType: 'save',
          rollData: { dice: [{ sides: 20, quantity: 1 }] }
        }
      ];

      const resultsPromise = service.sendMultipleRollRequests(requests);

      // Don't resolve the promise - let it timeout
      await expect(resultsPromise).rejects.toThrow(/Multi-roll request failed/);
    }, 1000);
  });

  describe('handleRollResult', () => {
    it('should resolve pending request with matching ID', async () => {
      const rollData: RollData = {
        dice: [{ sides: 8, quantity: 1 }]
      };

      const requestPromise = service.sendRollRequest('player1', 'damage', rollData);
      const requestId = mockEmit.mock.calls[0][1].id;

      const mockResult: RollServerResult = {
        id: requestId, // Same ID flows through
        rollType: 'damage',
        pluginId: 'dnd-5e-2024',
        dice: [{ sides: 8, quantity: 1 }],
        recipients: 'gm',
        arguments: { customModifier: 3 },
        modifiers: [],
        metadata: {
          title: 'Damage'
        },
        results: [{ sides: 8, quantity: 1, results: [6] }],
        userId: 'player1',
        timestamp: new Date()
      };

      service.handleRollResult(mockResult);

      const result = await requestPromise;
      expect(result).toEqual(mockResult);
    });

    it('should ignore results without ID', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mockResult: RollServerResult = {
        id: '', // No ID
        rollType: 'damage',
        pluginId: 'dnd-5e-2024',
        dice: [{ sides: 8, quantity: 1 }],
        recipients: 'gm',
        arguments: { customModifier: 0 },
        modifiers: [],
        metadata: { title: 'Damage' },
        results: [{ sides: 8, quantity: 1, results: [6] }],
        userId: 'player1',
        timestamp: new Date()
      };

      service.handleRollResult(mockResult);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[RollRequestService] Received roll result without ID:',
        mockResult
      );
      
      consoleSpy.mockRestore();
    });

    it('should log debug message for non-requested rolls', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const mockResult: RollServerResult = {
        id: 'unknown-roll-id', // Player-initiated roll, not GM-requested
        rollType: 'damage',
        pluginId: 'dnd-5e-2024', 
        dice: [{ sides: 8, quantity: 1 }],
        recipients: 'gm',
        arguments: { customModifier: 0 },
        modifiers: [],
        metadata: {
          title: 'Damage'
        },
        results: [{ sides: 8, quantity: 1, results: [6] }],
        userId: 'player1',
        timestamp: new Date()
      };

      service.handleRollResult(mockResult);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[RollRequestService] Received result for non-requested roll:',
        'unknown-roll-id'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('cancelRequest', () => {
    it('should cancel specific pending request', async () => {
      const rollData: RollData = {
        dice: [{ sides: 20, quantity: 1 }]
      };

      const requestPromise = service.sendRollRequest('player1', 'attack', rollData);
      const requestId = mockEmit.mock.calls[0][1].id;

      service.cancelRequest(requestId);

      await expect(requestPromise).rejects.toThrow('Roll request canceled');
    });

    it('should ignore cancel for non-existent request', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      service.cancelRequest('non-existent-id');

      // Should not log anything if request doesn't exist
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Canceling roll request')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('cancelAllRequests', () => {
    it('should cancel all pending requests', async () => {
      const rollData: RollData = {
        dice: [{ sides: 20, quantity: 1 }]
      };

      const promise1 = service.sendRollRequest('player1', 'attack1', rollData);
      const promise2 = service.sendRollRequest('player2', 'attack2', rollData);

      service.cancelAllRequests();

      await expect(promise1).rejects.toThrow('All roll requests canceled');
      await expect(promise2).rejects.toThrow('All roll requests canceled');
    });
  });

  describe('getPendingRequestInfo', () => {
    it('should return info about pending requests', () => {
      const rollData: RollData = {
        dice: [{ sides: 20, quantity: 1 }]
      };

      service.sendRollRequest('player1', 'attack', rollData);
      service.sendRollRequest('player2', 'save', rollData);

      const info = service.getPendingRequestInfo();

      expect(info).toHaveLength(2);
      expect(info[0]).toMatchObject({
        requestId: expect.stringMatching(/^roll_\d+_.{9}$/),
        playerId: 'player1',
        rollType: 'attack',
        ageMs: expect.any(Number)
      });
      expect(info[1]).toMatchObject({
        requestId: expect.stringMatching(/^roll_\d+_.{9}$/),
        playerId: 'player2',
        rollType: 'save',
        ageMs: expect.any(Number)
      });
    });

    it('should return empty array when no pending requests', () => {
      const info = service.getPendingRequestInfo();
      expect(info).toEqual([]);
    });
  });

  describe('cleanupExpiredRequests', () => {
    it('should clean up expired requests', async () => {
      // Mock old timestamp
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => 1000000); // Start at 1 second

      const rollData: RollData = {
        dice: [{ sides: 20, quantity: 1 }]
      };

      const requestPromise = service.sendRollRequest('player1', 'attack', rollData);

      // Move forward in time beyond cleanup threshold (2+ minutes)
      Date.now = vi.fn(() => 1000000 + 130000); // +130 seconds

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      service.cleanupExpiredRequests();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[RollRequestService] Cleaning up expired request:',
        expect.objectContaining({
          ageMs: 130000
        })
      );

      await expect(requestPromise).rejects.toThrow('Request expired during cleanup');

      consoleSpy.mockRestore();
      Date.now = originalDateNow;
    });

    it('should not clean up recent requests', () => {
      const rollData: RollData = {
        dice: [{ sides: 20, quantity: 1 }]
      };

      service.sendRollRequest('player1', 'attack', rollData);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      service.cleanupExpiredRequests();

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Cleaning up expired request')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('destroy', () => {
    it('should cancel all requests and stop cleanup timer', async () => {
      const rollData: RollData = {
        dice: [{ sides: 20, quantity: 1 }]
      };

      const requestPromise = service.sendRollRequest('player1', 'attack', rollData);

      service.destroy();

      await expect(requestPromise).rejects.toThrow('All roll requests canceled');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockSocketStore.socket = { connected: true };
      mockSocketStore.connected = true;
    });

    it('should handle WebSocket disconnection during request', async () => {
      const rollData: RollData = {
        dice: [{ sides: 20, quantity: 1 }]
      };

      // Start request normally
      const requestPromise = service.sendRollRequest('player1', 'attack', rollData);

      // Simulate disconnection
      mockSocketStore.socket = null;
      mockSocketStore.connected = false;

      // The promise should still be pending, but new requests should fail
      await expect(
        service.sendRollRequest('player2', 'attack', rollData)
      ).rejects.toThrow('WebSocket not connected');

      // Original request can still be resolved
      const mockResult: RollServerResult = {
        id: mockEmit.mock.calls[0][1].id, // Same ID flows through
        rollType: 'attack',
        pluginId: 'dnd-5e-2024',
        dice: [{ sides: 20, quantity: 1 }],
        recipients: 'gm',
        arguments: { customModifier: 0 },
        modifiers: [],
        metadata: {
          title: 'Attack'
        },
        results: [{ sides: 20, quantity: 1, results: [15] }],
        userId: 'player1',
        timestamp: new Date()
      };

      service.handleRollResult(mockResult);
      const result = await requestPromise;
      expect(result).toEqual(mockResult);
    });
  });
});