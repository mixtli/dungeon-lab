import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/auth.middleware.mjs';
import { ItemService } from '../services/item.service.mjs';
import { logger } from '../../../utils/logger.mjs';

export class ItemController {
  constructor(private itemService: ItemService) {}

  /**
   * Get all items
   * @route GET /api/items
   * @access Public
   */
  async getAllItems(_: Request, res: Response): Promise<Response | void> {
    try {
      const items = await this.itemService.getAllItems();
      return res.json(items);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error fetching items:', error);
      }
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get item by ID
   * @route GET /api/items/:id
   * @access Public
   */
  async getItemById(req: Request, res: Response): Promise<Response | void> {
    try {
      const item = await this.itemService.getItemById(req.params.id);
      return res.json(item);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error fetching item:', error);
        if (error.message === 'Item not found') {
          return res.status(404).json({ message: 'Item not found' });
        }
      }
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get items for a campaign
   * @route GET /api/campaigns/:campaignId/items
   * @access Private
   */
  async getItems(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const items = await this.itemService.getItems(req.params.campaignId);
      return res.json(items);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error getting items:', error);
      }
      return res.status(500).json({ message: 'Failed to get items' });
    }
  }

  /**
   * Create a new item
   * @route POST /api/items
   * @access Private
   */
  async createItem(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const item = await this.itemService.createItem(req.body, req.session.user.id);
      return res.status(201).json(item);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error creating item:', error);
      }
      return res.status(500).json({ message: 'Failed to create item' });
    }
  }

  /**
   * Update an item
   * @route PUT /api/items/:id
   * @access Private
   */
  async updateItem(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const hasPermission = await this.itemService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const item = await this.itemService.updateItem(
        req.params.id,
        req.body,
        req.session.user.id
      );
      return res.json(item);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error updating item:', error);
        if (error.message === 'Item not found') {
          return res.status(404).json({ message: 'Item not found' });
        }
      }
      return res.status(500).json({ message: 'Failed to update item' });
    }
  }

  /**
   * Delete an item
   * @route DELETE /api/items/:id
   * @access Private
   */
  async deleteItem(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const hasPermission = await this.itemService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await this.itemService.deleteItem(req.params.id);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error deleting item:', error);
        if (error.message === 'Item not found') {
          return res.status(404).json({ message: 'Item not found' });
        }
      }
      return res.status(500).json({ message: 'Failed to delete item' });
    }
  }
} 