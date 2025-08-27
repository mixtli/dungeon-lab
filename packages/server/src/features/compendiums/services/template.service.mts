import { createHash } from 'crypto';
import mongoose from 'mongoose';
import { ICompendiumEntry } from '@dungeon-lab/shared/types/index.mjs';
import { CompendiumEntryModel } from '../models/compendium-entry.model.mjs';
import { ActorDocumentModel } from '../../documents/models/actor-document.model.mjs';
import { CharacterDocumentModel } from '../../documents/models/character-document.model.mjs';
import { ItemDocumentModel } from '../../documents/models/item-document.model.mjs';
import { VTTDocumentModel } from '../../documents/models/vtt-document.model.mjs';
import { CampaignModel } from '../../campaigns/models/campaign.model.mjs';
import { logger } from '../../../utils/logger.mjs';

// Interface for template data
interface ITemplateData {
  [key: string]: unknown;
}

// Interface for template overrides
interface ITemplateOverrides {
  [key: string]: unknown;
}

export class TemplateService {
  /**
   * Create a world instance from a compendium template
   */
  async createFromTemplate(
    compendiumEntry: ICompendiumEntry,
    overrides: Partial<ITemplateOverrides> = {},
    userId: string,
    campaignId?: string,
    options: { skipIfExists?: boolean } = {}
  ): Promise<unknown | null> {
    const { content, entry } = compendiumEntry;
    
    try {
      // Create appropriate instance type with ownership rules
      switch (entry.documentType) {
        case 'actor': {
          // Actors prefer to belong to campaigns, but can be global for auto-creation
          if (campaignId) {
            // Verify campaign exists if provided
            const campaign = await CampaignModel.findById(campaignId);
            if (!campaign) {
              throw new Error(`Campaign with ID ${campaignId} not found`);
            }
          }

          // Strip out problematic fields from content
          const { id: _actorId, ...cleanActorContent } = content;

          const actor = await ActorDocumentModel.create({
            ...cleanActorContent,
            ...overrides,
            // Ownership rules for actors
            ...(campaignId && { campaignId }), // Optional - actors can be global for auto-creation
            createdBy: userId,                   // Required - actors owned by users
            ownerId: new mongoose.Types.ObjectId(userId), // Set ownerId for new actors
            createdAt: new Date(),
            updatedBy: userId,
            // Source tracking
            compendiumEntryId: compendiumEntry.id, // Track which entry this came from
            sourceCompendiumId: compendiumEntry.compendiumId,
            sourceEntryId: compendiumEntry.id,
            sourceVersion: compendiumEntry.contentVersion
          });
          
          // Populate tokenImage for the returned actor
          await actor.populate('tokenImage');
          return actor;
        }

        case 'character': {
          // Characters use create-only workflow when skipIfExists is true
          if (options.skipIfExists) {
            // Check for existing character by compendiumEntryId
            const existingCharacter = await CharacterDocumentModel.findOne({
              compendiumEntryId: compendiumEntry.id
            });

            if (existingCharacter) {
              logger.info(`Skipping existing character: ${existingCharacter.name} (compendiumEntryId: ${compendiumEntry.id})`);
              return null; // Signal that this was skipped
            }
          }

          // Validate campaign if provided
          if (campaignId) {
            const campaign = await CampaignModel.findById(campaignId);
            if (!campaign) {
              throw new Error(`Campaign with ID ${campaignId} not found`);
            }
          }
          // Strip out problematic fields from content
          const { id: _charId, ...cleanContent } = content;
          
          const characterData = {
            ...cleanContent,
            ...overrides,
            // Ownership rules for characters
            ...(campaignId && { campaignId }), // Optional - characters can exist without campaigns
            compendiumId: undefined,             // Never from compendium - characters are player-created
            createdBy: userId,                   // Required - characters owned by users
            ownerId: new mongoose.Types.ObjectId(userId), // Set ownerId for new characters
            createdAt: new Date(),
            updatedBy: userId,
            // Source tracking with compendiumEntryId
            compendiumEntryId: compendiumEntry.id, // Track which entry this came from
            sourceCompendiumId: compendiumEntry.compendiumId,
            sourceEntryId: compendiumEntry.id,
            sourceVersion: compendiumEntry.contentVersion
          }

          logger.info(`Creating new character: ${content.name} (compendiumEntryId: ${compendiumEntry.id})`);
          return await CharacterDocumentModel.create(characterData);
        }
          
        case 'item': {
          // Items prefer to belong to campaigns, but can be global for auto-creation
          let gameMasterId = userId; // Default to the creating user
          
          if (campaignId) {
            // Validate campaign if provided
            const campaign = await CampaignModel.findById(campaignId);
            if (!campaign) {
              throw new Error(`Campaign with ID ${campaignId} not found`);
            }
            if (campaign.gameMasterId) {
              gameMasterId = campaign.gameMasterId;
            }
          }

          // Strip out problematic fields from content
          const { id: _itemId, ...cleanItemContent } = content;

          return await ItemDocumentModel.create({
            ...cleanItemContent,
            ...overrides,
            // Ownership rules for items
            ...(campaignId && { campaignId }), // Optional - items can be global for auto-creation
            createdBy: gameMasterId,            // GM if campaign provided, otherwise creating user
            ownerId: new mongoose.Types.ObjectId(userId), // Set ownerId to user who instantiated
            createdAt: new Date(),
            updatedBy: userId, // User who performed the instantiation
            // Source tracking
            compendiumEntryId: compendiumEntry.id, // Track which entry this came from
            sourceCompendiumId: compendiumEntry.compendiumId,
            sourceEntryId: compendiumEntry.id,
            sourceVersion: compendiumEntry.contentVersion
          });
        }
          
        case 'vtt-document': {
          // VTTDocuments use create-or-update workflow based ONLY on compendiumEntryId
          // Check for existing document by compendiumEntryId only - no fallback
          const existingDocument = await VTTDocumentModel.findOne({
            compendiumEntryId: compendiumEntry.id
          });

          // Strip out problematic fields from content
          const { id: _vttId, ...cleanVttContent } = content;
          
          const documentData = {
            ...cleanVttContent,
            ...overrides,
            // Ownership rules for VTTDocuments
            campaignId: undefined, // Global - not tied to any campaign
            updatedBy: userId,
            // Source tracking with compendiumEntryId
            compendiumEntryId: compendiumEntry.id, // Track which entry this came from
            sourceCompendiumId: compendiumEntry.compendiumId,
            sourceEntryId: compendiumEntry.id,
            sourceVersion: compendiumEntry.contentVersion
          };

          if (existingDocument) {
            // Update existing document
            logger.info(`Updating existing VTTDocument instance for slug ${content.slug}`);
            const updatedDocument = await VTTDocumentModel.findByIdAndUpdate(
              existingDocument._id,
              documentData,
              { new: true, runValidators: true }
            );
            return updatedDocument;
          } else {
            // Create new document
            logger.info(`Creating new VTTDocument instance for slug ${content.slug}`);
            const newDocumentData = {
              ...documentData,
              createdBy: userId,     // Track who first instantiated it
              ownerId: new mongoose.Types.ObjectId(userId), // Set ownerId for new VTTDocuments
              createdAt: new Date()
            };
            return await VTTDocumentModel.create(newDocumentData);
          }
        }
          
        default: {
          // TypeScript ensures this is unreachable
          const _exhaustive: never = entry.documentType;
          throw new Error(`Unknown content type: ${_exhaustive}`);
        }
      }
    } catch (error) {
      logger.error('Error creating instance from template:', error);
      throw new Error(`Failed to create ${entry.documentType} instance from template: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Update template with new content data
   */
  async updateTemplate(
    compendiumEntry: ICompendiumEntry,
    newData: ITemplateData
  ): Promise<ICompendiumEntry> {
    try {
      // Create new version
      const newVersion = this.incrementVersion(compendiumEntry.contentVersion);
      const newHash = this.generateContentHash(newData);
      
      const updatedEntry = await CompendiumEntryModel.findByIdAndUpdate(
        compendiumEntry.id,
        {
          content: newData,
          contentVersion: newVersion,
          contentHash: newHash,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!updatedEntry) {
        throw new Error('CompendiumEntry not found');
      }
      
      return updatedEntry;
    } catch (error) {
      logger.error('Error updating template:', error);
      throw new Error('Failed to update template');
    }
  }
  
  /**
   * Get immutable template content
   */
  getTemplate(compendiumEntry: ICompendiumEntry): ITemplateData {
    // Return deep clone to prevent mutation
    return JSON.parse(JSON.stringify(compendiumEntry.content));
  }
  
  /**
   * Validate template data against plugin schema
   */
  async validateTemplateData(
    compendiumEntry: ICompendiumEntry,
    _pluginId: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    // This would integrate with plugin validation
    // For now, return basic validation
    const errors: string[] = [];
    
    if (!compendiumEntry.content) {
      errors.push('Template data is required');
    }
    
    if (!compendiumEntry.entry.documentType) {
      errors.push('Content type is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get template usage statistics
   */
  async getTemplateUsage(compendiumEntryId: string): Promise<{
    actorInstances: number;
    itemInstances: number;
    vttdocumentInstances: number;
    totalInstances: number;
  }> {
    try {
      const [actorCount, itemCount, vttdocumentCount] = await Promise.all([
        ActorDocumentModel.countDocuments({ sourceEntryId: compendiumEntryId }),
        ItemDocumentModel.countDocuments({ sourceEntryId: compendiumEntryId }),
        VTTDocumentModel.countDocuments({ sourceEntryId: compendiumEntryId })
      ]);
      
      return {
        actorInstances: actorCount,
        itemInstances: itemCount,
        vttdocumentInstances: vttdocumentCount,
        totalInstances: actorCount + itemCount + vttdocumentCount
      };
    } catch (error) {
      logger.error('Error getting template usage:', error);
      return {
        actorInstances: 0,
        itemInstances: 0,
        vttdocumentInstances: 0,
        totalInstances: 0
      };
    }
  }
  
  /**
   * Private helper methods
   */
  private incrementVersion(currentVersion: string): string {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }
  
  private generateContentHash(data: ITemplateData): string {
    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
  }
}