import { Types } from 'mongoose';
import { IItem } from '@dungeon-lab/shared/index.mjs';
import { ItemModel } from '../models/item.model.mjs';
import { logger } from '../../../utils/logger.mjs';

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

      const updatedItem = await ItemModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

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
} 