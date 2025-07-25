import type { IItem } from '@dungeon-lab/shared/types/index.mjs';
import { DocumentService } from '../../documents/services/document.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { deepMerge } from '@dungeon-lab/shared/utils/index.mjs';
import { createAsset } from '../../../utils/asset-upload.utils.mjs';
import { AssetModel } from '../../../features/assets/models/asset.model.mjs';

// Define a type for item query values, similar to document service
export type QueryValue = string | number | boolean | RegExp | Date | object;

export class ItemService {

  async getAllItems(): Promise<IItem[]> {
    try {
      const items = await DocumentService.find<IItem>({ documentType: 'item' });
      return items;
    } catch (error) {
      logger.error('Error fetching items:', error);
      throw new Error('Failed to get items');
    }
  }

  async getItemById(id: string): Promise<IItem> {
    try {
      const item = await DocumentService.findById<IItem>(id);
      if (!item) {
        throw new Error('Item not found');
      }
      return item;
    } catch (error) {
      logger.error('Error fetching item:', error);
      throw new Error('Failed to get item');
    }
  }

  async getItems(campaignId: string): Promise<IItem[]> {
    try {
      const filter = { campaignId, documentType: 'item' };
      const items = await DocumentService.find<IItem>(filter);
      return items;
    } catch (error) {
      logger.error('Error getting items:', error);
      throw new Error('Failed to get items');
    }
  }

  async createItem(data: Omit<IItem, 'id'>, userId: string, file?: File): Promise<IItem> {
    try {
      const itemData = {
        ...data,
        createdBy: userId,
        updatedBy: userId
      };

      const item = await DocumentService.create<IItem>(itemData);
      if (file) {
        logger.info('Uploading provided item image');

        // Create asset using the createAsset method
        const imageAsset = await createAsset(file, 'items', userId);

        // Update the item with the image ID
        await DocumentService.updateById<IItem>(item.id, { imageId: imageAsset.id });
      }
      // Return the item with populated image
      const updatedItem = await DocumentService.findById<IItem>(item.id, { populate: ['image'] });
      if (!updatedItem) {
        throw new Error('Item not found after creation');
      }
      return updatedItem;
    } catch (error) {
      logger.error('Error creating item:', error);
      throw new Error('Failed to create item');
    }
  }

  async updateItem(id: string, data: Partial<IItem>, userId: string): Promise<IItem> {
    try {
      const item = await DocumentService.findById<IItem>(id);
      if (!item) {
        throw new Error('Item not found');
      }

      const updateData = {
        ...data,
        updatedBy: userId
      };

      const updatedItem = await DocumentService.updateById<IItem>(id, updateData);

      if (!updatedItem) {
        throw new Error('Failed to update item');
      }

      return updatedItem;
    } catch (error) {
      logger.error('Error updating item:', error);
      throw new Error('Failed to update item');
    }
  }

  async deleteItem(id: string): Promise<void> {
    try {
      const success = await DocumentService.deleteById(id);
      if (!success) {
        throw new Error('Item not found');
      }
    } catch (error) {
      logger.error('Error deleting item:', error);
      throw new Error('Failed to delete item');
    }
  }

  async checkUserPermission(itemId: string, userId: string, isAdmin: boolean): Promise<boolean> {
    try {
      const item = await DocumentService.findById<IItem>(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      return item.createdBy === userId || isAdmin;
    } catch (error) {
      logger.error('Error checking user permission:', error);
      throw new Error('Failed to check user permission');
    }
  }

  async putItem(
    id: string,
    data: Omit<IItem, 'id'>,
    userId: string,
    imageFile?: File
  ): Promise<IItem> {
    try {
      const item = await DocumentService.findById<IItem>(id);
      if (!item) {
        throw new Error('Item not found');
      }

      const updateData = {
        ...data,
        updatedBy: userId
      };

      // Handle image file if provided
      if (imageFile) {
        // Create asset using the createAsset method
        const newImageAsset = await createAsset(imageFile, 'uploads/items', userId);

        // Delete the old image asset if it exists and is different
        if (item.imageId && item.imageId.toString() !== newImageAsset.id.toString()) {
          try {
            const oldAsset = await AssetModel.findById(item.imageId);
            if (oldAsset) {
              await oldAsset.deleteOne();
              logger.info(`Deleted old image asset ${item.imageId} for item ${id}`);
            }
          } catch (deleteError) {
            logger.warn(`Could not delete old image asset ${item.imageId}:`, deleteError);
          }
        }

        // Update image ID in item data
        updateData.imageId = newImageAsset.id;
      }

      // Replace the entire item (PUT)
      const updatedItem = await DocumentService.updateById<IItem>(id, updateData);
      if (!updatedItem) {
        throw new Error('Failed to update item');
      }

      // Return with populated fields
      const itemWithPopulation = await DocumentService.findById<IItem>(id, { populate: ['image'] });
      if (!itemWithPopulation) {
        throw new Error('Item not found after update');
      }
      return itemWithPopulation;
    } catch (error) {
      logger.error('Error replacing item:', error);
      throw new Error('Failed to replace item');
    }
  }

  async patchItem(
    id: string,
    data: Partial<IItem>,
    userId: string,
    imageFile?: File
  ): Promise<IItem> {
    try {
      const item = await DocumentService.findById<IItem>(id);
      if (!item) {
        throw new Error('Item not found');
      }

      const updateData = {
        ...data,
        updatedBy: userId
      };

      // Handle image file if provided
      if (imageFile) {
        // Create asset using the createAsset method
        const newImageAsset = await createAsset(imageFile, 'uploads/items', userId);

        // Delete the old image asset if it exists and is different
        if (item.imageId && item.imageId.toString() !== newImageAsset.id.toString()) {
          try {
            const oldAsset = await AssetModel.findById(item.imageId);
            if (oldAsset) {
              await oldAsset.deleteOne();
              logger.info(`Deleted old image asset ${item.imageId} for item ${id}`);
            }
          } catch (deleteError) {
            logger.warn(`Could not delete old image asset ${item.imageId}:`, deleteError);
          }
        }

        // Update image ID in item data
        updateData.imageId = newImageAsset.id;
      }

      // Apply partial update using deepMerge (PATCH)
      const obj = item;
      const mergedData = deepMerge(obj, updateData);
      
      const updatedItem = await DocumentService.updateById<IItem>(id, mergedData);
      if (!updatedItem) {
        throw new Error('Failed to update item');
      }

      // Return with populated fields
      const itemWithPopulation = await DocumentService.findById<IItem>(id, { populate: ['image'] });
      if (!itemWithPopulation) {
        throw new Error('Item not found after update');
      }
      return itemWithPopulation;
    } catch (error) {
      logger.error('Error patching item:', error);
      throw new Error('Failed to patch item');
    }
  }

  /**
   * Update an item's image with a file
   * @param id - The ID of the item to update
   * @param file - The file object
   * @param userId - ID of the user updating the item
   */
  async updateItemImage(id: string, file: File, userId: string): Promise<IItem> {
    try {
      // Get existing item
      const existingItem = await DocumentService.findById<IItem>(id);
      if (!existingItem) {
        throw new Error('Item not found');
      }

      // Create the asset
      const newImageAsset = await createAsset(file, 'uploads/items', userId);

      // Delete the old image asset if it exists and is different
      if (existingItem.imageId && existingItem.imageId.toString() !== newImageAsset.id.toString()) {
        try {
          const oldAsset = await AssetModel.findById(existingItem.imageId);
          if (oldAsset) {
            await oldAsset.deleteOne();
            logger.info(`Deleted old image asset ${existingItem.imageId} for item ${id}`);
          }
        } catch (deleteError) {
          logger.warn(`Could not delete old image asset ${existingItem.imageId}:`, deleteError);
        }
      }

      // Update the item with the new image ID
      const updatedItem = await DocumentService.updateById<IItem>(
        id,
        {
          imageId: newImageAsset.id,
          updatedBy: userId
        }
      );

      if (!updatedItem) {
        throw new Error('Item not found after update');
      }

      // Return with populated fields
      const itemWithPopulation = await DocumentService.findById<IItem>(id, { populate: ['image'] });
      if (!itemWithPopulation) {
        throw new Error('Item not found after update');
      }

      return itemWithPopulation;
    } catch (error) {
      logger.error(`Error updating item image ${id}:`, error);
      if (error instanceof Error && error.message.includes('Item not found')) {
        throw error;
      }
      throw new Error(
        `Failed to update item image: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Search for items based on the provided query parameters
   * @param query - Object containing search parameters
   * @returns Array of items matching the search criteria
   */
  async searchItems(query: Record<string, QueryValue>): Promise<IItem[]> {
    try {
      // Convert query to case-insensitive regex for string values
      // Only convert simple string values, not nested paths or ObjectId fields
      const objectIdFields = ['createdBy', 'updatedBy', 'imageId', 'campaignId'];
      const mongoQuery = Object.entries(query).reduce((acc, [key, value]) => {
        if (typeof value === 'string' && !key.includes('.') && !objectIdFields.includes(key)) {
          acc[key] = new RegExp(value, 'i');
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, QueryValue>);

      logger.debug('Searching items with query:', mongoQuery);
      const items = await DocumentService.find<IItem>(mongoQuery, { populate: ['image'] });
      logger.debug(`Found ${items.length} items matching query`);
      return items;
    } catch (error) {
      logger.error('Error searching items:', error);
      throw new Error('Failed to search items');
    }
  }
}
