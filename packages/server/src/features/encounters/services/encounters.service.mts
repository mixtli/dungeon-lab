import { Types } from 'mongoose';
import { logger } from '../../../utils/logger.mjs';
import { IEncounter, IToken, EncounterStatusType } from '@dungeon-lab/shared/types/index.mjs';
import { EncounterModel } from '../models/encounter.model.mjs';
import { CampaignModel } from '../../campaigns/models/campaign.model.mjs';
import { MapModel } from '../../maps/models/map.model.mjs';
import { DocumentService } from '../../documents/services/document.service.mjs';
import { z } from 'zod';
import {
  createEncounterSchema,
  updateEncounterSchema,
  EncounterStatusEnum
} from '@dungeon-lab/shared/schemas/encounters.schema.mjs';

// Type definitions for service methods
type CreateEncounterData = z.infer<typeof createEncounterSchema>;
type UpdateEncounterData = z.infer<typeof updateEncounterSchema>;


export class EncounterService {
  // ============================================================================
  // ENCOUNTER CRUD OPERATIONS
  // ============================================================================

  /**
   * Get encounters accessible to a user
   */
  async getEncounters(
    userId: string,
    isAdmin: boolean,
    campaignId?: string
  ): Promise<IEncounter[]> {
    try {
      const query: Record<string, unknown> = {};

      if (campaignId) {
        // If campaignId is provided, filter by campaign and check permissions
        const campaignObjectId = new Types.ObjectId(campaignId);
        query.campaignId = campaignObjectId;

        // Check if user has access to this campaign
        const hasAccess = await this.checkCampaignAccess(userId, campaignId, isAdmin);
        if (!hasAccess) {
          return [];
        }
      } else if (!isAdmin) {
        // If no campaignId and not admin, get encounters from campaigns user has access to
        const accessibleCampaigns = await this.getAccessibleCampaigns(userId);
        query.campaignId = { $in: accessibleCampaigns };
      }

      const encounters = await EncounterModel.find(query)
        .sort({ updatedAt: -1 })
        .exec();

      return encounters.map(encounter => encounter.toObject());
    } catch (error) {
      logger.error('Error getting encounters:', error);
      throw new Error('Failed to get encounters');
    }
  }

  /**
   * Get a specific encounter by ID
   */
  async getEncounter(
    encounterId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<IEncounter> {
    try {
      if (!Types.ObjectId.isValid(encounterId)) {
        throw new Error('Encounter not found');
      }

      const encounter = await EncounterModel.findById(encounterId)
        .exec();

      if (!encounter) {
        throw new Error('Encounter not found');
      }

      // Check permissions
      const hasAccess = await this.checkEncounterAccess(encounterId, userId, isAdmin);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      return encounter.toObject();
    } catch (error) {
      if (error instanceof Error && 
          (error.message === 'Encounter not found' || error.message === 'Access denied')) {
        throw error;
      }
      logger.error('Error getting encounter:', error);
      throw new Error('Failed to get encounter');
    }
  }

  /**
   * Create a new encounter
   */
  async createEncounter(
    data: CreateEncounterData,
    userId: string
  ): Promise<IEncounter> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const campaignObjectId = new Types.ObjectId(data.campaignId);
      const mapObjectId = new Types.ObjectId(data.mapId);

      // Verify campaign exists and user is GM
      const campaign = await CampaignModel.findById(campaignObjectId).exec();
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.gameMasterId?.toString() !== userId) {
        throw new Error('Only the game master can create encounters');
      }

      // Verify map exists and populate virtual fields
      const map = await MapModel.findById(mapObjectId).populate('image').populate('thumbnail').exec();
      if (!map) {
        throw new Error('Map not found');
      }

      // Create encounter
      const encounterData = {
        ...data,
        campaignId: campaignObjectId,
        mapId: mapObjectId,
        currentMap: map.toObject(), // Copy map data to encounter for GM modifications
        createdBy: userObjectId,
        updatedBy: userObjectId,
        tokens: [],
        initiative: {
          entries: [],
          currentTurn: 0,
          currentRound: 1,
          isActive: false
        },
        effects: []
      };

      const encounter = new EncounterModel(encounterData);
      await encounter.save();

      return encounter.toObject();
    } catch (error) {
      if (error instanceof Error && 
          ['Campaign not found', 'Only the game master can create encounters', 'Map not found'].includes(error.message)) {
        throw error;
      }
      logger.error('Error creating encounter:', error);
      throw new Error('Failed to create encounter');
    }
  }

  /**
   * Update an encounter
   */
  async updateEncounter(
    encounterId: string,
    data: UpdateEncounterData,
    userId: string,
    isAdmin: boolean
  ): Promise<IEncounter> {
    try {
      if (!Types.ObjectId.isValid(encounterId)) {
        throw new Error('Encounter not found');
      }

      // Check permissions
      const hasAccess = await this.checkEncounterModifyAccess(encounterId, userId, isAdmin);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      const userObjectId = new Types.ObjectId(userId);
      const updateData = {
        ...data,
        updatedBy: userObjectId
      };

      const updatedEncounter = await EncounterModel.findByIdAndUpdate(
        encounterId, 
        updateData, 
        { new: true }
      ).exec();

      if (!updatedEncounter) {
        throw new Error('Encounter not found');
      }

      return updatedEncounter;
    } catch (error) {
      if (error instanceof Error && 
          ['Encounter not found', 'Access denied'].includes(error.message)) {
        throw error;
      }
      logger.error('Error updating encounter:', error);
      throw new Error('Failed to update encounter');
    }
  }

  /**
   * Delete an encounter
   */
  async deleteEncounter(
    encounterId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(encounterId)) {
        throw new Error('Encounter not found');
      }

      // Check permissions
      const hasAccess = await this.checkEncounterModifyAccess(encounterId, userId, isAdmin);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      // Note: Tokens are now embedded in encounters, so they're deleted automatically

      // Delete the encounter
      const deletedEncounter = await EncounterModel.findByIdAndDelete(encounterId).exec();
      if (!deletedEncounter) {
        throw new Error('Encounter not found');
      }
    } catch (error) {
      if (error instanceof Error && 
          ['Encounter not found', 'Access denied'].includes(error.message)) {
        throw error;
      }
      logger.error('Error deleting encounter:', error);
      throw new Error('Failed to delete encounter');
    }
  }

  // ============================================================================
  // ENCOUNTER STATUS MANAGEMENT
  // ============================================================================

  /**
   * Update encounter status
   */
  async updateEncounterStatus(
    encounterId: string,
    status: string,
    userId: string,
    isAdmin: boolean
  ): Promise<IEncounter> {
    try {
      // Validate status
      const validStatuses = EncounterStatusEnum.options;
      if (!validStatuses.includes(status as EncounterStatusType)) {
        throw new Error('Invalid status');
      }

      return await this.updateEncounter(
        encounterId,
        { status: status as EncounterStatusType, updatedBy: userId },
        userId,
        isAdmin
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid status') {
        throw error;
      }
      throw error; // Re-throw other errors from updateEncounter
    }
  }


  // ============================================================================
  // REAL-TIME OPERATIONS
  // ============================================================================

  // NOTE: Token operations moved to game state system
  // Real-time token movement will be handled through game state updates

  // NOTE: Token position validation moved to game state system

  /**
   * Get complete encounter state for real-time synchronization
   */
  async getEncounterState(
    encounterId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<{
    encounter: IEncounter;
    tokens: IToken[];
    permissions: {
      canView: boolean;
      canModify: boolean;
      canControl: string[]; // Array of token IDs user can control
    };
  }> {
    try {
      // Get encounter data
      const encounter = await this.getEncounter(encounterId, userId, isAdmin);
      
      // Note: Tokens are now embedded in encounters
      const tokens = encounter.tokens || [];

      // Calculate permissions
      const permissions = await this.calculateUserPermissions(encounterId, userId, isAdmin, tokens);

      return {
        encounter,
        tokens,
        permissions
      };
    } catch (error) {
      logger.error('Error getting encounter state:', error);
      throw error; // Re-throw to preserve specific error messages
    }
  }

  /**
   * Calculate user permissions for an encounter
   */
  private async calculateUserPermissions(
    encounterId: string,
    userId: string,
    isAdmin: boolean,
    tokens: IToken[]
  ): Promise<{
    canView: boolean;
    canModify: boolean;
    canControl: string[];
  }> {
    try {
      const canView = await this.checkEncounterAccess(encounterId, userId, isAdmin);
      const canModify = await this.checkEncounterModifyAccess(encounterId, userId, isAdmin);
      
      // Check which tokens user can control (simplified - will be moved to game state)
      const canControl: string[] = [];
      for (const token of tokens) {
        // For now, players can control their own tokens, GMs can control all
        const hasControl = isAdmin || canModify || 
          (token.isPlayerControlled && token.documentId); // Will need document ownership check
        if (hasControl) {
          canControl.push(token.id);
        }
      }

      return {
        canView,
        canModify,
        canControl
      };
    } catch (error) {
      logger.error('Error calculating user permissions:', error);
      return {
        canView: false,
        canModify: false,
        canControl: []
      };
    }
  }

  // NOTE: Batch token updates moved to game state system

  /**
   * Add participant to encounter (for room management)
   */
  async addParticipant(
    encounterId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<void> {
    try {
      // Verify user has access to the encounter
      const hasAccess = await this.checkEncounterAccess(encounterId, userId, isAdmin);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      // For now, this is just a permission check
      // In the future, we might track active participants in the database
      logger.info(`User ${userId} added as participant to encounter ${encounterId}`);
    } catch (error) {
      logger.error('Error adding participant:', error);
      throw error;
    }
  }

  /**
   * Remove participant from encounter (for room management)
   */
  async removeParticipant(
    encounterId: string,
    userId: string
  ): Promise<void> {
    try {
      // For now, this is just logging
      // In the future, we might track active participants in the database
      logger.info(`User ${userId} removed as participant from encounter ${encounterId}`);
    } catch (error) {
      logger.error('Error removing participant:', error);
      throw error;
    }
  }

  /**
   * Validate if user can perform a specific action on a token
   */
  // NOTE: Token action validation moved to game state system

  // ============================================================================
  // PERMISSION CHECKING METHODS
  // ============================================================================

  /**
   * Check if user has access to view an encounter
   */
  private async checkEncounterAccess(
    encounterId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<boolean> {
    try {
      if (isAdmin) return true;

      const encounter = await EncounterModel.findById(encounterId).exec();
      if (!encounter) {
        throw new Error('Encounter not found');
      }

      return await this.checkCampaignAccess(userId, encounter.campaignId.toString(), isAdmin);
    } catch (error) {
      logger.error('Error checking encounter access:', error);
      return false;
    }
  }

  /**
   * Check if user has access to modify an encounter
   */
  private async checkEncounterModifyAccess(
    encounterId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<boolean> {
    try {
      if (isAdmin) return true;

      const encounter = await EncounterModel.findById(encounterId).exec();
      if (!encounter) {
        throw new Error('Encounter not found');
      }

      const campaign = await CampaignModel.findById(encounter.campaignId).exec();
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Only GM can modify encounters
      console.log(`Checking for modify access: campaign.gameMasterId: ${campaign.gameMasterId}`, `userId: ${userId}`);
      return campaign.gameMasterId?.toString() === userId;
    } catch (error) {
      logger.error('Error checking encounter modify access:', error);
      return false;
    }
  }

  // NOTE: Token permission checking moved to game state system

  /**
   * Check if user has access to a campaign
   */
  private async checkCampaignAccess(
    userId: string,
    campaignId: string,
    isAdmin: boolean
  ): Promise<boolean> {
    try {
      if (isAdmin) return true;

      const campaign = await CampaignModel.findById(campaignId).exec();
      if (!campaign) {
        return false;
      }

      // Check if user is GM
      if (campaign.gameMasterId?.toString() === userId) {
        return true;
      }

      // Check if user has a character in the campaign
      const userCharactersInCampaign = await DocumentService.find({
        campaignId: campaign.id,
        $or: [{ ownerId: userId }, { createdBy: userId }], // Check both ownerId and createdBy for backwards compatibility
        documentType: 'character'
      });

      return userCharactersInCampaign.length > 0;
    } catch (error) {
      logger.error('Error checking campaign access:', error);
      return false;
    }
  }

  /**
   * Get campaigns accessible to a user
   */
  private async getAccessibleCampaigns(userId: string): Promise<Types.ObjectId[]> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      // Get campaigns where user is GM
      const gmCampaigns = await CampaignModel.find({ gameMasterId: userObjectId }).exec();

      // Get user's actors
      const userActors = await DocumentService.find({ $or: [{ ownerId: userId }, { createdBy: userId }], documentType: 'actor' });
      const actorIds = userActors.map(actor => new Types.ObjectId(actor.id));

      // Get campaigns where user has characters
      const playerCampaigns = await CampaignModel.find({
        characterIds: { $in: actorIds }
      }).exec();

      // Combine and deduplicate
      const allCampaigns = [...gmCampaigns, ...playerCampaigns];
      const uniqueCampaignIds = [...new Set(allCampaigns.map(c => c._id))];

      return uniqueCampaignIds;
    } catch (error) {
      logger.error('Error getting accessible campaigns:', error);
      return [];
    }
  }
} 