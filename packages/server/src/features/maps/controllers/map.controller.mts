import { Response, Request } from 'express';
import { MapService, QueryValue } from '../services/map.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import {
  GetMapsResponse,
  GetMapResponse,
  CreateMapRequest,
  CreateMapResponse,
  PutMapRequest,
  PutMapResponse,
  PatchMapRequest,
  PatchMapResponse,
  DeleteMapResponse,
  GenerateMapImageResponse,
  createMapRequestSchema,
  putMapRequestSchema,
  patchMapRequestSchema,
  searchMapsQuerySchema,
  SearchMapsResponse,
  UploadMapImageResponse
} from '@dungeon-lab/shared/types/api/index.mjs';
import { ZodError } from 'zod';

export class MapController {
  constructor(private mapService: MapService) {}

  async getMaps(
    req: Request,
    res: Response<GetMapsResponse>
  ): Promise<Response<GetMapsResponse> | void> {
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
  }

  async generateMapImage(
    req: Request,
    res: Response<GenerateMapImageResponse>
  ): Promise<Response<GenerateMapImageResponse> | void> {
    try {
      await this.mapService.generateMapImage(req.params.id);
      return res.status(204).send();
    } catch (error) {
      logger.error('Error in generateMapImage controller:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate map image'
      });
    }
  }

  async getMap(
    req: Request,
    res: Response<GetMapResponse>
  ): Promise<Response<GetMapResponse> | void> {
    try {
      const map = await this.mapService.getMap(req.params.id);
      return res.json({
        success: true,
        data: map
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      logger.error('Error in getMap controller:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get map'
      });
    }
  }

  async createMap(
    req: Request<object, object, CreateMapRequest>,
    res: Response<CreateMapResponse>
  ): Promise<Response<CreateMapResponse> | void> {
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
          error: JSON.parse(error.message)
        });
      }
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to create map'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to create map'
      });
    }
  }

  /**
   * Replace a map completely (PUT)
   */
  async putMap(
    req: Request<{ id: string }, object, PutMapRequest>,
    res: Response<PutMapResponse>
  ): Promise<Response<PutMapResponse> | void> {
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
          error: JSON.parse(error.message)
        });
      }
      if (error instanceof Error && error.message === 'Map not found') {
        return res.status(404).json({
          success: false,
          error: 'Map not found'
        });
      }
      logger.error('Error in putMap controller:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to update map'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to update map'
      });
    }
  }

  /**
   * Partially update a map (PATCH)
   */
  async patchMap(
    req: Request<{ id: string }, object, PatchMapRequest>,
    res: Response<PatchMapResponse>
  ): Promise<Response<PatchMapResponse> | void> {
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
          error: JSON.parse(error.message)
        });
      }
      if (error instanceof Error && error.message === 'Map not found') {
        return res.status(404).json({
          success: false,
          error: 'Map not found'
        });
      }
      logger.error('Error in patchMap controller:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to patch map'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to patch map'
      });
    }
  }

  async deleteMap(
    req: Request,
    res: Response<DeleteMapResponse>
  ): Promise<Response<DeleteMapResponse> | void> {
    try {
      await this.mapService.deleteMap(req.params.id);
      return res.status(204).send();
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Map not found') {
        return res.status(404).json({
          success: false,
          error: 'Map not found'
        });
      }
      logger.error('Error in deleteMap controller:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to delete map'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to delete map'
      });
    }
  }

  async getAllMaps(
    req: Request,
    res: Response<GetMapsResponse>
  ): Promise<Response<GetMapsResponse> | void> {
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
  }

  async uploadMapImage(
    req: Request,
    res: Response<UploadMapImageResponse>
  ): Promise<Response<UploadMapImageResponse> | void> {
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
      if (error instanceof Error && error.message === 'Map not found') {
        return res.status(404).json({
          success: false,
          error: 'Map not found'
        });
      }
      logger.error('Error in uploadMapImage controller:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to upload map image'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to upload map image'
      });
    }
  }

  /**
   * Search maps based on query parameters
   * @route GET /api/maps/search
   * @access Public
   */
  async searchMaps(
    req: Request,
    res: Response<SearchMapsResponse>
  ): Promise<Response<SearchMapsResponse> | void> {
    try {
      // Convert dot notation in query params to nested objects
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

      // Validate query parameters
      try {
        searchMapsQuerySchema.parse(query);
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          return res.status(400).json({
            success: false,
            data: [],
            error: JSON.parse(validationError.message)
          });
        }
      }

      const maps = await this.mapService.searchMaps(query as Record<string, QueryValue>);
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
  }
}
