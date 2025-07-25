import type { BaseDocument, IActor, IItem, IVTTDocument } from '@dungeon-lab/shared/types/index.mjs';
import { DocumentModel, getDocumentModel } from '../models/document.model.mjs';
import { ActorDocumentModel } from '../models/actor-document.model.mjs';
import { ItemDocumentModel } from '../models/item-document.model.mjs';
import { VTTDocumentModel } from '../models/vtt-document.model.mjs';
import { logger } from '../../../utils/logger.mjs';
import { deepMerge } from '@dungeon-lab/shared/utils/index.mjs';
import type { FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';

// Define a type for document query values
export type QueryValue = string | number | boolean | RegExp | Date | object;

/**
 * Unified Document Service
 * Provides a single interface for working with all document types (Actor, Item, VTTDocument)
 * using the discriminator pattern for type-safe operations.
 */
export class DocumentService {
  
  /**
   * Create a new document of any type
   */
  static async create<T extends BaseDocument>(
    documentData: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    const Model = await getDocumentModel(documentData.documentType);
    const document = new Model(documentData);
    return await document.save() as unknown as T;
  }

  /**
   * Find a single document by ID
   */
  static async findById<T extends BaseDocument = BaseDocument>(
    id: string,
    options?: QueryOptions
  ): Promise<T | null> {
    return await DocumentModel.findById(id, undefined, options) as T | null;
  }

  /**
   * Find a single document by filter
   */
  static async findOne<T extends BaseDocument = BaseDocument>(
    filter: FilterQuery<BaseDocument>,
    options?: QueryOptions
  ): Promise<T | null> {
    return await DocumentModel.findOne(filter, undefined, options) as T | null;
  }

  /**
   * Find multiple documents by filter
   */
  static async find<T extends BaseDocument = BaseDocument>(
    filter: FilterQuery<BaseDocument> = {},
    options?: QueryOptions
  ): Promise<T[]> {
    return await DocumentModel.find(filter, undefined, options) as T[];
  }

  /**
   * Update a document by ID
   */
  static async updateById<T extends BaseDocument>(
    id: string,
    update: UpdateQuery<T>,
    options?: QueryOptions
  ): Promise<T | null> {
    return await DocumentModel.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true, ...options }
    ) as T | null;
  }

  /**
   * Update multiple documents by filter
   */
  static async updateMany(
    filter: FilterQuery<BaseDocument>,
    update: UpdateQuery<BaseDocument>,
    options?: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    const result = await DocumentModel.updateMany(filter, update, options);
    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    };
  }

  /**
   * Delete a document by ID
   */
  static async deleteById(id: string): Promise<boolean> {
    const result = await DocumentModel.findByIdAndDelete(id);
    return result !== null;
  }

  /**
   * Delete multiple documents by filter
   */
  static async deleteMany(filter: FilterQuery<BaseDocument>): Promise<number> {
    const result = await DocumentModel.deleteMany(filter);
    return result.deletedCount;
  }

  /**
   * Count documents matching filter
   */
  static async count(filter: FilterQuery<BaseDocument> = {}): Promise<number> {
    return await DocumentModel.countDocuments(filter);
  }

  /**
   * Type-specific service methods for Actors
   */
  static actor = {
    /**
     * Create a new actor
     */
    async create(actorData: Omit<IActor, 'id' | 'createdAt' | 'updatedAt'>): Promise<IActor> {
      const actor = new ActorDocumentModel(actorData);
      return await actor.save();
    },

    /**
     * Find actors by campaign
     */
    async findByCampaign(campaignId: string, options?: QueryOptions): Promise<IActor[]> {
      return await ActorDocumentModel.find({ campaignId }, undefined, options);
    },

    /**
     * Add item to actor's inventory
     */
    async addToInventory(
      actorId: string,
      inventoryItem: {
        itemId: string;
        quantity: number;
        equipped?: boolean;
        slot?: string;
        condition?: number;
        metadata?: Record<string, unknown>;
      }
    ): Promise<IActor | null> {
      return await ActorDocumentModel.findByIdAndUpdate(
        actorId,
        { $push: { inventory: inventoryItem } },
        { new: true, runValidators: true }
      );
    },

    /**
     * Remove item from actor's inventory
     */
    async removeFromInventory(actorId: string, itemId: string): Promise<IActor | null> {
      return await ActorDocumentModel.findByIdAndUpdate(
        actorId,
        { $pull: { inventory: { itemId } } },
        { new: true }
      );
    },

    /**
     * Update inventory item
     */
    async updateInventoryItem(
      actorId: string,
      itemId: string,
      updates: Partial<{
        quantity: number;
        equipped: boolean;
        slot: string;
        condition: number;
        metadata: Record<string, unknown>;
      }>
    ): Promise<IActor | null> {
      const updateFields: Record<string, unknown> = {};
      Object.entries(updates).forEach(([key, value]) => {
        updateFields[`inventory.$.${key}`] = value;
      });

      return await ActorDocumentModel.findOneAndUpdate(
        { _id: actorId, 'inventory.itemId': itemId },
        { $set: updateFields },
        { new: true, runValidators: true }
      );
    },

    /**
     * Find actors with specific item in inventory
     */
    async findWithItem(itemId: string, campaignId?: string): Promise<IActor[]> {
      const filter: FilterQuery<IActor> = { 'inventory.itemId': itemId };
      if (campaignId) {
        filter.campaignId = campaignId;
      }
      return await ActorDocumentModel.find(filter);
    }
  };

  /**
   * Type-specific service methods for Items
   */
  static item = {
    /**
     * Create a new item
     */
    async create(itemData: Omit<IItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<IItem> {
      const item = new ItemDocumentModel(itemData);
      return await item.save();
    },

    /**
     * Find items by campaign
     */
    async findByCampaign(campaignId: string, options?: QueryOptions): Promise<IItem[]> {
      return await ItemDocumentModel.find({ campaignId }, undefined, options);
    },

    /**
     * Find items by plugin document type
     */
    async findByPluginType(
      pluginId: string,
      pluginDocumentType: string,
      campaignId?: string
    ): Promise<IItem[]> {
      const filter: FilterQuery<IItem> = {
        pluginId,
        pluginDocumentType
      };
      if (campaignId) {
        filter.campaignId = campaignId;
      }
      return await ItemDocumentModel.find(filter);
    }
  };

  /**
   * Type-specific service methods for VTT Documents
   */
  static vttDocument = {
    /**
     * Create a new VTT document
     */
    async create(vttDocData: Omit<IVTTDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<IVTTDocument> {
      const vttDoc = new VTTDocumentModel(vttDocData);
      return await vttDoc.save();
    },

    /**
     * Find VTT documents by campaign
     */
    async findByCampaign(campaignId: string, options?: QueryOptions): Promise<IVTTDocument[]> {
      return await VTTDocumentModel.find({ campaignId }, undefined, options);
    },

    /**
     * Find VTT document by slug
     */
    async findBySlug(
      slug: string,
      pluginId: string,
      campaignId?: string
    ): Promise<IVTTDocument | null> {
      const filter: FilterQuery<IVTTDocument> = {
        slug,
        pluginId,
        documentType: 'vtt-document'
      };
      if (campaignId) {
        filter.campaignId = campaignId;
      }
      return await VTTDocumentModel.findOne(filter);
    },

    /**
     * Find VTT documents by plugin document type
     */
    async findByPluginType(
      pluginId: string,
      pluginDocumentType: string,
      campaignId?: string
    ): Promise<IVTTDocument[]> {
      const filter: FilterQuery<IVTTDocument> = {
        pluginId,
        pluginDocumentType
      };
      if (campaignId) {
        filter.campaignId = campaignId;
      }
      return await VTTDocumentModel.find(filter);
    }
  };

  /**
   * Utility methods for cross-document operations
   */
  static utils = {
    /**
     * Find all documents by campaign (across all types)
     */
    async findAllByCampaign(campaignId: string): Promise<BaseDocument[]> {
      return await DocumentModel.find({ campaignId });
    },

    /**
     * Find documents by plugin ID (across all types)
     */
    async findByPlugin(pluginId: string, campaignId?: string): Promise<BaseDocument[]> {
      const filter: FilterQuery<BaseDocument> = { pluginId };
      if (campaignId) {
        filter.campaignId = campaignId;
      }
      return await DocumentModel.find(filter);
    },

    /**
     * Get document statistics by campaign
     */
    async getStats(campaignId: string): Promise<{
      actors: number;
      items: number;
      vttDocuments: number;
      total: number;
    }> {
      const [actors, items, vttDocuments] = await Promise.all([
        DocumentModel.countDocuments({ campaignId, documentType: 'actor' }),
        DocumentModel.countDocuments({ campaignId, documentType: 'item' }),
        DocumentModel.countDocuments({ campaignId, documentType: 'vtt-document' })
      ]);

      return {
        actors,
        items,
        vttDocuments,
        total: actors + items + vttDocuments
      };
    },

    /**
     * Validate campaign boundary integrity
     */
    async validateCampaignIntegrity(campaignId: string): Promise<{
      valid: boolean;
      errors: string[];
    }> {
      const errors: string[] = [];

      // Find all actors with inventory
      const actors = await ActorDocumentModel.find({ 
        campaignId, 
        inventory: { $exists: true, $ne: [] } 
      });

      // Check that all inventory items belong to the same campaign
      for (const actor of actors) {
        const actorDoc = actor as IActor;
        if (actorDoc.inventory) {
          for (const invItem of actorDoc.inventory) {
            const item = await DocumentModel.findById(invItem.itemId);
            if (item && item.campaignId?.toString() !== campaignId) {
              errors.push(
                `Actor ${actorDoc.name} (${actorDoc.id}) has inventory item ${invItem.itemId} from different campaign ${item.campaignId}`
              );
            }
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    }
  };

  // Legacy methods for backward compatibility with existing VTT Document service
  async getDocumentById(id: string): Promise<IVTTDocument> {
    try {
      const document = await DocumentService.findById<IVTTDocument>(id);
      if (!document) {
        throw new Error('Document not found');
      }
      return document;
    } catch (error) {
      logger.error('Error fetching document:', error);
      throw error;
    }
  }

  async createDocument(document: Omit<IVTTDocument, 'id'>, userId: string): Promise<IVTTDocument> {
    try {
      const documentData = {
        ...document,
        createdBy: userId,
        updatedBy: userId
      };

      return await DocumentService.vttDocument.create(documentData);
    } catch (error) {
      logger.error('Error creating document:', error);
      throw error;
    }
  }

  async patchDocument(
    id: string,
    document: Partial<IVTTDocument>,
    userId: string
  ): Promise<IVTTDocument> {
    try {
      const existingDocument = await DocumentService.findById<IVTTDocument>(id);
      if (!existingDocument) {
        throw new Error('Document not found');
      }

      const updateData = {
        ...document,
        updatedBy: userId
      };

      const obj = existingDocument;
      const mergedData = deepMerge(obj, updateData);
      
      const updated = await DocumentService.updateById<IVTTDocument>(id, mergedData);
      if (!updated) {
        throw new Error('Failed to update document');
      }

      return updated;
    } catch (error) {
      logger.error('Error patching document:', error);
      throw error;
    }
  }

  async putDocument(
    id: string,
    document: Omit<IVTTDocument, 'id'>,
    userId: string
  ): Promise<IVTTDocument> {
    try {
      const updateData = {
        ...document,
        updatedBy: userId
      };

      const updated = await DocumentService.updateById<IVTTDocument>(id, updateData);
      if (!updated) {
        throw new Error('Document not found');
      }

      return updated;
    } catch (error) {
      logger.error('Error updating document:', error);
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    await DocumentService.deleteById(id);
  }

  async searchDocuments(query: Record<string, QueryValue>): Promise<IVTTDocument[]> {
    try {
      // Convert query to case-insensitive regex for string values
      // Only convert simple string values, not nested paths
      const mongoQuery = Object.entries(query).reduce((acc, [key, value]) => {
        if (typeof value === 'string' && !key.includes('.')) {
          acc[key] = new RegExp(value, 'i');
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, QueryValue>);

      // Add filter for VTT documents only
      const vttQuery = { ...mongoQuery, documentType: 'vtt-document' };
      
      return await DocumentService.find<IVTTDocument>(vttQuery);
    } catch (error) {
      logger.error('Error searching documents:', error);
      throw new Error('Failed to search documents');
    }
  }
}
