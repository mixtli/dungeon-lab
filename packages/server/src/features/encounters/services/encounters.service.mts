import { Types } from 'mongoose';
import { logger } from '../../../utils/logger.mjs';
import { IEncounter, IToken, EncounterStatusType } from '@dungeon-lab/shared/types/index.mjs';
import { EncounterModel } from '../models/encounter.model.mjs';
import { TokenModel } from '../models/token.model.mjs';
import { CampaignModel } from '../../campaigns/models/campaign.model.mjs';
import { MapModel } from '../../maps/models/map.model.mjs';
import { ActorModel } from '../../actors/models/actor.model.mjs';
import { z } from 'zod';
import {
  createEncounterSchema,
  updateEncounterSchema,
  EncounterStatusEnum
} from '@dungeon-lab/shared/schemas/encounters.schema.mjs';
import {
  createTokenSchema,
  updateTokenSchema
} from '@dungeon-lab/shared/schemas/tokens.schema.mjs';

// Type definitions for service methods
type CreateEncounterData = z.infer<typeof createEncounterSchema>;
type UpdateEncounterData = z.infer<typeof updateEncounterSchema>;
type CreateTokenData = z.infer<typeof createTokenSchema>;
type UpdateTokenData = z.infer<typeof updateTokenSchema>;

// Options type for createTokenFromActor method
type CreateTokenOptions = {
  userId: string;
  isAdmin: boolean;
  position?: { x: number; y: number; elevation?: number };
  name?: string;
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
  isVisible?: boolean;
  isPlayerControlled?: boolean;
};

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

      // Verify map exists
      const map = await MapModel.findById(mapObjectId).exec();
      if (!map) {
        throw new Error('Map not found');
      }

      // Create encounter
      const encounterData = {
        ...data,
        campaignId: campaignObjectId,
        mapId: mapObjectId,
        createdBy: userObjectId,
        updatedBy: userObjectId,
        tokens: [],
        initiative: {
          entries: [],
          currentTurn: 0,
          currentRound: 1,
          isActive: false
        },
        effects: [],
        version: 1
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

      // Handle optimistic locking if version is provided
      const query: Record<string, unknown> = { _id: encounterId };
      if (data.version) {
        query.version = data.version;
        updateData.version = data.version + 1;
      }

      const updatedEncounter = await EncounterModel.findOneAndUpdate(
        query,
        updateData,
        { new: true }
      ).exec();
      //const updatedEncounter = await EncounterModel.findByIdAndUpdate(encounterId, updateData, { new: true }).exec();

      if (!updatedEncounter) {
        if (data.version) {
          throw new Error('Version conflict');
        }
        throw new Error('Encounter not found');
      }

      return updatedEncounter;
    } catch (error) {
      if (error instanceof Error && 
          ['Encounter not found', 'Access denied', 'Version conflict'].includes(error.message)) {
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

      // Delete all tokens first
      await TokenModel.deleteMany({ encounterId }).exec();

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
  // TOKEN MANAGEMENT
  // ============================================================================

  /**
   * Get all tokens for an encounter
   */
  async getTokens(
    encounterId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<IToken[]> {
    try {
      // Check encounter access
      const hasAccess = await this.checkEncounterAccess(encounterId, userId, isAdmin);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      const tokens = await TokenModel.find({ encounterId })
        .sort({ createdAt: 1 })
        .lean()
        .exec();

      return tokens;
    } catch (error) {
      if (error instanceof Error && 
          ['Encounter not found', 'Access denied'].includes(error.message)) {
        throw error;
      }
      logger.error('Error getting tokens:', error);
      throw new Error('Failed to get tokens');
    }
  }

  /**
   * Create a new token
   */
  async createToken(
    encounterId: string,
    data: CreateTokenData,
    userId: string,
    isAdmin: boolean
  ): Promise<IToken> {
    try {
      // Check encounter access
      const hasAccess = await this.checkEncounterModifyAccess(encounterId, userId, isAdmin);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      // Validate position (basic validation - can be enhanced)
      if (data.position.x < 0 || data.position.y < 0) {
        throw new Error('Invalid position');
      }

      const userObjectId = new Types.ObjectId(userId);
      const encounterObjectId = new Types.ObjectId(encounterId);

      const tokenData = {
        ...data,
        encounterId: encounterObjectId,
        createdBy: userObjectId,
        updatedBy: userObjectId,
        version: 1
      };

      const token = new TokenModel(tokenData);
      await token.save();

      return token.toObject();
    } catch (error) {
      if (error instanceof Error && 
          ['Encounter not found', 'Access denied', 'Invalid position'].includes(error.message)) {
        throw error;
      }
      logger.error('Error creating token:', error);
      throw new Error('Failed to create token');
    }
  }

  /**
   * Update a token
   */
  async updateToken(
    encounterId: string,
    tokenId: string,
    data: UpdateTokenData,
    userId: string,
    isAdmin: boolean
  ): Promise<IToken> {
    try {
      if (!Types.ObjectId.isValid(tokenId)) {
        throw new Error('Token not found');
      }

      // Check encounter access
      const hasAccess = await this.checkTokenControlAccess(encounterId, tokenId, userId, isAdmin);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      // Validate position if provided
      if (data.position && (data.position.x < 0 || data.position.y < 0)) {
        throw new Error('Invalid position');
      }

      const userObjectId = new Types.ObjectId(userId);
      const updateData = {
        ...data,
        updatedBy: userObjectId
      };

      const updatedToken = await TokenModel.findOneAndUpdate(
        { _id: tokenId, encounterId },
        updateData,
        { new: true, lean: true }
      ).exec();

      if (!updatedToken) {
        throw new Error('Token not found');
      }

      return updatedToken;
    } catch (error) {
      if (error instanceof Error && 
          ['Token not found', 'Access denied', 'Invalid position'].includes(error.message)) {
        throw error;
      }
      logger.error('Error updating token:', error);
      throw new Error('Failed to update token');
    }
  }

  /**
   * Delete a token
   */
  async deleteToken(
    encounterId: string,
    tokenId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(tokenId)) {
        throw new Error('Token not found');
      }

      // Check encounter access
      const hasAccess = await this.checkEncounterModifyAccess(encounterId, userId, isAdmin);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      const deletedToken = await TokenModel.findOneAndDelete({
        _id: tokenId,
        encounterId
      }).exec();

      if (!deletedToken) {
        throw new Error('Token not found');
      }
    } catch (error) {
      if (error instanceof Error && 
          ['Token not found', 'Access denied'].includes(error.message)) {
        throw error;
      }
      logger.error('Error deleting token:', error);
      throw new Error('Failed to delete token');
    }
  }

  /**
   * Add a token to an encounter (alias for createToken for socket compatibility)
   */
  async addToken(
    encounterId: string,
    data: CreateTokenData,
    userId: string,
    isAdmin: boolean = false
  ): Promise<IToken> {
    return this.createToken(encounterId, data, userId, isAdmin);
  }

  /**
   * Create a token from an existing actor
   * This generates a token instance from an actor template using the actor's defaultTokenImageId
   */
  async createTokenFromActor(
    encounterId: string,
    actorId: string,
    options: CreateTokenOptions
  ): Promise<IToken> {
    try {
      if (!Types.ObjectId.isValid(encounterId)) {
        throw new Error('Encounter not found');
      }
      
      if (!Types.ObjectId.isValid(actorId)) {
        throw new Error('Actor not found');
      }

      // Check encounter access
      const hasAccess = await this.checkEncounterModifyAccess(encounterId, options.userId, options.isAdmin);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      // Validate position
      const position = { 
        x: options.position?.x || 0, 
        y: options.position?.y || 0, 
        elevation: options.position?.elevation || 0 
      };
      if (!this.validateTokenPosition(position)) {
        throw new Error('Invalid position');
      }

      // Get the actor to access its properties
      const actor = await ActorModel.findById(actorId).populate('token').exec();
      
      if (!actor) {
        throw new Error('Actor not found');
      }

      const tokenData: CreateTokenData = {
        name: options.name || actor.name,
        imageUrl: actor.token?.url || actor.avatar?.url || '',
        size: options.size || 'medium',
        encounterId,
        position: position,
        actorId: actor.id,
        isVisible: options.isVisible ?? true,
        isPlayerControlled: options.isPlayerControlled ?? false,
        data: actor.data || {}, // Copy the actor's data field
        conditions: []
      };

      // Create and save token
      const token = new TokenModel(tokenData);
      await token.save();

      // Add token to encounter's tokens array
      await EncounterModel.findByIdAndUpdate(
        encounterId,
        { $push: { tokens: token._id } }
      ).exec();

      return token.toObject();
    } catch (error) {
      if (error instanceof Error && 
          ['Encounter not found', 'Actor not found', 'Access denied', 'Invalid position'].includes(error.message)) {
        throw error;
      }
      logger.error('Error creating token from actor:', error);
      throw new Error('Failed to create token from actor');
    }
  }

  /**
   * Duplicate an existing token multiple times
   * Creates multiple instances of the same token with offset positions
   */
  async duplicateToken(
    encounterId: string,
    tokenId: string,
    count: number = 1,
    offsetX: number = 1,
    offsetY: number = 0,
    userId: string,
    isAdmin: boolean = false
  ): Promise<IToken[]> {
    try {
      if (!Types.ObjectId.isValid(encounterId)) {
        throw new Error('Encounter not found');
      }
      
      if (!Types.ObjectId.isValid(tokenId)) {
        throw new Error('Token not found');
      }

      // Validate count
      if (count < 1 || count > 20) { // Limit to prevent abuse
        throw new Error('Invalid duplication count (must be between 1 and 20)');
      }

      // Check encounter access
      const hasAccess = await this.checkEncounterModifyAccess(encounterId, userId, isAdmin);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      // Get the original token
      const originalToken = await TokenModel.findOne({ 
        _id: tokenId, 
        encounterId 
      }).lean().exec();
      
      if (!originalToken) {
        throw new Error('Token not found');
      }

      const userObjectId = new Types.ObjectId(userId);
      const encounterObjectId = new Types.ObjectId(encounterId);
      const createdTokens: IToken[] = [];

      // Create the specified number of duplicates
      for (let i = 0; i < count; i++) {
        // Calculate new position with offset
        const position = {
          x: originalToken.position.x + (offsetX * (i + 1)),
          y: originalToken.position.y + (offsetY * (i + 1))
        };

        // Validate the new position
        if (!this.validateTokenPosition(position)) {
          logger.warn(`Skipping token duplicate at position (${position.x}, ${position.y}) - invalid position`);
          continue;
        }

        // Create a new token based on the original
        const tokenData = {
          ...originalToken,
          _id: new Types.ObjectId(), // Generate new ID
          position,
          name: `${originalToken.name} ${i + 1}`, // Append number to name
          createdBy: userObjectId,
          updatedBy: userObjectId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        if ('id' in tokenData) {
          delete (tokenData as { id?: string }).id;
        }

        // Create and save token
        const token = new TokenModel(tokenData);
        await token.save();

        // Add token to encounter's tokens array
        await EncounterModel.findByIdAndUpdate(
          encounterObjectId,
          { $push: { tokens: token._id } }
        ).exec();

        createdTokens.push(token.toObject());
      }

      return createdTokens;
    } catch (error) {
      if (error instanceof Error && 
          ['Encounter not found', 'Token not found', 'Access denied', 'Invalid duplication count (must be between 1 and 20)'].includes(error.message)) {
        throw error;
      }
      logger.error('Error duplicating token:', error);
      throw new Error('Failed to duplicate token');
    }
  }

  /**
   * Remove a token from an encounter (alias for deleteToken for socket compatibility)
   */
  async removeToken(
    encounterId: string,
    tokenId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<void> {
    return this.deleteToken(encounterId, tokenId, userId, isAdmin);
  }

  // ============================================================================
  // REAL-TIME OPERATIONS
  // ============================================================================

  /**
   * Move a token to a new position (optimized for real-time updates)
   */
  async moveToken(
    encounterId: string,
    tokenId: string,
    position: { x: number; y: number },
    userId: string,
    skipPermissionCheck = false
  ): Promise<IToken> {
    try {
      if (!Types.ObjectId.isValid(tokenId)) {
        throw new Error('Token not found');
      }

      // Check token control permissions (can be skipped if already validated at socket layer)
      if (!skipPermissionCheck) {
        const hasAccess = await this.checkTokenControlAccess(encounterId, tokenId, userId, false);
        if (!hasAccess) {
          throw new Error('Access denied');
        }
      }

      // Validate position
      if (!this.validateTokenPosition(position)) {
        throw new Error('Invalid position');
      }

      const userObjectId = new Types.ObjectId(userId);
      const updateData = {
        position,
        updatedBy: userObjectId,
        updatedAt: new Date()
      };

      const updatedToken = await TokenModel.findOneAndUpdate(
        { _id: tokenId, encounterId },
        updateData,
        { new: true, lean: true }
      ).exec();

      if (!updatedToken) {
        throw new Error('Token not found');
      }

      return updatedToken;
    } catch (error) {
      if (error instanceof Error && 
          ['Token not found', 'Access denied', 'Invalid position'].includes(error.message)) {
        throw error;
      }
      logger.error('Error moving token:', error);
      throw new Error('Failed to move token');
    }
  }

  /**
   * Validate token position
   */
  private validateTokenPosition(position: { x: number; y: number }): boolean {
    // Basic validation - can be enhanced with map boundaries, collision detection, etc.
    return position.x >= 0 && position.y >= 0 && 
           Number.isFinite(position.x) && Number.isFinite(position.y);
  }

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
      
      // Get all tokens
      const tokens = await this.getTokens(encounterId, userId, isAdmin);

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
      
      // Check which tokens user can control
      const canControl: string[] = [];
      for (const token of tokens) {
        const hasControl = await this.checkTokenControlAccess(
          encounterId, 
          token.id, 
          userId, 
          isAdmin
        );
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

  /**
   * Batch update multiple tokens (for performance optimization)
   */
  async batchUpdateTokens(
    encounterId: string,
    updates: Array<{
      tokenId: string;
      data: Partial<UpdateTokenData>;
    }>,
    userId: string,
    isAdmin: boolean
  ): Promise<IToken[]> {
    try {
      const updatedTokens: IToken[] = [];
      
      // Process updates sequentially to maintain data consistency
      for (const update of updates) {
        try {
          // Ensure updatedBy is set for each update
          const updateData = {
            ...update.data,
            updatedBy: userId
          };
          
          const updatedToken = await this.updateToken(
            encounterId,
            update.tokenId,
            updateData,
            userId,
            isAdmin
          );
          updatedTokens.push(updatedToken);
        } catch (error) {
          logger.warn(`Failed to update token ${update.tokenId}:`, error);
          // Continue with other updates even if one fails
        }
      }

      return updatedTokens;
    } catch (error) {
      logger.error('Error in batch token update:', error);
      throw new Error('Failed to batch update tokens');
    }
  }

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
  async validateTokenAction(
    encounterId: string,
    tokenId: string,
    _action: string,
    userId: string,
    isAdmin: boolean
  ): Promise<boolean> {
    try {
      // Check basic token control access
      const hasControl = await this.checkTokenControlAccess(encounterId, tokenId, userId, isAdmin);
      if (!hasControl) {
        return false;
      }

      // For now, all actions are allowed if user has control
      // In the future, this could check turn-based restrictions, action points, etc.
      return true;
    } catch (error) {
      logger.error('Error validating token action:', error);
      return false;
    }
  }

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

  /**
   * Check if user has access to control a specific token
   */
  private async checkTokenControlAccess(
    encounterId: string,
    tokenId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<boolean> {
    try {
      if (isAdmin) return true;

      const token = await TokenModel.findOne({ _id: tokenId, encounterId }).exec();
      if (!token) {
        throw new Error('Token not found');
      }

      // Check if user is GM
      const hasModifyAccess = await this.checkEncounterModifyAccess(encounterId, userId, isAdmin);
      if (hasModifyAccess) return true;

      // Check if token is player-controlled and user owns the associated actor
      if (token.isPlayerControlled && token.actorId) {
        const actor = await ActorModel.findById(token.actorId).exec();
        return actor?.createdBy?.toString() === userId;
      }

      return false;
    } catch (error) {
      logger.error('Error checking token control access:', error);
      return false;
    }
  }

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
      const userObjectId = new Types.ObjectId(userId);
      const userActors = await ActorModel.find({ createdBy: userObjectId }).exec();
      const actorIds = userActors.map(actor => actor._id.toString());

      return campaign.characterIds.some(characterId =>
        actorIds.includes(characterId.toString())
      );
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
      const userActors = await ActorModel.find({ createdBy: userObjectId }).exec();
      const actorIds = userActors.map(actor => actor._id);

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