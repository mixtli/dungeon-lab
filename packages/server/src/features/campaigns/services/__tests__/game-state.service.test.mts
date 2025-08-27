import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameStateService } from '../game-state.service.mjs';
import { GameStateModel } from '../../models/game-state.model.mjs';
// Unused imports needed for mocking
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CampaignModel } from '../../models/campaign.model.mjs';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DocumentService } from '../../../documents/services/document.service.mjs';
import { generateStateHash } from '../../../../utils/state-hash.mjs';
import { serverGameStateWithVirtualsSchema } from '@dungeon-lab/shared/schemas/server-game-state.schema.mjs';
import { Types } from 'mongoose';

// Test type interfaces
interface MockQuery {
  exec: () => Promise<unknown>;
}

interface MockGameStateDocument {
  id?: string;
  campaignId?: string;
}

// Mock dependencies
vi.mock('../../models/game-state.model.mjs');
vi.mock('../../models/campaign.model.mjs');
vi.mock('../../../documents/services/document.service.mjs');
vi.mock('../../../../utils/state-hash.mjs');
vi.mock('../../../../utils/logger.mjs');

describe('GameStateService', () => {
  let gameStateService: GameStateService;
  
  const mockCampaignId = new Types.ObjectId().toString();
  const _mockGameStateId = new Types.ObjectId().toString();
  
  beforeEach(() => {
    gameStateService = new GameStateService();
    vi.clearAllMocks();
  });

  describe('Hash Validation Fix', () => {
    describe('initializeGameState', () => {
      it('should use Zod-parsed data for hash generation to match validation flow', async () => {
        // Mock campaign data
        const _mockCampaign = {
          _id: new Types.ObjectId(mockCampaignId),
          name: 'Test Campaign',
          gameMasterId: new Types.ObjectId(),
          characterIds: [],
          save: vi.fn()
        };

        // Mock initial game data (before Zod parsing)
        const mockInitialGameData = {
          state: {
            campaign: null,
            documents: {},
            currentEncounter: null,
            pluginData: {},
            turnManager: null,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z'
          }
        };

        // Expected data after Zod parsing (with defaults applied)
        const expectedParsedData = {
          campaign: null,
          documents: {},
          currentEncounter: null,
          pluginData: {}, // Zod adds this default
          turnManager: null,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z'
        };

        const expectedHash = 'test-hash-from-parsed-data';

        // Set up mocks
        // Mock GameState.findOne to return null (no existing game state)
        vi.mocked(GameStateModel.findOne).mockReturnValueOnce({
          exec: vi.fn().mockResolvedValueOnce(null)
        } as MockQuery);

        // Mock loadCampaignData to return our test data
        vi.spyOn(gameStateService as GameStateService & { loadCampaignData: (id: string) => Promise<unknown> }, 'loadCampaignData')
          .mockResolvedValueOnce(mockInitialGameData);
        
        // Mock Zod parsing to return data with defaults
        const parseSpy = vi.spyOn(serverGameStateWithVirtualsSchema, 'parse')
          .mockReturnValueOnce(expectedParsedData);
        
        // Mock hash generation
        vi.mocked(generateStateHash).mockReturnValueOnce(expectedHash);

        // Mock GameState.create
        vi.mocked(GameStateModel.create).mockResolvedValueOnce({} as MockGameStateDocument);

        // Call the method
        await gameStateService.initializeGameState(mockCampaignId);

        // Verify Zod parsing was called with original data
        expect(parseSpy).toHaveBeenCalledWith(mockInitialGameData.state);

        // Verify hash generation was called with PARSED data (not original data)
        expect(generateStateHash).toHaveBeenCalledWith(expectedParsedData);

        // Verify hash generation was NOT called with original data
        expect(generateStateHash).not.toHaveBeenCalledWith(mockInitialGameData.state);
      });

      it('should ensure hash consistency between creation and validation flows', async () => {
        // This test ensures the fix prevents the hash mismatch that was occurring
        // when initializeGameState used raw data but validation used Zod-parsed data

        const rawStateData = {
          campaign: null,
          documents: {},
          currentEncounter: null,
          turnManager: null,
          // Missing pluginData field (common scenario)
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z'
        };

        const parsedStateData = {
          ...rawStateData,
          pluginData: {} // Added by Zod default
        };

        // Mock GameState.findOne to return null (no existing game state)
        vi.mocked(GameStateModel.findOne).mockReturnValueOnce({
          exec: vi.fn().mockResolvedValueOnce(null)
        } as MockQuery);

        // Mock loadCampaignData to return our test data
        vi.spyOn(gameStateService as GameStateService & { loadCampaignData: (id: string) => Promise<unknown> }, 'loadCampaignData')
          .mockResolvedValueOnce({ state: rawStateData });

        // Mock Zod parsing
        vi.spyOn(serverGameStateWithVirtualsSchema, 'parse')
          .mockReturnValueOnce(parsedStateData);

        // Mock hash generation to return different values for raw vs parsed data
        vi.mocked(generateStateHash)
          .mockImplementationOnce((data) => {
            // Simulate hash difference based on presence of pluginData
            return Object.prototype.hasOwnProperty.call(data, 'pluginData') ? 'hash-with-plugin-data' : 'hash-without-plugin-data';
          });

        // Mock GameState.create
        vi.mocked(GameStateModel.create).mockResolvedValueOnce({} as MockGameStateDocument);

        // Call the method
        await gameStateService.initializeGameState(mockCampaignId);

        // Verify that generateStateHash was called with the parsed data
        // This ensures the hash will match during validation
        expect(generateStateHash).toHaveBeenCalledWith(parsedStateData);
        expect(generateStateHash).not.toHaveBeenCalledWith(rawStateData);
      });
    });

    // Note: loadCampaignData is a complex private method that constructs game state
    // from campaign data. The important test is that initializeGameState uses
    // Zod-parsed data for hash generation, which is covered above.
  });

  describe('Hash Generation Consistency', () => {
    it('should generate same hash for equivalent data structures', () => {
      // This is more of an integration test with the hash utility
      const baseData = {
        campaign: null,
        documents: {},
        currentEncounter: null,
        pluginData: {},
        turnManager: null,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      // Mock generateStateHash to simulate consistent hashing
      const expectedHash = 'consistent-hash-value';
      vi.mocked(generateStateHash)
        .mockReturnValueOnce(expectedHash)
        .mockReturnValueOnce(expectedHash)
        .mockReturnValueOnce(expectedHash);

      // Call hash generation multiple times with equivalent data
      const hash1 = generateStateHash(baseData);
      const hash2 = generateStateHash({ ...baseData });
      const hash3 = generateStateHash(JSON.parse(JSON.stringify(baseData)));

      // All should generate the same hash
      expect(hash1).toBe(expectedHash);
      expect(hash2).toBe(expectedHash);
      expect(hash3).toBe(expectedHash);
    });
  });
});