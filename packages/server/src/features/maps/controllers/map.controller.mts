import { Response, Request, NextFunction } from 'express';
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
    res: Response<BaseAPIResponse<IMap>>,
    next: NextFunction
  ): Promise<Response<BaseAPIResponse<IMap>> | void> => {
    try {
      const validatedData = createMapRequestSchema.parse(req.body);
      const imageFile = req.assets?.image?.[0];

      const map = await this.mapService.createMap(validatedData, req.session.user.id, imageFile);
      return res.status(201).json({
        success: true,
        data: map
      });
    } catch (error) {
      next(error);
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
      const validatedData = putMapRequestSchema.parse(req.body);
      const imageFile = req.assets?.image?.[0];

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
      const validatedData = patchMapRequestSchema.parse(req.body);
      const imageFile = req.assets?.image?.[0];

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
      const imageBuffer = req.body as Buffer;
      const contentType = req.headers['content-type'] || 'image/jpeg';

      if (!imageBuffer || imageBuffer.length === 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'No image data provided'
        });
      }

      const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validMimes.includes(contentType)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Invalid image type. Please upload JPEG, PNG, or WebP'
        });
      }

      const file = new File([imageBuffer], `map_${Date.now()}.${contentType.split('/')[1]}`, {
        type: contentType
      });

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
   */
  searchMaps = async (
    req: Request<object, object, object, SearchMapsQuery>,
    res: Response<BaseAPIResponse<IMap[]>>
  ): Promise<Response<BaseAPIResponse<IMap[]>> | void> => {
    try {
      const query = createSearchParams(req.query as Record<string, QueryValue>);

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
