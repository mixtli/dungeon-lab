import { Types } from 'mongoose';
import { IItem } from '@dungeon-lab/shared/index.mjs';
import { ItemModel } from '../models/item.model.mjs';
import { logger } from '../../../utils/logger.mjs';
import { deepMerge } from '@dungeon-lab/shared/utils/deepMerge.mjs';
import { createAsset } from '../../../utils/asset-upload.utils.mjs';
import { AssetModel } from '../../../features/assets/models/asset.model.mjs';

// Define a type for item query values, similar to document service
export type QueryValue = string | number | boolean | RegExp | Date | object;

export class ItemService {
  async getAllItems(): Promise<IItem[]> {
    try {
      const items = await ItemModel.find();
      return items;
    } catch (error) {
      logger.error('Error fetching items:', error);
      throw new Error('Failed to get items');
    }
  }

  async getItemById(id: string): Promise<IItem> {
    try {
      const item = await ItemModel.findById(id);
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
      const items = await ItemModel.find({ campaignId });
      return items;
    } catch (error) {
      logger.error('Error getting items:', error);
      throw new Error('Failed to get items');
    }
  }

  async createItem(data: IItem, userId: string): Promise<IItem> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const itemData = {
        ...data,
        createdBy: userObjectId,
        updatedBy: userObjectId
      };

      const item = await ItemModel.create(itemData);
      return item;
    } catch (error) {
      logger.error('Error creating item:', error);
      throw new Error('Failed to create item');
    }
  }

  async updateItem(id: string, data: Partial<IItem>, userId: string): Promise<IItem> {
    try {
      const item = await ItemModel.findById(id);
      if (!item) {
        throw new Error('Item not found');
      }

      const userObjectId = new Types.ObjectId(userId);
      const updateData = {
        ...data,
        updatedBy: userObjectId
      };

      const updatedItem = await ItemModel.findByIdAndUpdate(id, updateData, { new: true });

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
      const item = await ItemModel.findByIdAndDelete(id);
      if (!item) {
        throw new Error('Item not found');
      }
    } catch (error) {
      logger.error('Error deleting item:', error);
      throw new Error('Failed to delete item');
    }
  }

  async checkUserPermission(itemId: string, userId: string, isAdmin: boolean): Promise<boolean> {
    try {
      const item = await ItemModel.findById(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      return item.createdBy === userId || isAdmin;
    } catch (error) {
      logger.error('Error checking user permission:', error);
      throw new Error('Failed to check user permission');
    }
  }

  async putItem(id: string, data: IItem, userId: string, imageFile?: File): Promise<IItem> {
    try {
      const item = await ItemModel.findById(id);
      if (!item) {
        throw new Error('Item not found');
      }

      const userObjectId = new Types.ObjectId(userId);
      const updateData = {
        ...data,
        updatedBy: userObjectId
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
      item.set(updateData);
      await item.save();

      return item.populate('image');
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
      const item = await ItemModel.findById(id);
      if (!item) {
        throw new Error('Item not found');
      }

      const userObjectId = new Types.ObjectId(userId);
      const updateData = {
        ...data,
        updatedBy: userObjectId
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
      const obj = item.toObject();
      item.set(deepMerge(obj, updateData));
      await item.save();

      return item.populate('image');
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
      const existingItem = await ItemModel.findById(id);
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
      const updatedItem = await ItemModel.findByIdAndUpdate(
        id,
        {
          imageId: newImageAsset.id,
          updatedBy: userId
        },
        { new: true }
      ).populate('image');

      if (!updatedItem) {
        throw new Error('Item not found after update');
      }

      return updatedItem;
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
      // Only convert simple string values, not nested paths
      const mongoQuery = Object.entries(query).reduce((acc, [key, value]) => {
        if (typeof value === 'string' && !key.includes('.')) {
          acc[key] = new RegExp(value, 'i');
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, QueryValue>);

      logger.debug('Searching items with query:', mongoQuery);
      const items = await ItemModel.find(mongoQuery).populate('image');
      logger.debug(`Found ${items.length} items matching query`);
      return items;
    } catch (error) {
      logger.error('Error searching items:', error);
      throw new Error('Failed to search items');
    }
  }
}
