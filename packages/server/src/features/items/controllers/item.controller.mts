import { Request, Response } from 'express';
import { ItemService, QueryValue } from '../services/item.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import {
  GetItemResponse,
  CreateItemRequest,
  CreateItemResponse,
  PutItemRequest,
  PutItemResponse,
  PatchItemRequest,
  PatchItemResponse,
  DeleteItemResponse,
  UploadItemImageResponse,
  SearchItemsResponse,
  GetCampaignItemsResponse,
  searchItemsQuerySchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { ZodError } from 'zod';

export class ItemController {
  constructor(private itemService: ItemService) {}

  /**
   * Search items with filters or get all items
   * @route GET /api/items
   * @access Public
   */
  async searchItems(
    req: Request,
    res: Response<SearchItemsResponse>
  ): Promise<Response<SearchItemsResponse> | void> {
    try {
      // Convert dot notation in query params to nested objects, similar to document controller
      const query = Object.entries(req.query).reduce((acc, [key, value]) => {
        if (key.includes('.')) {
          const parts = key.split('.');
          let current = acc;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!(parts[i] in current)) {
              current[parts[i]] = {};
            }
            current = current[parts[i]] as Record<string, unknown>;
          }
          current[parts[parts.length - 1]] = value;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, unknown>);

      try {
        searchItemsQuerySchema.parse(query);
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          return res.status(400).json({
            success: false,
            data: [],
            error: JSON.parse(validationError.message)
          });
        }
      }

      logger.debug('Search items query parameters:', query);
      const items = await this.itemService.searchItems(query as Record<string, QueryValue>);
      return res.json({
        success: true,
        data: items
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error searching items:', error);
      }
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Server error'
      });
    }
  }

  /**
   * Get item by ID
   * @route GET /api/items/:id
   * @access Public
   */
  async getItemById(
    req: Request,
    res: Response<GetItemResponse>
  ): Promise<Response<GetItemResponse> | void> {
    try {
      const item = await this.itemService.getItemById(req.params.id);
      return res.json({
        success: true,
        data: item
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error fetching item:', error);
        if (error.message === 'Item not found') {
          return res.status(404).json({
            success: false,
            error: 'Item not found'
          });
        }
      }
      return res.status(500).json({
        success: false,
        error: 'Server error'
      });
    }
  }

  /**
   * Get items for a campaign
   * @route GET /api/campaigns/:campaignId/items
   * @access Private
   */
  async getItems(
    req: Request,
    res: Response<GetCampaignItemsResponse>
  ): Promise<Response<GetCampaignItemsResponse> | void> {
    try {
      const items = await this.itemService.getItems(req.params.campaignId);
      return res.json({
        success: true,
        data: items
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error getting items:', error);
      }
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Failed to get items'
      });
    }
  }

  /**
   * Create a new item
   * @route POST /api/items
   * @access Private
   */
  async createItem(
    req: Request<object, object, CreateItemRequest>,
    res: Response<CreateItemResponse>
  ): Promise<Response<CreateItemResponse> | void> {
    try {
      // Get the file from assets if provided
      const file = req.assets?.image?.[0];
      const item = await this.itemService.createItem(req.body, req.session.user.id, file);
      return res.status(201).json({
        success: true,
        data: item
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error creating item:', error);
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to create item'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to create item'
      });
    }
  }

  /**
   * Replace an item (full update)
   * @route PUT /api/items/:id
   * @access Private
   */
  async putItem(
    req: Request<{ id: string }, object, PutItemRequest>,
    res: Response<PutItemResponse>
  ): Promise<Response<PutItemResponse> | void> {
    try {
      const hasPermission = await this.itemService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Check if an image file was uploaded
      const file = req.assets?.image?.[0];
      const item = await this.itemService.putItem(
        req.params.id,
        req.body,
        req.session.user.id,
        file
      );

      return res.json({
        success: true,
        data: item
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error replacing item:', error);
        if (error.message === 'Item not found') {
          return res.status(404).json({
            success: false,
            error: 'Item not found'
          });
        }
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to replace item'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to replace item'
      });
    }
  }

  /**
   * Update an item (partial update)
   * @route PATCH /api/items/:id
   * @access Private
   */
  async patchItem(
    req: Request<{ id: string }, object, PatchItemRequest>,
    res: Response<PatchItemResponse>
  ): Promise<Response<PatchItemResponse> | void> {
    try {
      const hasPermission = await this.itemService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Check if an image file was uploaded
      const file = req.assets?.image?.[0];
      const item = await this.itemService.patchItem(
        req.params.id,
        req.body,
        req.session.user.id,
        file
      );

      return res.json({
        success: true,
        data: item
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error patching item:', error);
        if (error.message === 'Item not found') {
          return res.status(404).json({
            success: false,
            error: 'Item not found'
          });
        }
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to patch item'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to patch item'
      });
    }
  }

  /**
   * Delete an item
   * @route DELETE /api/items/:id
   * @access Private
   */
  async deleteItem(
    req: Request,
    res: Response<DeleteItemResponse>
  ): Promise<Response<DeleteItemResponse> | void> {
    try {
      const hasPermission = await this.itemService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      await this.itemService.deleteItem(req.params.id);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error deleting item:', error);
        if (error.message === 'Item not found') {
          return res.status(404).json({
            success: false,
            error: 'Item not found'
          });
        }
        return res.status(500).json({
          success: false,
          error: 'Failed to delete item'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to delete item'
      });
    }
  }

  /**
   * Upload an image for an item
   * @route PUT /api/items/:id/image
   * @access Private
   */
  async uploadItemImage(
    req: Request,
    res: Response<UploadItemImageResponse>
  ): Promise<Response<UploadItemImageResponse> | void> {
    try {
      // Get the raw image data from the request body
      const imageBuffer = req.body as Buffer;
      const contentType = req.headers['content-type'] || 'image/jpeg';

      if (!imageBuffer || imageBuffer.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No image data provided'
        });
      }

      // Validate content type
      const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validMimes.includes(contentType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid image type. Please upload JPEG, PNG, or WebP'
        });
      }

      // Check permission
      const hasPermission = await this.itemService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Create a standard File object from the buffer
      const file = new File([imageBuffer], `item_${Date.now()}.${contentType.split('/')[1]}`, {
        type: contentType
      });

      // Update the item with just the new image
      const item = await this.itemService.updateItemImage(req.params.id, file, req.session.user.id);

      return res.json({
        success: true,
        data: item
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error uploading item image:', error);
        if (error.message === 'Item not found') {
          return res.status(404).json({
            success: false,
            error: 'Item not found'
          });
        }
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to upload item image'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to upload item image'
      });
    }
  }
}
