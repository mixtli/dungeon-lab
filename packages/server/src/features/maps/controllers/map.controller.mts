import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/auth.middleware.mjs';
import { MapService } from '../services/map.service.mjs';
import { logger } from '../../../utils/logger.mjs';

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
      const map = await this.mapService.createMap(req.body, req.session.user.id);
      return res.status(201).json(map);
    } catch (error: any) {
      logger.error('Error in createMap controller:', error);
      return res.status(500).json({ message: error.message || 'Failed to create map' });
    }
  }

  async updateMap(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const map = await this.mapService.updateMap(req.params.id, req.body, req.session.user.id);
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