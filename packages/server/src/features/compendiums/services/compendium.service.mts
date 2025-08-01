import { Types } from 'mongoose';
import { 
  ICompendium, 
  ICompendiumCreateData, 
  ICompendiumUpdateData,
  ICompendiumEntry,
  ICompendiumEntryCreateData,
  ICompendiumEntryUpdateData
} from '@dungeon-lab/shared/types/index.mjs';
import { CompendiumModel } from '../models/compendium.model.mjs';
import { CompendiumEntryModel } from '../models/compendium-entry.model.mjs';
import { logger } from '../../../utils/logger.mjs';
// Removed unused model imports
import { AssetModel } from '../../assets/models/asset.model.mjs';

export type QueryValue = string | number | boolean | RegExp | Date | object;
export type CompendiumDocument = ICompendium;

// Interface for embedded content data with asset references
interface IEmbeddedContentData {
  avatarId?: { toString(): string };
  imageId?: { toString(): string };
  defaultTokenImageId?: { toString(): string };
  [key: string]: unknown;
}

// Type for entry with populated assets
type ICompendiumEntryWithAssets = ICompendiumEntry & {
  image?: {
    _id: unknown;
    url: string;
    [key: string]: unknown;
  };
};

export class CompendiumService {
  /**
   * Get all compendiums with optional filtering
   */
  async getAllCompendiums(filters?: {
    gameSystemId?: string;
    pluginId?: string;
    status?: string;
    isPublic?: boolean;
  }): Promise<ICompendium[]> {
    try {
      const query: Record<string, QueryValue> = {};
      
      if (filters?.gameSystemId) query.gameSystemId = filters.gameSystemId;
      if (filters?.pluginId) query.pluginId = filters.pluginId;
      if (filters?.status) query.status = filters.status;
      if (filters?.isPublic !== undefined) query.isPublic = filters.isPublic;
      
      const compendiums = await CompendiumModel.find(query)
        .sort({ name: 1 })
        .lean();
      
      return compendiums;
    } catch (error) {
      logger.error('Error fetching compendiums:', error);
      throw new Error('Failed to get compendiums');
    }
  }

  /**
   * Get compendium by slug
   */
  async getCompendiumById(slug: string): Promise<ICompendium> {
    try {
      const compendium = await CompendiumModel.findOne({ slug }).lean();
      if (!compendium) {
        throw new Error('Compendium not found');
      }
      return compendium;
    } catch (error) {
      logger.error('Error fetching compendium:', error);
      throw new Error('Failed to get compendium');
    }
  }

  /**
   * Create new compendium
   */
  async createCompendium(data: ICompendiumCreateData, createdBy: string): Promise<ICompendium> {
    try {
      const compendium = new CompendiumModel({
        ...data,
        createdBy,
        updatedBy: createdBy
      });
      
      await compendium.save();
      return compendium.toObject();
    } catch (error) {
      logger.error('Error creating compendium:', error);
      throw new Error('Failed to create compendium');
    }
  }

  /**
   * Update compendium by slug
   */
  async updateCompendium(slug: string, data: ICompendiumUpdateData, updatedBy: string): Promise<ICompendium> {
    try {
      const compendium = await CompendiumModel.findOneAndUpdate(
        { slug },
        { ...data, updatedBy },
        { new: true, runValidators: true }
      ).lean();
      
      if (!compendium) {
        throw new Error('Compendium not found');
      }
      
      return compendium;
    } catch (error) {
      logger.error('Error updating compendium:', error);
      throw new Error('Failed to update compendium');
    }
  }

  /**
   * Delete compendium and all its entries by slug
   */
  async deleteCompendium(slug: string): Promise<void> {
    try {
      const session = await CompendiumModel.startSession();
      await session.withTransaction(async () => {
        // First find the compendium to get its ObjectId
        const compendium = await CompendiumModel.findOne({ slug }).session(session);
        if (!compendium) {
          throw new Error('Compendium not found');
        }
        
        // Delete all entries using the ObjectId
        await CompendiumEntryModel.deleteMany({ compendiumId: compendium._id }).session(session);
        
        // Delete the compendium by slug
        await CompendiumModel.findOneAndDelete({ slug }).session(session);
      });
    } catch (error) {
      logger.error('Error deleting compendium:', error);
      throw new Error('Failed to delete compendium');
    }
  }

  /**
   * Get all entries for a compendium by slug
   */
  async getCompendiumEntries(slug: string, filters?: {
    contentType?: string;
    isActive?: boolean;
    category?: string;
    search?: string;
  }): Promise<ICompendiumEntry[]> {
    try {
      // First find the compendium to get its ObjectId
      const compendium = await CompendiumModel.findOne({ slug }).lean();
      if (!compendium) {
        throw new Error('Compendium not found');
      }

      const query: Record<string, QueryValue> = { compendiumId: compendium._id };
      
      if (filters?.contentType) query['embeddedContent.type'] = filters.contentType;
      if (filters?.isActive !== undefined) query.isActive = filters.isActive;
      if (filters?.category) query.category = filters.category;
      if (filters?.search) {
        query.$text = { $search: filters.search };
      }
      
      const entries = await CompendiumEntryModel.find(query)
        .sort({ sortOrder: 1, name: 1 })
        .lean();
      
      // Manually populate asset fields for each entry based on content type
      for (const entry of entries) {
        // Collect asset IDs to populate (both entry-level and content-level)
        const assetIds: string[] = [];
        const assetFieldMap: Record<string, string> = {};
        
        // Add entry-level imageId if present
        if (entry.imageId) {
          assetIds.push(entry.imageId.toString());
          assetFieldMap[entry.imageId.toString()] = 'entry.image';
        }
        
        // Add content-level asset IDs if present
        if (entry.embeddedContent && entry.embeddedContent.data) {
          const content = entry.embeddedContent.data as IEmbeddedContentData;
          
          if (content.avatarId) {
            assetIds.push(content.avatarId.toString());
            assetFieldMap[content.avatarId.toString()] = 'content.avatarId';
          }
          
          if (content.imageId) {
            assetIds.push(content.imageId.toString());
            assetFieldMap[content.imageId.toString()] = 'content.imageId';
          }
          
          if (content.defaultTokenImageId) {
            assetIds.push(content.defaultTokenImageId.toString());
            assetFieldMap[content.defaultTokenImageId.toString()] = 'content.defaultTokenImageId';
          }
        }
        
        // Fetch all assets at once and replace IDs with full asset objects
        if (assetIds.length > 0) {
          const assets = await AssetModel.find({ _id: { $in: assetIds } }).lean();
          
          // Replace asset IDs with full asset objects
          for (const asset of assets) {
            const fieldPath = assetFieldMap[asset._id.toString()];
            if (fieldPath) {
              if (fieldPath === 'entry.image') {
                // Add entry-level image object (keep imageId as string)
                (entry as ICompendiumEntryWithAssets).image = asset;
              } else if (fieldPath.startsWith('content.')) {
                // Replace content-level asset fields
                const fieldName = fieldPath.replace('content.', '');
                if (entry.embeddedContent && entry.embeddedContent.data) {
                  (entry.embeddedContent.data as IEmbeddedContentData)[fieldName] = asset;
                }
              }
            }
          }
        }
      }
      
      // Map _id to id for each entry
      return entries.map(entry => ({
        ...entry,
        id: entry._id?.toString?.() || entry.id,
      }));
    } catch (error) {
      logger.error('Error fetching compendium entries:', error);
      throw new Error('Failed to get compendium entries');
    }
  }

  /**
   * Get entry by ID
   */
  async getCompendiumEntryById(id: string): Promise<ICompendiumEntry> {
    try {
      const entry = await CompendiumEntryModel.findById(id)
        .populate('compendium')
        .lean();
      
      if (!entry) {
        throw new Error('Compendium entry not found');
      }

      // Populate entry-level and content-level image asset objects (like in getCompendiumEntries)
      const assetIds: string[] = [];
      const assetFieldMap: Record<string, string> = {};
      if (entry.imageId) {
        assetIds.push(entry.imageId.toString());
        assetFieldMap[entry.imageId.toString()] = 'entry.image';
      }
      if (entry.embeddedContent && entry.embeddedContent.data) {
        const content = entry.embeddedContent.data as IEmbeddedContentData;
        if (content.avatarId) {
          assetIds.push(content.avatarId.toString());
          assetFieldMap[content.avatarId.toString()] = 'content.avatarId';
        }
        if (content.imageId) {
          assetIds.push(content.imageId.toString());
          assetFieldMap[content.imageId.toString()] = 'content.imageId';
        }
        if (content.defaultTokenImageId) {
          assetIds.push(content.defaultTokenImageId.toString());
          assetFieldMap[content.defaultTokenImageId.toString()] = 'content.defaultTokenImageId';
        }
      }
      if (assetIds.length > 0) {
        const assets = await AssetModel.find({ _id: { $in: assetIds } }).lean();
        for (const asset of assets) {
          const fieldPath = assetFieldMap[asset._id.toString()];
          if (fieldPath === 'entry.image') {
            (entry as ICompendiumEntryWithAssets).image = asset;
          } else if (fieldPath && fieldPath.startsWith('content.')) {
            const fieldName = fieldPath.replace('content.', '');
            if (entry.embeddedContent && entry.embeddedContent.data) {
              (entry.embeddedContent.data as IEmbeddedContentData)[fieldName] = asset;
            }
          }
        }
      }
      // Map _id to id for consistency
      return {
        ...entry,
        id: entry._id?.toString?.() || entry.id,
      };
    } catch (error) {
      logger.error('Error fetching compendium entry:', error);
      throw new Error('Failed to get compendium entry');
    }
  }

  /**
   * Create new compendium entry
   */
  async createCompendiumEntry(data: ICompendiumEntryCreateData, createdBy: string): Promise<ICompendiumEntry> {
    try {
      const entry = new CompendiumEntryModel({
        ...data,
        createdBy,
        updatedBy: createdBy
      });
      
      await entry.save();
      return entry.toObject();
    } catch (error) {
      logger.error('Error creating compendium entry:', error);
      throw new Error('Failed to create compendium entry');
    }
  }

  /**
   * Update compendium entry
   */
  async updateCompendiumEntry(id: string, data: ICompendiumEntryUpdateData, updatedBy: string): Promise<ICompendiumEntry> {
    try {
      const entry = await CompendiumEntryModel.findByIdAndUpdate(
        id,
        { ...data, updatedBy },
        { new: true, runValidators: true }
      ).lean();
      
      if (!entry) {
        throw new Error('Compendium entry not found');
      }
      
      return entry;
    } catch (error) {
      logger.error('Error updating compendium entry:', error);
      throw new Error('Failed to update compendium entry');
    }
  }

  /**
   * Delete compendium entry
   */
  async deleteCompendiumEntry(id: string): Promise<void> {
    try {
      const result = await CompendiumEntryModel.findByIdAndDelete(id);
      if (!result) {
        throw new Error('Compendium entry not found');
      }
    } catch (error) {
      logger.error('Error deleting compendium entry:', error);
      throw new Error('Failed to delete compendium entry');
    }
  }

  /**
   * Link existing content to compendium by slug
   * NOTE: This method is designed for the old schema where content was stored separately.
   * With the new embedded content schema, this method is no longer needed.
   */
  /*
  async linkContentToCompendium(
    compendiumSlug: string, 
    contentType: 'Actor' | 'Item' | 'VTTDocument',
    contentId: string,
    entryData: Partial<ICompendiumEntryCreateData>,
    createdBy: string
  ): Promise<ICompendiumEntry> {
    try {
      // First find the compendium to get its ObjectId
      const compendium = await CompendiumModel.findOne({ slug: compendiumSlug }).lean();
      if (!compendium) {
        throw new Error('Compendium not found');
      }

      // Verify content exists
      let content;
      let contentName = '';
      
      switch (contentType) {
        case 'Actor':
          content = await ActorModel.findById(contentId);
          contentName = content?.name || '';
          break;
        case 'Item':
          content = await ItemModel.findById(contentId);
          contentName = content?.name || '';
          break;
        case 'VTTDocument':
          content = await VTTDocumentModel.findById(contentId);
          contentName = content?.name || '';
          break;
      }
      
      if (!content) {
        throw new Error(`${contentType} with ID ${contentId} not found`);
      }
      
      // Create entry using the ObjectId
      const entry = await this.createCompendiumEntry({
        compendiumId: compendium._id.toString(),
        contentType,
        contentId,
        name: entryData.name || contentName,
        tags: entryData.tags || [],
        category: entryData.category,
        sortOrder: entryData.sortOrder || 0,
        isActive: entryData.isActive !== undefined ? entryData.isActive : true,
        userData: entryData.userData,
        sourceId: entryData.sourceId,
        sourceData: entryData.sourceData
      }, createdBy);
      
      // Update content with compendium reference using ObjectId
      await this.updateContentCompendiumId(contentType, contentId, compendium._id.toString());
      
      return entry;
    } catch (error) {
      logger.error('Error linking content to compendium:', error);
      throw new Error('Failed to link content to compendium');
    }
  }
  */

  /**
   * Unlink content from compendium
   */
  async unlinkContentFromCompendium(entryId: string): Promise<void> {
    try {
      const entry = await CompendiumEntryModel.findById(entryId);
      if (!entry) {
        throw new Error('Compendium entry not found');
      }
      
      // Since content is now embedded, we just delete the entry
      // No need to update external content records
      await CompendiumEntryModel.findByIdAndDelete(entryId);
    } catch (error) {
      logger.error('Error unlinking content from compendium:', error);
      throw new Error('Failed to unlink content from compendium');
    }
  }

  /**
   * Update content's compendiumId field
   * NOTE: This method is designed for the old schema where content was stored separately.
   * With the new embedded content schema, this method is no longer needed.
   */
  /*
  private async updateContentCompendiumId(
    contentType: 'Actor' | 'Item' | 'VTTDocument',
    contentId: string,
    compendiumId: string | null
  ): Promise<void> {
    const update = compendiumId ? { compendiumId } : { $unset: { compendiumId: 1 } };
    
    switch (contentType) {
      case 'Actor':
        await ActorModel.findByIdAndUpdate(contentId, update);
        break;
      case 'Item':
        await ItemModel.findByIdAndUpdate(contentId, update);
        break;
      case 'VTTDocument':
        await VTTDocumentModel.findByIdAndUpdate(contentId, update);
        break;
    }
  }
  */

  /**
   * Get compendium statistics
   */
  async getCompendiumStats(slug: string): Promise<{
    totalEntries: number;
    entriesByType: Record<string, number>;
    entriesByCategory: Record<string, number>;
  }> {
    try {
      // First find the compendium to get its ObjectId
      const compendium = await CompendiumModel.findOne({ slug }).lean();
      if (!compendium) {
        throw new Error('Compendium not found');
      }

      const compendiumId = compendium._id;
      const [totalEntries, entriesByType, entriesByCategory] = await Promise.all([
        CompendiumEntryModel.countDocuments({ compendiumId, isActive: true }),
        
        CompendiumEntryModel.aggregate([
          { $match: { compendiumId: new Types.ObjectId(compendiumId), isActive: true } },
          { $group: { _id: '$embeddedContent.type', count: { $sum: 1 } } }
        ]),
        
        CompendiumEntryModel.aggregate([
          { $match: { compendiumId: new Types.ObjectId(compendiumId), isActive: true, category: { $exists: true } } },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ])
      ]);
      
      return {
        totalEntries,
        entriesByType: entriesByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        entriesByCategory: entriesByCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Error getting compendium stats:', error);
      throw new Error('Failed to get compendium statistics');
    }
  }
}

export const compendiumService = new CompendiumService();