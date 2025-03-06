import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { ItemModel } from '../models/item.model.mjs';
import { AuthenticatedRequest } from '../middleware/auth.middleware.mjs';
import { IItemCreateData, IItemUpdateData } from '@dungeon-lab/shared/index.mjs';
import { logger } from '../utils/logger.mjs';

/**
 * Get all items
 * @route GET /api/items
 * @access Public
 */
export async function getAllItems(_: Request, res: Response) {
  try {
    const items = await ItemModel.find();
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get item by ID
 * @route GET /api/items/:id
 * @access Public
 */
export async function getItemById(req: Request, res: Response) {
  try {
    const item = await ItemModel.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid item ID' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get items for a campaign
 * @route GET /api/campaigns/:campaignId/items
 * @access Private
 */
export async function getItems(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const items = await ItemModel.find({ campaignId: req.params.campaignId });
    return res.json(items);
  } catch (error) {
    logger.error('Error getting items:', error);
    return res.status(500).json({ message: 'Failed to get items' });
  }
}

/**
 * Get a specific item
 * @route GET /api/items/:id
 * @access Private
 */
export async function getItem(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const item = await ItemModel.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    return res.json(item);
  } catch (error) {
    logger.error('Error getting item:', error);
    return res.status(500).json({ message: 'Failed to get item' });
  }
}

/**
 * Create a new item
 * @route POST /api/items
 * @access Private
 */
export async function createItem(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const userId = new Types.ObjectId(req.session.user.id);
    const itemData: IItemCreateData = {
      ...req.body,
      createdBy: userId,
      updatedBy: userId
    };

    const item = await ItemModel.create(itemData);
    return res.status(201).json(item);
  } catch (error) {
    logger.error('Error creating item:', error);
    return res.status(500).json({ message: 'Failed to create item' });
  }
}

/**
 * Update an item
 * @route PUT /api/items/:id
 * @access Private
 */
export async function updateItem(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const item = await ItemModel.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user has permission to update
    const userId = new Types.ObjectId(req.session.user.id);
    if (item.createdBy.toString() !== userId.toString() && !req.session.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updateData: IItemUpdateData = {
      ...req.body,
      updatedBy: userId
    };

    const updatedItem = await ItemModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    return res.json(updatedItem);
  } catch (error) {
    logger.error('Error updating item:', error);
    return res.status(500).json({ message: 'Failed to update item' });
  }
}

/**
 * Delete an item
 * @route DELETE /api/items/:id
 * @access Private
 */
export async function deleteItem(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const item = await ItemModel.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user has permission to delete
    const userId = new Types.ObjectId(req.session.user.id);
    if (item.createdBy.toString() !== userId.toString() && !req.session.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await ItemModel.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting item:', error);
    return res.status(500).json({ message: 'Failed to delete item' });
  }
} 