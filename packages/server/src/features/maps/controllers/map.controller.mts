import { Response, Request } from 'express';
import { MapService, QueryValue } from '../services/map.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import {
  BaseAPIResponse,
  SearchMapsQuery,
  createMapRequestSchema,
  putMapRequestSchema,
  patchMapRequestSchema,
  searchMapsQuerySchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { IMap } from '@dungeon-lab/shared/types/index.mjs';
import { ZodError } from 'zod';
import { isErrorWithMessage } from '../../../utils/error.mjs';
import { createSearchParams } from '../../../utils/create.search.params.mjs';

export class MapController {
  constructor(private mapService: MapService) {}

  getMaps = async (
    req: Request,
    res: Response<BaseAPIResponse<IMap[]>>
  ): Promise<Response<BaseAPIResponse<IMap[]>> | void> => {
    try {
      const maps = await this.mapService.getAllMaps(req.session.user.id);
      return res.json({
        success: true,
        data: maps
      });
    } catch (error) {
      logger.error('Error in getMaps controller:', error);
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Failed to get maps'
      });
    }
  };

  generateMapImage = async (
    req: Request,
    res: Response<BaseAPIResponse<void>>
  ): Promise<Response<BaseAPIResponse<void>> | void> => {
    try {
      await this.mapService.generateMapImage(req.params.id);
      return res.status(204).send();
    } catch (error) {
      logger.error('Error in generateMapImage controller:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to generate map image'
      });
    }
  };

  getMap = async (
    req: Request,
    res: Response<BaseAPIResponse<IMap>>
  ): Promise<Response<BaseAPIResponse<IMap>> | void> => {
    try {
      const map = await this.mapService.getMap(req.params.id);
      return res.json({
        success: true,
        data: map
      });
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Map not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Map not found'
        });
      }
      logger.error('Error in getMap controller:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to get map'
      });
    }
  };

  createMap = async (
    req: Request<object, object, IMap>,
    res: Response<BaseAPIResponse<IMap>>
  ): Promise<Response<BaseAPIResponse<IMap>> | void> => {
    try {
      // Validate request body
      const validatedData = createMapRequestSchema.parse(req.body);

      // Get the image file from req.assets
      const imageFile = req.assets?.image?.[0];

      // Create the map using the service
      const map = await this.mapService.createMap(validatedData, req.session.user.id, imageFile);

      return res.status(201).json({
        success: true,
        data: map
      });
    } catch (error: unknown) {
      logger.error('Error in createMap controller:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          data: null,
          error: error.errors.map((e) => e.message).join(', ')
        });
      }
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          data: null,
          error: error.message || 'Failed to create map'
        });
      }
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to create map'
      });
    }
  };

  /**
   * Replace a map completely (PUT)
   */
  putMap = async (
    req: Request<{ id: string }, object, IMap>,
    res: Response<BaseAPIResponse<IMap>>
  ): Promise<Response<BaseAPIResponse<IMap>> | void> => {
    try {
      // Validate request body
      const validatedData = putMapRequestSchema.parse(req.body);

      // Get image file from req.assets if present
      const imageFile = req.assets?.image?.[0];

      // Update the map using the service
      const map = await this.mapService.putMap(
        req.params.id,
        validatedData,
        req.session.user.id,
        imageFile
      );

      return res.json({
        success: true,
        data: map
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          data: null,
          error: error.errors.map((e) => e.message).join(', ')
        });
      }
      if (isErrorWithMessage(error) && error.message === 'Map not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Map not found'
        });
      }
      logger.error('Error in putMap controller:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          data: null,
          error: error.message || 'Failed to update map'
        });
      }
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to update map'
      });
    }
  };

  /**
   * Partially update a map (PATCH)
   */
  patchMap = async (
    req: Request<{ id: string }, object, IMap>,
    res: Response<BaseAPIResponse<IMap>>
  ): Promise<Response<BaseAPIResponse<IMap>> | void> => {
    try {
      // Validate request body
      const validatedData = patchMapRequestSchema.parse(req.body);

      // Get image file from req.assets if present
      const imageFile = req.assets?.image?.[0];

      // Patch the map using the service
      const map = await this.mapService.patchMap(
        req.params.id,
        validatedData,
        req.session.user.id,
        imageFile
      );

      return res.json({
        success: true,
        data: map
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          data: null,
          error: error.errors.map((e) => e.message).join(', ')
        });
      }
      if (isErrorWithMessage(error) && error.message === 'Map not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Map not found'
        });
      }
      logger.error('Error in patchMap controller:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          data: null,
          error: error.message || 'Failed to patch map'
        });
      }
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to patch map'
      });
    }
  };

  deleteMap = async (
    req: Request,
    res: Response<BaseAPIResponse<void>>
  ): Promise<Response<BaseAPIResponse<void>> | void> => {
    try {
      await this.mapService.deleteMap(req.params.id);
      return res.json({
        success: true,
        data: null
      });
    } catch (error: unknown) {
      if (isErrorWithMessage(error) && error.message === 'Map not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Map not found'
        });
      }
      logger.error('Error in deleteMap controller:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          data: null,
          error: error.message || 'Failed to delete map'
        });
      }
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to delete map'
      });
    }
  };

  getAllMaps = async (
    req: Request,
    res: Response<BaseAPIResponse<IMap[]>>
  ): Promise<Response<BaseAPIResponse<IMap[]>> | void> => {
    try {
      const maps = await this.mapService.getAllMaps(req.session.user.id);
      return res.json({
        success: true,
        data: maps
      });
    } catch (error) {
      logger.error('Error in getAllMaps controller:', error);
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Failed to get maps'
      });
    }
  };

  uploadMapImage = async (
    req: Request,
    res: Response<BaseAPIResponse<IMap>>
  ): Promise<Response<BaseAPIResponse<IMap>> | void> => {
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

      // Create a standard File object from the buffer
      const file = new File([imageBuffer], `map_${Date.now()}.${contentType.split('/')[1]}`, {
        type: contentType
      });

      // Update the map with just the new image
      const map = await this.mapService.updateMapImage(req.params.id, file, req.session.user.id);

      return res.json({
        success: true,
        data: map
      });
    } catch (error: unknown) {
      if (isErrorWithMessage(error) && error.message === 'Map not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Map not found'
        });
      }
      logger.error('Error in uploadMapImage controller:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          data: null,
          error: error.message || 'Failed to upload map image'
        });
      }
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to upload map image'
      });
    }
  };

  /**
   * Search maps based on query parameters
   * @route GET /api/maps/search
   * @access Public
   */
  searchMaps = async (
    req: Request<object, object, object, SearchMapsQuery>,
    res: Response<BaseAPIResponse<IMap[]>>
  ): Promise<Response<BaseAPIResponse<IMap[]>> | void> => {
    try {
      // Convert dot notation in query params to nested objects
      const query = createSearchParams(req.query as Record<string, QueryValue>);

      // Validate query parameters
      try {
        searchMapsQuerySchema.parse(query);
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          return res.status(400).json({
            success: false,
            data: [],
            error: validationError.errors.map((e) => e.message).join(', ')
          });
        }
      }

      const maps = await this.mapService.searchMaps(query);
      return res.json({
        success: true,
        data: maps
      });
    } catch (error) {
      logger.error('Error in searchMaps:', error);
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Failed to search maps'
      });
    }
  };
}
