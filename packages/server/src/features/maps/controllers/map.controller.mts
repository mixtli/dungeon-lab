import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/auth.middleware.mjs';
import { MapService } from '../services/map.service.mjs';
import { logger } from '../../../utils/logger.mjs';

export class MapController {
  constructor(private mapService: MapService) {}

  async getMaps(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const maps = await this.mapService.getMapsForCampaign(req.params.campaignId);
      return res.json(maps);
    } catch (error) {
      logger.error('Error in getMaps controller:', error);
      return res.status(500).json({ message: 'Failed to get maps' });
    }
  }

  async generateMapImage(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      await this.mapService.generateMapImage(req.params.id);
      return res.status(204).send();
    } catch (error) {
      logger.error('Error in generateMapImage controller:', error);
      return res.status(500).json({ message: 'Failed to generate map image' });
    }
  }

  async getMap(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const map = await this.mapService.getMap(req.params.id);
      return res.json(map);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(404).json({ message: error.message });
      }
      logger.error('Error in getMap controller:', error);
      return res.status(500).json({ message: 'Failed to get map' });
    }
  }

  async createMap(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      // Get the image file from req.assets
      const imageFile = req.assets?.image?.[0];
      
      // Create the map using the service
      const map = await this.mapService.createMap(
        req.body,
        req.session.user.id,
        imageFile
      );
      
      return res.status(201).json(map);
    } catch (error: unknown) {
      logger.error('Error in createMap controller:', error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to create map' });
      }
      return res.status(500).json({ message: 'Failed to create map' });
    }
  }

  async updateMap(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      // Get image file from req.assets if present
      const imageFile = req.assets?.image?.[0];
      
      // Update the map using the service
      const map = await this.mapService.updateMap(
        req.params.id,
        req.body,
        req.session.user.id,
        imageFile
      );
      
      return res.json(map);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Map not found') {
        return res.status(404).json({ message: 'Map not found' });
      }
      logger.error('Error in updateMap controller:', error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to update map' });
      }
      return res.status(500).json({ message: 'Failed to update map' });
    }
  }

  async deleteMap(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      await this.mapService.deleteMap(req.params.id);
      return res.status(204).send();
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Map not found') {
        return res.status(404).json({ message: 'Map not found' });
      }
      logger.error('Error in deleteMap controller:', error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to delete map' });
      }
      return res.status(500).json({ message: 'Failed to delete map' });
    }
  }

  async getAllMaps(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const maps = await this.mapService.getAllMaps(req.session.user.id);
      return res.json(maps);
    } catch (error) {
      logger.error('Error in getAllMaps controller:', error);
      return res.status(500).json({ message: 'Failed to get maps' });
    }
  }

  async uploadMapImage(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      // Get the raw image data from the request body
      const imageBuffer = req.body as Buffer;
      const contentType = req.headers['content-type'] || 'image/jpeg';
      
      if (!imageBuffer || imageBuffer.length === 0) {
        return res.status(400).json({ message: 'No image data provided' });
      }

      // Validate content type
      const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validMimes.includes(contentType)) {
        return res.status(400).json({ message: 'Invalid image type. Please upload JPEG, PNG, or WebP' });
      }

      // Create a standard File object from the buffer
      const file = new File(
        [imageBuffer], 
        `map_${Date.now()}.${contentType.split('/')[1]}`, 
        { type: contentType }
      );

      // Update the map with just the new image
      const map = await this.mapService.updateMapImage(
        req.params.id,
        file,
        req.session.user.id
      );
      
      return res.json(map);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Map not found') {
        return res.status(404).json({ message: 'Map not found' });
      }
      logger.error('Error in uploadMapImage controller:', error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to upload map image' });
      }
      return res.status(500).json({ message: 'Failed to upload map image' });
    }
  }
} 