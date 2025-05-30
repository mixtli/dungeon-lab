import { Types } from 'mongoose';
import { logger } from '../../utils/logger.mjs';
import { EncounterModel } from '../../features/encounters/models/encounter.model.mjs';
import { TokenModel } from '../../features/encounters/models/token.model.mjs';

export interface EncounterPermissions {
  canView: boolean;
  canControl: boolean;
  canModify: boolean;
  canDelete: boolean;
}

export class EncounterPermissionValidator {
  /**
   * Get user permissions for an encounter
   */
  async getEncounterPermissions(
    encounterId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<EncounterPermissions> {
    try {
      if (!Types.ObjectId.isValid(encounterId)) {
        return this.noPermissions();
      }

      const encounter = await EncounterModel.findById(encounterId)
        .populate('campaignId')
        .lean()
        .exec();

      if (!encounter) {
        return this.noPermissions();
      }

      // Admin has all permissions
      if (isAdmin) {
        return this.allPermissions();
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const campaign = encounter.campaignId as any;
      if (!campaign) {
        return this.noPermissions();
      }

      // Game Master has all permissions
      if (campaign.gameMasterId?.toString() === userId) {
        return this.allPermissions();
      }

      // Check if user is a campaign member
      const isMember = campaign.members?.some((memberId: Types.ObjectId) => 
        memberId.toString() === userId
      );

      if (!isMember) {
        return this.noPermissions();
      }

      // Campaign members can view and control their own tokens
      return {
        canView: true,
        canControl: true, // Can control their own tokens
        canModify: false, // Cannot modify encounter settings
        canDelete: false  // Cannot delete encounter
      };

    } catch (error) {
      logger.error('Error checking encounter permissions:', error);
      return this.noPermissions();
    }
  }

  /**
   * Check if user can control a specific token
   */
  async canControlToken(
    tokenId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(tokenId)) {
        return false;
      }

      const token = await TokenModel.findById(tokenId)
        .populate({
          path: 'encounterId',
          populate: {
            path: 'campaignId'
          }
        })
        .lean()
        .exec();

      if (!token) {
        return false;
      }

      // Admin can control any token
      if (isAdmin) {
        return true;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const encounter = token.encounterId as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const campaign = encounter?.campaignId as any;

      if (!encounter || !campaign) {
        return false;
      }

      // Game Master can control any token
      if (campaign.gameMasterId?.toString() === userId) {
        return true;
      }

      // Players can only control their own tokens
      if (token.actorId) {
        // Check if the actor belongs to the user
        const ActorModel = (await import('../../features/actors/models/actor.model.mjs')).ActorModel;
        const actor = await ActorModel.findById(token.actorId).lean().exec();
        return actor?.createdBy?.toString() === userId;
      }

      // If no actorId, check if token is player-controlled and created by user
      return token.isPlayerControlled && token.createdBy?.toString() === userId;

    } catch (error) {
      logger.error('Error checking token control permissions:', error);
      return false;
    }
  }

  /**
   * Check if user can view an encounter
   */
  async canViewEncounter(
    encounterId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<boolean> {
    const permissions = await this.getEncounterPermissions(encounterId, userId, isAdmin);
    return permissions.canView;
  }

  /**
   * Check if user can modify an encounter
   */
  async canModifyEncounter(
    encounterId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<boolean> {
    const permissions = await this.getEncounterPermissions(encounterId, userId, isAdmin);
    return permissions.canModify;
  }

  /**
   * Check if user is the GM of the encounter
   */
  async isEncounterGM(
    encounterId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<boolean> {
    try {
      if (isAdmin) {
        return true;
      }

      if (!Types.ObjectId.isValid(encounterId)) {
        return false;
      }

      const encounter = await EncounterModel.findById(encounterId)
        .populate('campaignId')
        .lean()
        .exec();

      if (!encounter) {
        return false;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const campaign = encounter.campaignId as any;
      return campaign?.gameMasterId?.toString() === userId;

    } catch (error) {
      logger.error('Error checking GM status:', error);
      return false;
    }
  }

  /**
   * Validate encounter access and throw error if denied
   */
  async validateEncounterAccess(
    encounterId: string,
    userId: string,
    requiredPermission: keyof EncounterPermissions,
    isAdmin: boolean = false
  ): Promise<void> {
    const permissions = await this.getEncounterPermissions(encounterId, userId, isAdmin);
    
    if (!permissions[requiredPermission]) {
      throw new Error(`Access denied: insufficient permissions for encounter ${encounterId}`);
    }
  }

  /**
   * Validate token control access and throw error if denied
   */
  async validateTokenControl(
    tokenId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<void> {
    const canControl = await this.canControlToken(tokenId, userId, isAdmin);
    
    if (!canControl) {
      throw new Error(`Access denied: cannot control token ${tokenId}`);
    }
  }

  private allPermissions(): EncounterPermissions {
    return {
      canView: true,
      canControl: true,
      canModify: true,
      canDelete: true
    };
  }

  private noPermissions(): EncounterPermissions {
    return {
      canView: false,
      canControl: false,
      canModify: false,
      canDelete: false
    };
  }
}

// Singleton instance
export const encounterPermissionValidator = new EncounterPermissionValidator(); 