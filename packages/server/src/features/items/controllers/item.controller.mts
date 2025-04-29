import { Request, Response } from 'express';
import { ItemService, QueryValue } from '../services/item.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import {
  BaseAPIResponse,
  SearchItemsQuery,
  searchItemsQuerySchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { IItem } from '@dungeon-lab/shared/types/index.mjs';
import { ZodError } from 'zod';
import { isErrorWithMessage } from '../../../utils/error.mjs';
import { createSearchParams } from '../../../utils/create.search.params.mjs';

export class ItemController {
  constructor(private itemService: ItemService) {
    this.itemService = itemService;
  }

  /**
   * Search items with filters or get all items
   * @route GET /api/items
   * @access Public
   */
  searchItems = async (
    req: Request<object, object, object, SearchItemsQuery>,
    res: Response<BaseAPIResponse<IItem[]>>
  ): Promise<Response<BaseAPIResponse<IItem[]>> | void> => {
    try {
      // Convert dot notation in query params to nested objects
      const query = createSearchParams(req.query as Record<string, QueryValue>);

      try {
        searchItemsQuerySchema.parse(query);
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          return res.status(400).json({
            success: false,
            data: [],
            error: validationError.errors.map((e) => e.message).join(', ')
          });
        }
      }

      logger.debug('Search items query parameters:', query);
      const items = await this.itemService.searchItems(query);
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
  };

  /**
   * Get item by ID
   * @route GET /api/items/:id
   * @access Public
   */
  getItemById = async (
    req: Request,
    res: Response<BaseAPIResponse<IItem>>
  ): Promise<Response<BaseAPIResponse<IItem>> | void> => {
    try {
      const item = await this.itemService.getItemById(req.params.id);
      return res.json({
        success: true,
        data: item
      });
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Item not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Item not found'
        });
      }
      logger.error('Error fetching item:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Server error'
      });
    }
  };

  /**
   * Get items for a campaign
   * @route GET /api/campaigns/:campaignId/items
   * @access Private
   */
  getItems = async (
    req: Request,
    res: Response<BaseAPIResponse<IItem[]>>
  ): Promise<Response<BaseAPIResponse<IItem[]>> | void> => {
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
  };

  /**
   * Create a new item
   * @route POST /api/items
   * @access Private
   */
  createItem = async (
    req: Request<object, object, IItem>,
    res: Response<BaseAPIResponse<IItem>>
  ): Promise<Response<BaseAPIResponse<IItem>> | void> => {
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
          data: null,
          error: error.message || 'Failed to create item'
        });
      }
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to create item'
      });
    }
  };

  /**
   * Replace an item (full update)
   * @route PUT /api/items/:id
   * @access Private
   */
  putItem = async (
    req: Request<{ id: string }, object, IItem>,
    res: Response<BaseAPIResponse<IItem>>
  ): Promise<Response<BaseAPIResponse<IItem>> | void> => {
    try {
      const hasPermission = await this.itemService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          data: null,
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
      if (isErrorWithMessage(error) && error.message === 'Item not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Item not found'
        });
      }
      logger.error('Error replacing item:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          data: null,
          error: error.message || 'Failed to replace item'
        });
      }
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to replace item'
      });
    }
  };

  /**
   * Update an item (partial update)
   * @route PATCH /api/items/:id
   * @access Private
   */
  patchItem = async (
    req: Request<{ id: string }, object, IItem>,
    res: Response<BaseAPIResponse<IItem>>
  ): Promise<Response<BaseAPIResponse<IItem>> | void> => {
    try {
      const hasPermission = await this.itemService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          data: null,
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
      if (isErrorWithMessage(error) && error.message === 'Item not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Item not found'
        });
      }
      logger.error('Error patching item:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          data: null,
          error: error.message || 'Failed to patch item'
        });
      }
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to patch item'
      });
    }
  };

  /**
   * Delete an item
   * @route DELETE /api/items/:id
   * @access Private
   */
  deleteItem = async (
    req: Request,
    res: Response<BaseAPIResponse<void>>
  ): Promise<Response<BaseAPIResponse<void>> | void> => {
    try {
      const hasPermission = await this.itemService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Access denied'
        });
      }

      await this.itemService.deleteItem(req.params.id);
      return res.json({
        success: true,
        data: null
      });
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Item not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Item not found'
        });
      }
      logger.error('Error deleting item:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          data: null,
          error: error.message || 'Failed to delete item'
        });
      }
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to delete item'
      });
    }
  };

  /**
   * Upload an image for an item
   * @route PUT /api/items/:id/image
   * @access Private
   */
  uploadItemImage = async (
    req: Request,
    res: Response<BaseAPIResponse<IItem>>
  ): Promise<Response<BaseAPIResponse<IItem>> | void> => {
    try {
      // Get the raw image data from the request body
      const imageBuffer = req.body as Buffer;
      const contentType = req.headers['content-type'] || 'image/jpeg';

      if (!imageBuffer || imageBuffer.length === 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'No image data provided'
        });
      }

      // Validate content type
      const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validMimes.includes(contentType)) {
        return res.status(400).json({
          success: false,
          data: null,
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
          data: null,
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
      if (isErrorWithMessage(error) && error.message === 'Item not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Item not found'
        });
      }
      logger.error('Error uploading item image:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          data: null,
          error: error.message || 'Failed to upload item image'
        });
      }
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to upload item image'
      });
    }
  };
}
