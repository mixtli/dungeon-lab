import type { BaseDocument, IActor, ICharacter, IItem, IItemWithVirtuals, IVTTDocument } from '@dungeon-lab/shared/types/index.mjs';
import { DocumentModel } from '../models/document.model.mjs';
import { ActorDocumentModel } from '../models/actor-document.model.mjs';
import { CharacterDocumentModel } from '../models/character-document.model.mjs';
import { ItemDocumentModel } from '../models/item-document.model.mjs';
import { VTTDocumentModel } from '../models/vtt-document.model.mjs';
import mongoose, { type FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';

// Define a type for document query values
export type QueryValue = string | number | boolean | RegExp | Date | object;

/**
 * Unified Document Service
 * Provides a single interface for working with all document types (Actor, Item, VTTDocument)
 * using the discriminator pattern for type-safe operations.
 */
export class DocumentService {
  
  /**
   * Create a new document of any type using proper discriminator routing
   */
  static async create<T extends BaseDocument>(
    documentData: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    // Extract documentType and remove it from the data (discriminator keys are auto-set)
    const { documentType, ...dataWithoutDiscriminator } = documentData;
    
    // Route to the appropriate discriminator model
    let document: mongoose.Document;
    switch (documentType) {
      case 'actor':
        document = new ActorDocumentModel(dataWithoutDiscriminator);
        break;
      case 'character':
        document = new CharacterDocumentModel(dataWithoutDiscriminator);
        break;
      case 'item':
        document = new ItemDocumentModel(dataWithoutDiscriminator);
        break;
      case 'vtt-document':
        document = new VTTDocumentModel(dataWithoutDiscriminator);
        break;
      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }
    
    return await document.save() as unknown as T;
  }

  /**
   * Find a single document by ID
   */
  static async findById<T extends BaseDocument = BaseDocument>(
    id: string,
    options?: QueryOptions
  ): Promise<T | null> {
    return await DocumentModel.findById(id, undefined, options)
      .populate('tokenImage')
      .populate('avatar') as T | null;
  }

  /**
   * Find a single document by filter
   */
  static async findOne<T extends BaseDocument = BaseDocument>(
    filter: FilterQuery<BaseDocument>,
    options?: QueryOptions
  ): Promise<T | null> {
    return await DocumentModel.findOne(filter, undefined, options)
      .populate('tokenImage')
      .populate('avatar') as T | null;
  }

  /**
   * Find multiple documents by filter
   */
  static async find<T extends BaseDocument = BaseDocument>(
    filter: FilterQuery<BaseDocument> = {},
    options?: QueryOptions
  ): Promise<T[]> {
    const results = await DocumentModel.find(filter, undefined, options)
      .populate('tokenImage')
      .populate('avatar');
    return results.map(doc => doc.toObject()) as unknown as T[];
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
      const savedActor = await actor.save();
      return savedActor.toObject({ virtuals: true }) as IActor;
    },

    /**
     * Find actors by campaign
     */
    async findByCampaign(campaignId: string, options?: QueryOptions): Promise<IActor[]> {
      return await ActorDocumentModel.find({ campaignId }, undefined, options);
    },

    /**
     * Get actor's inventory using ownerId relationships
     */
    async getInventory(actorId: string, campaignId?: string): Promise<IItem[]> {
      return await DocumentService.inventory.getOwnedItems(actorId, campaignId);
    },

    /**
     * Get actor's inventory with populated asset data
     */
    async getInventoryPopulated(actorId: string, campaignId?: string): Promise<IItem[]> {
      return await DocumentService.inventory.getOwnedItemsPopulated(actorId, campaignId);
    }
  };

  /**
   * Type-specific service methods for Characters
   */
  static character = {
    /**
     * Create a new character
     */
    async create(characterData: Omit<ICharacter, 'id' | 'createdAt' | 'updatedAt'>): Promise<ICharacter> {
      const character = new CharacterDocumentModel(characterData);
      const savedCharacter = await character.save();
      return savedCharacter.toObject({ virtuals: true }) as ICharacter;
    },

    /**
     * Find characters owned by a specific user
     */
    async findByUser(userId: string, options?: QueryOptions): Promise<ICharacter[]> {
      return await CharacterDocumentModel.find({ $or: [{ ownerId: userId }, { createdBy: userId }] }, undefined, options);
    },

    /**
     * Find characters in a specific campaign
     */
    async findByCampaign(campaignId: string, options?: QueryOptions): Promise<ICharacter[]> {
      return await CharacterDocumentModel.find({ campaignId }, undefined, options);
    },

    /**
     * Get character's inventory using ownerId relationships
     */
    async getInventory(characterId: string, campaignId?: string): Promise<IItem[]> {
      return await DocumentService.inventory.getOwnedItems(characterId, campaignId);
    },

    /**
     * Get character's inventory with populated asset data
     */
    async getInventoryPopulated(characterId: string, campaignId?: string): Promise<IItem[]> {
      return await DocumentService.inventory.getOwnedItemsPopulated(characterId, campaignId);
    },

    /**
     * Join a campaign (set campaignId)
     */
    async joinCampaign(characterId: string, campaignId: string): Promise<ICharacter | null> {
      return await CharacterDocumentModel.findByIdAndUpdate(
        characterId,
        { campaignId },
        { new: true, runValidators: true }
      );
    },

    /**
     * Leave a campaign (unset campaignId)
     */
    async leaveCampaign(characterId: string): Promise<ICharacter | null> {
      return await CharacterDocumentModel.findByIdAndUpdate(
        characterId,
        { $unset: { campaignId: 1 } },
        { new: true }
      );
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
      const savedItem = await item.save();
      return savedItem.toObject({ virtuals: true }) as IItem;
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
      return await DocumentService.create<IVTTDocument>(vttDocData);
    },

    /**
     * Find VTT documents by campaign
     */
    async findByCampaign(campaignId: string, options?: QueryOptions): Promise<IVTTDocument[]> {
      const filter = { campaignId, documentType: 'vtt-document' };
      return await DocumentService.find<IVTTDocument>(filter, options);
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
      return await DocumentService.findOne<IVTTDocument>(filter);
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
        pluginDocumentType,
        documentType: 'vtt-document'
      };
      if (campaignId) {
        filter.campaignId = campaignId;
      }
      return await DocumentService.find<IVTTDocument>(filter);
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

      // Find all actors in the campaign
      const actors = await ActorDocumentModel.find({ 
        campaignId
      });

      // Check that all items owned by actors belong to the same campaign
      for (const actor of actors) {
        const actorDoc = actor.toObject({ virtuals: true }) as IActor;
        // Find items owned by this actor using relationship-based inventory
        const ownedItems = await DocumentModel.find({ 
          ownerId: actorDoc.id,
          documentType: 'item'
        });
        
        for (const item of ownedItems) {
          if (item.campaignId?.toString() !== campaignId) {
            errors.push(
              `Actor ${actorDoc.name} (${actorDoc.id}) has owned item ${item.id} from different campaign ${item.campaignId}`
            );
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    }
  };

  /**
   * Inventory management using ownerId relationships
   */
  static inventory = {
    /**
     * Get all items owned by a character or actor
     */
    async getOwnedItems(ownerId: string, campaignId?: string): Promise<IItem[]> {
      const filter: FilterQuery<IItem> = { 
        ownerId,
        documentType: 'item'
      };
      if (campaignId) {
        filter.campaignId = campaignId;
      }
      return await DocumentService.find<IItem>(filter);
    },

    /**
     * Get owned items with population of asset data
     */
    async getOwnedItemsPopulated(ownerId: string, campaignId?: string): Promise<IItemWithVirtuals[]> {
      const filter: FilterQuery<IItem> = { 
        ownerId,
        documentType: 'item'
      };
      if (campaignId) {
        filter.campaignId = campaignId;
      }
      const items = await ItemDocumentModel.find(filter)
        .populate('image')
        .populate('thumbnail');
      return items.map(item => item.toObject({ virtuals: true })) as IItemWithVirtuals[];
    },

    /**
     * Set item owner (transfer ownership)
     */
    async setOwner(itemId: string, newOwnerId: string | null): Promise<IItem | null> {
      return await DocumentService.updateById<IItem>(itemId, { 
        ownerId: newOwnerId || undefined 
      });
    },

    /**
     * Get inventory summary for an owner
     */
    async getInventorySummary(ownerId: string, campaignId?: string): Promise<{
      totalItems: number;
      itemsByType: Record<string, number>;
      items: IItem[];
    }> {
      const items = await this.getOwnedItems(ownerId, campaignId);
      
      const itemsByType: Record<string, number> = {};
      items.forEach(item => {
        const type = item.pluginDocumentType || 'unknown';
        itemsByType[type] = (itemsByType[type] || 0) + 1;
      });

      return {
        totalItems: items.length,
        itemsByType,
        items
      };
    }
  };

}
