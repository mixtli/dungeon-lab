import { createHash } from 'crypto';
// Removed unused Types import
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
    campaignId?: string
  ): Promise<unknown> {
    const { content, entry } = compendiumEntry;
    
    try {
      // Create appropriate instance type with ownership rules
      switch (entry.documentType) {
        case 'actor': {
          // Actors MUST be owned by users and MUST belong to campaigns
          if (!campaignId) {
            throw new Error('Campaign ID is required when creating actor instances');
          }

          // Verify campaign exists
          const campaign = await CampaignModel.findById(campaignId);
          if (!campaign) {
            throw new Error(`Campaign with ID ${campaignId} not found`);
          }

          return await ActorDocumentModel.create({
            ...content,
            ...overrides,
            // Ownership rules for actors
            campaignId,          // Required - actors belong to campaigns
            createdBy: userId,   // Required - actors owned by users
            createdAt: new Date(),
            updatedBy: userId,
            // Source tracking
            sourceCompendiumId: compendiumEntry.compendiumId,
            sourceEntryId: compendiumEntry.id,
            sourceVersion: compendiumEntry.contentVersion
          });
        }

        case 'character': {
          // Characters can exist without campaigns and are never from compendium
          // Validate campaign if provided
          if (campaignId) {
            const campaign = await CampaignModel.findById(campaignId);
            if (!campaign) {
              throw new Error(`Campaign with ID ${campaignId} not found`);
            }
          }
          // Strip out problematic fields from content
          const { id, ...cleanContent } = content;
          
          const characterData = {
            ...cleanContent,
            ...overrides,
            // Ownership rules for characters
            campaignId: campaignId || undefined, // Optional - characters can exist without campaigns
            compendiumId: undefined,             // Never from compendium - characters are player-created
            createdBy: userId,                   // Required - characters owned by users
            createdAt: new Date(),
            updatedBy: userId,
            // Source tracking (rare case - pre-made character templates)
            sourceCompendiumId: compendiumEntry.compendiumId,
            sourceEntryId: compendiumEntry.id,
            sourceVersion: compendiumEntry.contentVersion
          }

          return await CharacterDocumentModel.create(characterData);
        }
          
        case 'item': {
          // Items MUST belong to campaigns and are owned by Game Master by default
          if (!campaignId) {
            throw new Error('Campaign ID is required when creating item instances');
          }

          // Get campaign to find the Game Master
          const campaign = await CampaignModel.findById(campaignId);
          if (!campaign) {
            throw new Error(`Campaign with ID ${campaignId} not found`);
          }

          return await ItemDocumentModel.create({
            ...content,
            ...overrides,
            // Ownership rules for items
            campaignId,                    // Required - items belong to campaigns
            createdBy: campaign.gameMasterId, // Items owned by GM by default
            createdAt: new Date(),
            updatedBy: userId, // User who performed the instantiation
            // Source tracking
            sourceCompendiumId: compendiumEntry.compendiumId,
            sourceEntryId: compendiumEntry.id,
            sourceVersion: compendiumEntry.contentVersion
          });
        }
          
        case 'vtt-document': {
          // VTTDocuments are global, immutable, and singleton
          // Check if instance already exists for this compendium entry
          const existingDocument = await VTTDocumentModel.findOne({
            sourceEntryId: compendiumEntry.id,
            sourceCompendiumId: compendiumEntry.compendiumId
          });

          if (existingDocument) {
            logger.info(`Returning existing VTTDocument instance for entry ${compendiumEntry.id}`);
            return existingDocument;
          }

          // Strip out problematic fields from content
          const { id: _vttId, ...cleanVttContent } = content;
          
          const documentData = {
            ...cleanVttContent,
            ...overrides,
            // Ownership rules for VTTDocuments
            campaignId: undefined, // Global - not tied to any campaign
            createdBy: userId,     // Track who first instantiated it
            createdAt: new Date(),
            updatedBy: userId,
            // Source tracking
            sourceCompendiumId: compendiumEntry.compendiumId,
            sourceEntryId: compendiumEntry.id,
            sourceVersion: compendiumEntry.contentVersion
          }

          // Create new singleton instance
          return await VTTDocumentModel.create(documentData);
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