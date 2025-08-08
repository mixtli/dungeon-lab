import { Types } from 'mongoose';
import { logger } from '../../../utils/logger.mjs';
import { EncounterModel } from '../models/encounter.model.mjs';
// TokenModel removed - tokens are now embedded in encounters
// Imports removed - permission checking moved to game state system

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

  // NOTE: Token control permissions moved to game state system

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

  // NOTE: Token validation moved to game state system

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