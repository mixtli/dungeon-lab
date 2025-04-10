import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/auth.middleware.mjs';
import { ActorService } from '../services/actor.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { uploadAssets } from '../../../utils/asset-upload.utils.mjs';
import { generateCharacterAvatar, generateCharacterToken } from '../utils/actor-image-generator.mjs';

export class ActorController {
  constructor(private actorService: ActorService) {}

  /**
   * Get all actors
   * @route GET /api/actors
   * @access Public
   */
  async getAllActors(req: Request, res: Response): Promise<Response | void> {
    try {
      const actors = await this.actorService.getAllActors();
      return res.json(actors);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error fetching all actors:', error);
      }
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get actor by ID
   * @route GET /api/actors/:id
   * @access Public
   */
  async getActorById(req: Request, res: Response): Promise<Response | void> {
    try {
      const actor = await this.actorService.getActorById(req.params.id);
      return res.json(actor);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error fetching actor:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({ message: 'Actor not found' });
        }
      }
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get actors for a campaign
   * @route GET /api/actors/campaign/:campaignId
   * @access Private
   */
  async getActors(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const actors = await this.actorService.getActors(req.params.campaignId);
      return res.json(actors);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error getting actors:', error);
      }
      return res.status(500).json({ message: 'Failed to get actors' });
    }
  }

  /**
   * Create a new actor
   * @route POST /api/actors
   * @access Private
   */
  async createActor(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      // First create the actor in database without images
      const initialActorData = {
        ...req.body
      };
      
      // Create initial actor record to get an ID
      const initialActor = await this.actorService.createActor(initialActorData, req.session.user.id);
      
      let assets = {};
      
      // Prepare files for upload
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const file = req.file;
      
      // Check if we have actual files to process
      const hasFiles = files && Object.keys(files).length > 0 && Object.values(files).some(f => f && f.length > 0);
      const hasFile = file && Object.keys(file).length > 0;
      
      if (hasFiles || hasFile) {
        // If files were provided, upload them
        logger.info('Uploading provided actor images');
        assets = await uploadAssets(files || file, 'actors', initialActor.id!);
      } else {
        // If no files were provided, generate images using AI
        logger.info('No images provided, generating actor images with AI');
        const [avatar, token] = await Promise.all([
          generateCharacterAvatar(initialActor),
          generateCharacterToken(initialActor)
        ]);
        assets = {
          avatar,
          token
        };
      }
      
      // Update the actor with the uploaded/generated assets
      if (Object.keys(assets).length > 0) {
        const updateData = {
          ...assets,
          updatedBy: req.session.user.id
        };
        
        const actor = await this.actorService.updateActor(initialActor.id!, updateData, req.session.user.id);
        return res.status(201).json(actor);
      }
      
      return res.status(201).json(initialActor);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error creating actor:', error);
      }
      return res.status(500).json({ message: 'Failed to create actor' });
    }
  }

  /**
   * Update an actor
   * @route PUT /api/actors/:id
   * @access Private
   */
  async updateActor(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const hasPermission = await this.actorService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Prepare files for upload
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const file = req.file;
      
      // Upload any new assets
      const assets = await uploadAssets(files || file, 'actors', req.params.id);
      
      // Add file data to request body
      const actorData = {
        ...req.body,
        ...assets
      };

      const actor = await this.actorService.updateActor(
        req.params.id,
        actorData,
        req.session.user.id
      );
      return res.json(actor);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error updating actor:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({ message: 'Actor not found' });
        }
      }
      return res.status(500).json({ message: 'Failed to update actor' });
    }
  }

  /**
   * Delete an actor
   * @route DELETE /api/actors/:id
   * @access Private
   */
  async deleteActor(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const hasPermission = await this.actorService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await this.actorService.deleteActor(req.params.id);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error deleting actor:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({ message: 'Actor not found' });
        }
      }
      return res.status(500).json({ message: 'Failed to delete actor' });
    }
  }
} 