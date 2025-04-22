import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/auth.middleware.mjs';
import { ActorService, QueryValue } from '../services/actor.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { pluginRegistry } from '../../../services/plugin-registry.service.mjs';
// import { uploadAssets } from '../../../utils/asset-upload.utils.mjs';

export class ActorController {
  constructor(private actorService: ActorService) {}
  /**
   * Get all actors, optionally filtered by type
   * @route GET /api/actors
   * @param {string} type - Optional type to filter actors by (e.g. 'character', 'npc')
   * @access Public
   */
  async getAllActors(req: Request, res: Response): Promise<Response | void> {
    try {
      const type = req.query.type as string | undefined;
      const actors = await this.actorService.getAllActors(type);
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
      // Get the avatar and token files from req.assets
      const avatarFile = req.assets?.avatar?.[0];
      const tokenFile = req.assets?.token?.[0];

      const data = req.body.data;

      const plugin = pluginRegistry.getPlugin(req.body.gameSystemId);
      if (!plugin) {
        return res.status(400).json({ message: 'Invalid plugin ID' });
      }
      const result = plugin.validateActorData(req.body.type, data);

      if (!result.success) {
        console.log(result.error);
        return res.status(400).json({ message: result.error });
      }

      // Create the actor using the service
      const actor = await this.actorService.createActor(
        req.body,
        req.session.user.id,
        avatarFile,
        tokenFile
      );

      return res.status(201).json(actor);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error creating actor:', error);
        return res.status(500).json({ message: error.message || 'Failed to create actor' });
      }
      return res.status(500).json({ message: 'Failed to create actor' });
    }
  }

  /**
   * Update an actor (replace entirely)
   * @route PUT /api/actors/:id
   * @access Private
   */
  async putActor(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const hasPermission = await this.actorService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Get avatar and token files from req.assets if present
      const avatarFile = req.assets?.avatar?.[0];
      const tokenFile = req.assets?.token?.[0];

      // Update the actor using the service
      const actor = await this.actorService.putActor(
        req.params.id,
        req.body,
        req.session.user.id,
        avatarFile,
        tokenFile
      );

      return res.json(actor);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error updating actor:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({ message: 'Actor not found' });
        }
        return res.status(500).json({ message: error.message || 'Failed to update actor' });
      }
      return res.status(500).json({ message: 'Failed to update actor' });
    }
  }

  /**
   * Partially update an actor
   * @route PATCH /api/actors/:id
   * @access Private
   */
  async patchActor(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const hasPermission = await this.actorService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Get avatar and token files from req.assets if present
      const avatarFile = req.assets?.avatar?.[0];
      const tokenFile = req.assets?.token?.[0];

      // Patch the actor using the service
      const actor = await this.actorService.patchActor(
        req.params.id,
        req.body,
        req.session.user.id,
        avatarFile,
        tokenFile
      );

      return res.json(actor);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error patching actor:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({ message: 'Actor not found' });
        }
        return res.status(500).json({ message: error.message || 'Failed to patch actor' });
      }
      return res.status(500).json({ message: 'Failed to patch actor' });
    }
  }

  /**
   * Upload an actor's avatar
   * @route PUT /api/actors/:id/avatar
   * @access Private
   */
  async uploadActorAvatar(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const hasPermission = await this.actorService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Get the raw image data from the request body
      const imageBuffer = req.body as Buffer;
      const contentType = req.headers['content-type'] || 'image/jpeg';

      if (!imageBuffer || imageBuffer.length === 0) {
        return res.status(400).json({ message: 'No image data provided' });
      }

      // Validate content type
      const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validMimes.includes(contentType)) {
        return res
          .status(400)
          .json({ message: 'Invalid image type. Please upload JPEG, PNG, or WebP' });
      }

      // Create a standard File object from the buffer
      const file = new File([imageBuffer], `avatar_${Date.now()}.${contentType.split('/')[1]}`, {
        type: contentType
      });

      // Update the actor with just the new avatar
      const actor = await this.actorService.updateActorAvatar(
        req.params.id,
        file,
        req.session.user.id
      );

      return res.json(actor);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error uploading actor avatar:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({ message: 'Actor not found' });
        }
        return res.status(500).json({ message: error.message || 'Failed to upload actor avatar' });
      }
      return res.status(500).json({ message: 'Failed to upload actor avatar' });
    }
  }

  /**
   * Upload an actor's token
   * @route PUT /api/actors/:id/token
   * @access Private
   */
  async uploadActorToken(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const hasPermission = await this.actorService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Get the raw image data from the request body
      const imageBuffer = req.body as Buffer;
      const contentType = req.headers['content-type'] || 'image/png';

      if (!imageBuffer || imageBuffer.length === 0) {
        return res.status(400).json({ message: 'No image data provided' });
      }

      // Validate content type
      const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validMimes.includes(contentType)) {
        return res
          .status(400)
          .json({ message: 'Invalid image type. Please upload JPEG, PNG, or WebP' });
      }

      // Create a standard File object from the buffer
      const file = new File([imageBuffer], `token_${Date.now()}.${contentType.split('/')[1]}`, {
        type: contentType
      });

      // Update the actor with just the new token
      const actor = await this.actorService.updateActorToken(
        req.params.id,
        file,
        req.session.user.id
      );

      return res.json(actor);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error uploading actor token:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({ message: 'Actor not found' });
        }
        return res.status(500).json({ message: error.message || 'Failed to upload actor token' });
      }
      return res.status(500).json({ message: 'Failed to upload actor token' });
    }
  }

  /**
   * Generate an actor's avatar
   * @route POST /api/actors/:id/generate-avatar
   * @access Private
   */
  async generateActorAvatar(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const hasPermission = await this.actorService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await this.actorService.generateActorAvatar(req.params.id, req.session.user.id);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error generating actor avatar:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({ message: 'Actor not found' });
        }
      }
      return res.status(500).json({ message: 'Failed to generate actor avatar' });
    }
  }

  /**
   * Generate an actor's token
   * @route POST /api/actors/:id/generate-token
   * @access Private
   */
  async generateActorToken(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const hasPermission = await this.actorService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await this.actorService.generateActorToken(req.params.id, req.session.user.id);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error generating actor token:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({ message: 'Actor not found' });
        }
      }
      return res.status(500).json({ message: 'Failed to generate actor token' });
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

  /**
   * Search actors based on query parameters
   * @route GET /api/actors/search
   * @access Public
   */
  async searchActors(req: Request, res: Response): Promise<Response | void> {
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

      const actors = await this.actorService.searchActors(query as Record<string, QueryValue>);
      return res.json(actors);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error in searchActors:', error);
      }
      return res.status(500).json({ message: 'Failed to search actors' });
    }
  }
}
