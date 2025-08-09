import { Types, PipelineStage } from 'mongoose';
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
        .sort({ name: 1 });
      
      return compendiums.map(comp => comp.toObject());
    } catch (error) {
      logger.error('Error fetching compendiums:', error);
      throw new Error('Failed to get compendiums');
    }
  }

  /**
   * Get compendium by ID
   */
  async getCompendiumById(id: string): Promise<ICompendium> {
    try {
      const compendium = await CompendiumModel.findById(id).lean();
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
   * Update compendium by ID
   */
  async updateCompendium(id: string, data: ICompendiumUpdateData, updatedBy: string): Promise<ICompendium> {
    try {
      const compendium = await CompendiumModel.findByIdAndUpdate(
        id,
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
   * Delete compendium and all its entries by ID
   */
  async deleteCompendium(id: string): Promise<void> {
    try {
      const session = await CompendiumModel.startSession();
      await session.withTransaction(async () => {
        // Find the compendium by ID
        const compendium = await CompendiumModel.findById(id).session(session);
        if (!compendium) {
          throw new Error('Compendium not found');
        }
        
        // Delete all entries using the ObjectId
        await CompendiumEntryModel.deleteMany({ compendiumId: compendium._id }).session(session);
        
        // Delete the compendium by ID
        await CompendiumModel.findByIdAndDelete(id).session(session);
      });
    } catch (error) {
      logger.error('Error deleting compendium:', error);
      throw new Error('Failed to delete compendium');
    }
  }

  /**
   * Get all entries for a compendium by ID
   */
  async getCompendiumEntries(id: string, filters?: {
    contentType?: string;
    pluginDocumentType?: string;
    isActive?: boolean;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: string;
  }): Promise<{
    entries: ICompendiumEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      // Get the compendium by ID
      const compendium = await CompendiumModel.findById(id).lean();
      if (!compendium) {
        throw new Error('Compendium not found');
      }

      const query: Record<string, QueryValue> = { compendiumId: compendium._id };
      
      if (filters?.contentType) query['entry.documentType'] = filters.contentType;
      if (filters?.pluginDocumentType) query['content.pluginDocumentType'] = filters.pluginDocumentType;
      if (filters?.isActive !== undefined) query.isActive = filters.isActive;
      if (filters?.category) query.category = filters.category;
      if (filters?.search) {
        query.$text = { $search: filters.search };
      }
      
      // Build sort object
      let sortObj: Record<string, 1 | -1> = { 'entry.sortOrder': 1, 'entry.name': 1 };
      if (filters?.sort) {
        const sortField = filters.sort;
        const sortOrder = filters.order === 'desc' ? -1 : 1;
        
        // Map frontend sort fields to database fields
        const fieldMap: Record<string, string> = {
          'createdAt': 'createdAt',
          'updatedAt': 'updatedAt',
          'name': 'entry.name',
          'type': 'entry.documentType'
        };
        
        const dbField = fieldMap[sortField] || sortField;
        sortObj = { [dbField]: sortOrder };
      }

      // Build the query with pagination
      let entriesQuery = CompendiumEntryModel.find(query).sort(sortObj);
      
      // Apply pagination if provided
      if (filters?.page && filters?.limit) {
        const skip = (filters.page - 1) * filters.limit;
        entriesQuery = entriesQuery.skip(skip).limit(filters.limit);
      }
      
      // Get total count (without pagination) for the same query
      const total = await CompendiumEntryModel.countDocuments(query);
      
      const entries = await entriesQuery.lean();
      
      // Manually populate asset fields for each entry based on content type
      for (const entry of entries) {
        // Collect asset IDs to populate (both entry-level and content-level)
        const assetIds: string[] = [];
        const assetFieldMap: Record<string, string> = {};
        
        // Add entry-level imageId if present
        if (entry.entry.imageId) {
          assetIds.push(entry.entry.imageId.toString());
          assetFieldMap[entry.entry.imageId.toString()] = 'entry.image';
        }
        
        // Add content-level asset IDs if present
        if (entry.content) {
          const content = entry.content as IEmbeddedContentData;
          
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
                if (entry.content) {
                  (entry.content as IEmbeddedContentData)[fieldName] = asset;
                }
              }
            }
          }
        }
      }
      
      // Map _id to id for each entry and remove _id field
      const mappedEntries = entries.map(entry => {
        const { _id, ...rest } = entry;
        return {
          ...rest,
          id: _id?.toString() || entry.id,
        };
      });

      return {
        entries: mappedEntries,
        total,
        page: filters?.page || 1,
        limit: filters?.limit || 20
      };
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
      if (entry.entry.imageId) {
        assetIds.push(entry.entry.imageId.toString());
        assetFieldMap[entry.entry.imageId.toString()] = 'entry.image';
      }
      if (entry.content) {
        const content = entry.content as IEmbeddedContentData;
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
            if (entry.content) {
              (entry.content as IEmbeddedContentData)[fieldName] = asset;
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
   * Get all entries across all compendiums with optional filtering using aggregation
   */
  async getAllCompendiumEntries(filters?: {
    pluginId?: string;
    documentType?: string;
    pluginDocumentType?: string;
    isActive?: boolean;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: string;
  }): Promise<{
    entries: ICompendiumEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      // Build aggregation pipeline
      const pipeline: PipelineStage[] = [];
      
      // If we have a text search, it MUST be the first stage
      if (filters?.search) {
        pipeline.push({
          $match: {
            $text: { $search: filters.search }
          }
        });
      }
      
      // Join with compendiums collection to get pluginId
      pipeline.push({
        $lookup: {
          from: 'compendia',
          localField: 'compendiumId',
          foreignField: '_id',
          as: 'compendium'
        }
      });
      
      // Unwind compendium array (should only be one)
      pipeline.push({
        $unwind: '$compendium'
      });
      
      // Add compendium fields to root for easier filtering
      pipeline.push({
        $addFields: {
          'compendium.pluginId': '$compendium.pluginId'
        }
      });
      
      // Build the main match stage for other filters
      const mainMatchStage: Record<string, unknown> = {};
      
      if (filters?.documentType) mainMatchStage['entry.documentType'] = filters.documentType;
      if (filters?.pluginDocumentType) mainMatchStage['content.pluginDocumentType'] = filters.pluginDocumentType;
      if (filters?.isActive !== undefined) mainMatchStage.isActive = filters.isActive;
      if (filters?.category) mainMatchStage.category = filters.category;
      if (filters?.pluginId) mainMatchStage['compendium.pluginId'] = filters.pluginId;
      
      // Add the main match stage if we have filters
      if (Object.keys(mainMatchStage).length > 0) {
        pipeline.push({ $match: mainMatchStage });
      }

      // Build sort stage
      let sortStage: Record<string, 1 | -1> = { 'entry.sortOrder': 1, 'entry.name': 1 };
      if (filters?.sort) {
        const sortField = filters.sort;
        const sortOrder = filters.order === 'desc' ? -1 : 1;
        
        // Map frontend sort fields to database fields
        const fieldMap: Record<string, string> = {
          'createdAt': 'createdAt',
          'updatedAt': 'updatedAt',
          'name': 'entry.name',
          'type': 'entry.documentType'
        };
        
        const dbField = fieldMap[sortField] || sortField;
        sortStage = { [dbField]: sortOrder };
      }

      // Add sort stage
      pipeline.push({ $sort: sortStage });

      // Get total count first (before pagination)
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await CompendiumEntryModel.aggregate(countPipeline);
      const total = countResult.length > 0 ? countResult[0].total : 0;

      // Add pagination if provided
      if (filters?.page && filters?.limit) {
        const skip = (filters.page - 1) * filters.limit;
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: filters.limit });
      }

      // Remove compendium field from output (we only needed it for filtering)
      pipeline.push({
        $project: {
          compendium: 0
        }
      });

      // Execute aggregation
      const entries = await CompendiumEntryModel.aggregate(pipeline);
      
      // Manually populate asset fields for each entry (same logic as getCompendiumEntries)
      for (const entry of entries) {
        // Collect asset IDs to populate (both entry-level and content-level)
        const assetIds: string[] = [];
        const assetFieldMap: Record<string, string> = {};
        
        // Add entry-level imageId if present
        if (entry.entry.imageId) {
          assetIds.push(entry.entry.imageId.toString());
          assetFieldMap[entry.entry.imageId.toString()] = 'entry.image';
        }
        
        // Add content-level asset IDs if present
        if (entry.content) {
          const content = entry.content as IEmbeddedContentData;
          
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
                if (entry.content) {
                  (entry.content as IEmbeddedContentData)[fieldName] = asset;
                }
              }
            }
          }
        }
      }
      
      // Map _id to id for each entry and remove _id field
      const mappedEntries = entries.map(entry => {
        const { _id, ...rest } = entry;
        return {
          ...rest,
          id: _id?.toString() || entry.id,
        };
      });

      return {
        entries: mappedEntries,
        total,
        page: filters?.page || 1,
        limit: filters?.limit || 20
      };
    } catch (error: unknown) {
      logger.error('Error fetching all compendium entries:', error);
      throw new Error('Failed to get compendium entries');
    }
  }

  /**
   * Get compendium statistics
   */
  async getCompendiumStats(id: string): Promise<{
    totalEntries: number;
    entriesByType: Record<string, number>;
    entriesByCategory: Record<string, number>;
  }> {
    try {
      // Get the compendium by ID
      const compendium = await CompendiumModel.findById(id).lean();
      if (!compendium) {
        throw new Error('Compendium not found');
      }

      const compendiumId = compendium._id;
      const [totalEntries, entriesByType, entriesByCategory] = await Promise.all([
        CompendiumEntryModel.countDocuments({ compendiumId, isActive: true }),
        
        CompendiumEntryModel.aggregate([
          { $match: { compendiumId: new Types.ObjectId(compendiumId), isActive: true } },
          { $group: { _id: '$entry.documentType', count: { $sum: 1 } } }
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