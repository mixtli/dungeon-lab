import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/auth.middleware.mjs';
import { MapService } from '../services/map.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { uploadAssets } from '../../../utils/asset-upload.utils.mjs';

export class MapController {
  constructor(private mapService: MapService) {}

  async getMaps(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const maps = await this.mapService.getMaps(req.params.campaignId);
      const result = res.json(maps);
      console.log("got here")
      console.log(result);
      debugger
      await result
    } catch (error) {
      logger.error('Error in getMaps controller:', error);
      return res.status(500).json({ message: 'Failed to get maps' });
    }
  }

  async getMap(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const map = await this.mapService.getMap(req.params.id);
      return res.json(map);
    } catch (error: any) {
      if (error.message === 'Map not found') {
        return res.status(404).json({ message: 'Map not found' });
      }
      logger.error('Error in getMap controller:', error);
      return res.status(500).json({ message: 'Failed to get map' });
    }
  }

  async createMap(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      // First create the map in database without images
      const initialMapData = {
        ...req.body,
        gridRows: 0, // Placeholder, will be calculated after image processing
        aspectRatio: 1, // Placeholder, will be calculated after image processing
      };
      
      // Create initial map record to get an ID
      const initialMap = await this.mapService.createMapInitial(initialMapData, req.session.user.id);
      
      // Prepare files for upload
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const file = req.file;
      
      // Upload the assets to storage
      const assets = await uploadAssets(files || file, 'maps', initialMap.id!);
      
      // Process the image and update the map with final data
      const map = await this.mapService.processThumbnail(
        initialMap.id!,
        assets.image,
        Number(req.body.gridColumns),
        req.session.user.id
      );
      
      return res.status(201).json(map);
    } catch (error: any) {
      logger.error('Error in createMap controller:', error);
      return res.status(500).json({ message: error.message || 'Failed to create map' });
    }
  }

  async updateMap(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      // Prepare files for upload
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const file = req.file;
      
      // Upload any new assets
      const assets = await uploadAssets(files || file, 'maps', req.params.id);
      
      // Add file data to request body
      const mapData = {
        ...req.body,
        assets
      };
      
      const map = await this.mapService.updateMap(req.params.id, mapData, req.session.user.id);
      return res.json(map);
    } catch (error: any) {
      if (error.message === 'Map not found') {
        return res.status(404).json({ message: 'Map not found' });
      }
      logger.error('Error in updateMap controller:', error);
      return res.status(500).json({ message: error.message || 'Failed to update map' });
    }
  }

  async deleteMap(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      await this.mapService.deleteMap(req.params.id);
      return res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Map not found') {
        return res.status(404).json({ message: 'Map not found' });
      }
      logger.error('Error in deleteMap controller:', error);
      return res.status(500).json({ message: error.message || 'Failed to delete map' });
    }
  }

  async getAllMaps(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const maps = await this.mapService.getAllMaps(req.session.user.id);
      const result = res.json(maps);
      return result
    } catch (error) {
      logger.error('Error in getAllMaps controller:', error);
      return res.status(500).json({ message: 'Failed to get maps' });
    }
  }
} 