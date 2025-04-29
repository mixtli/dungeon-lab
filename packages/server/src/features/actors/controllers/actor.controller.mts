import { Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { logger } from '../../../utils/logger.mjs';
import { isErrorWithMessage } from '../../../utils/error.mjs';
import { ActorService } from '../services/actor.service.mjs';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';
import { IActor } from '@dungeon-lab/shared/schemas/actor.schema.mjs';
import { pluginRegistry } from '../../../services/plugin-registry.service.mjs';
import {
  putActorRequestSchema,
  createActorRequestSchema,
  patchActorRequestSchema,
  searchActorsQuerySchema
} from '@dungeon-lab/shared/types/api/index.mjs';

export class ActorController {
  private actorService: ActorService;

  constructor() {
    this.actorService = new ActorService();
  }

  /**
   * Get all actors, optionally filtered by type
   * @route GET /api/actors
   * @param {string} type - Optional type to filter actors by (e.g. 'character', 'npc')
   * @access Public
   */
  getAllActors = async (
    req: Request<object, object, object, { type: string | undefined }>,
    res: Response<BaseAPIResponse<IActor[]>>
  ): Promise<Response<BaseAPIResponse<IActor[]>> | void> => {
    try {
      const type = req.query.type;
      const actors = await this.actorService.getAllActors(type);
      return res.json({
        success: true,
        data: actors
      });
    } catch (error) {
      if (isErrorWithMessage(error)) {
        logger.error('Error fetching all actors:', error);
      }
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Server error'
      });
    }
  };

  /**
   * Get actor by ID
   * @route GET /api/actors/:id
   * @access Public
   */
  getActorById = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<IActor>>
  ): Promise<Response<BaseAPIResponse<IActor>> | void> => {
    try {
      const actor = await this.actorService.getActorById(req.params.id);
      return res.json({
        success: true,
        data: actor
      });
    } catch (error) {
      if (isErrorWithMessage(error)) {
        logger.error('Error fetching actor:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({
            success: false,
            data: null,
            error: 'Actor not found'
          });
        }
      }
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Server error'
      });
    }
  };

  /**
   * Get actors for a campaign
   * @route GET /api/actors/campaign/:campaignId
   * @access Private
   */
  getActors = async (
    req: Request<{ campaignId: string }>,
    res: Response<BaseAPIResponse<IActor[]>>
  ): Promise<Response<BaseAPIResponse<IActor[]>> | void> => {
    try {
      const actors = await this.actorService.getActors(req.params.campaignId);
      return res.json({
        success: true,
        data: actors
      });
    } catch (error) {
      if (isErrorWithMessage(error)) {
        logger.error('Error getting actors:', error);
      }
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Failed to get actors'
      });
    }
  };

  /**
   * Create a new actor
   * @route POST /api/actors
   * @access Private
   */
  createActor = async (
    req: Request<object, object, z.infer<typeof createActorRequestSchema>>,
    res: Response<BaseAPIResponse<IActor>>
  ): Promise<Response<BaseAPIResponse<IActor>> | void> => {
    try {
      // Validate request body
      const validatedData = createActorRequestSchema.parse(req.body);

      // Get the avatar and token files from req.assets
      const avatarFile = req.assets?.avatar?.[0];
      const tokenFile = req.assets?.token?.[0];

      const data = validatedData.data;

      const plugin = pluginRegistry.getPlugin(validatedData.gameSystemId);
      if (!plugin) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Invalid plugin ID'
        });
      }
      const result = plugin.validateActorData(validatedData.type, data);

      if (!result.success) {
        console.log(result.error);
        return res.status(400).json({
          success: false,
          data: null,
          error: JSON.parse(result.error.message)
        });
      }

      // Destructure validatedData while renaming avatar and token to bypass unused variable warnings
      const { avatar: _avatar, token: _token, ...actorData } = validatedData;

      // Create the actor using the service
      const actor = await this.actorService.createActor(
        actorData,
        req.session.user.id,
        avatarFile,
        tokenFile
      );

      return res.status(201).json({
        success: true,
        data: actor
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          data: null,
          error: JSON.parse(error.message)
        });
      }
      if (isErrorWithMessage(error)) {
        logger.error('Error creating actor:', error);
        return res.status(500).json({
          success: false,
          data: null,
          error: error.message || 'Failed to create actor'
        });
      }
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to create actor'
      });
    }
  };

  /**
   * Update an actor (replace entirely)
   * @route PUT /api/actors/:id
   * @access Private
   */
  putActor = async (
    req: Request<{ id: string }, object, z.infer<typeof putActorRequestSchema>>,
    res: Response<BaseAPIResponse<IActor>>
  ): Promise<Response<BaseAPIResponse<IActor>> | void> => {
    try {
      // Validate request body
      const validatedData = putActorRequestSchema.parse(req.body);

      const hasPermission = await this.actorService.checkUserPermission(
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

      // Get avatar and token files from req.assets if present
      const avatarFile = req.assets?.avatar?.[0];
      const tokenFile = req.assets?.token?.[0];

      const { avatar: _avatar, token: _token, ...actorData } = validatedData;
      // Update the actor using the service
      const actor = await this.actorService.putActor(
        req.params.id,
        actorData,
        req.session.user.id,
        avatarFile,
        tokenFile
      );

      return res.json({
        success: true,
        data: actor
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          data: null,
          error: JSON.parse(error.message)
        });
      }
      if (isErrorWithMessage(error)) {
        logger.error('Error updating actor:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({
            success: false,
            data: null,
            error: 'Actor not found'
          });
        }
        return res.status(500).json({
          success: false,
          data: null,
          error: error.message || 'Failed to update actor'
        });
      }
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to update actor'
      });
    }
  };

  /**
   * Partially update an actor
   * @route PATCH /api/actors/:id
   * @access Private
   */
  patchActor = async (req: Request, res: Response): Promise<Response<BaseAPIResponse<IActor>>> => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(403).json({ success: false, data: null, error: 'Access denied' });
    }

    const result = patchActorRequestSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, data: null, error: 'Invalid request body' });
    }

    try {
      const actor = await this.actorService.patchActor(result.data.id, result.data, userId);
      if (!actor) {
        return res.status(404).json({ success: false, data: null, error: 'Actor not found' });
      }
      return res.json({ success: true, data: actor, error: null });
    } catch (error) {
      logger.error('Error patching actor:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: isErrorWithMessage(error) ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Upload an actor's avatar
   * @route PUT /api/actors/:id/avatar
   * @access Private
   */
  uploadActorAvatar = async (
    req: Request,
    res: Response
  ): Promise<Response<BaseAPIResponse<IActor>>> => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(403).json({ success: false, data: null, error: 'Access denied' });
    }

    if (!req.assets?.avatar?.[0]) {
      return res.status(400).json({ success: false, data: null, error: 'No file uploaded' });
    }

    try {
      const actor = await this.actorService.updateActorAvatar(
        req.params.id,
        req.assets?.avatar?.[0],
        userId
      );
      if (!actor) {
        return res.status(404).json({ success: false, data: null, error: 'Actor not found' });
      }
      return res.json({ success: true, data: actor, error: null });
    } catch (error) {
      logger.error('Error uploading actor avatar:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: isErrorWithMessage(error) ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Upload an actor's token
   * @route PUT /api/actors/:id/token
   * @access Private
   */
  uploadActorToken = async (
    req: Request,
    res: Response
  ): Promise<Response<BaseAPIResponse<IActor>>> => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(403).json({ success: false, data: null, error: 'Access denied' });
    }

    if (!req.assets?.token?.[0]) {
      return res.status(400).json({ success: false, data: null, error: 'No file uploaded' });
    }

    try {
      const actor = await this.actorService.updateActorToken(
        req.params.id,
        req.assets?.token?.[0],
        userId
      );
      if (!actor) {
        return res.status(404).json({ success: false, data: null, error: 'Actor not found' });
      }
      return res.json({ success: true, data: actor, error: null });
    } catch (error) {
      logger.error('Error uploading actor token:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: isErrorWithMessage(error) ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Generate an actor's avatar using AI
   * @route POST /api/actors/:id/generate-avatar
   * @access Private
   */
  generateActorAvatar = async (
    req: Request,
    res: Response
  ): Promise<Response<BaseAPIResponse<IActor>>> => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(403).json({ success: false, data: null, error: 'Access denied' });
    }

    try {
      await this.actorService.generateActorAvatar(req.params.id, userId);
      return res.json({ success: true, error: null });
    } catch (error) {
      logger.error('Error generating actor avatar:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: isErrorWithMessage(error) ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Generate an actor's token using AI
   * @route POST /api/actors/:id/generate-token
   * @access Private
   */
  generateActorToken = async (
    req: Request,
    res: Response
  ): Promise<Response<BaseAPIResponse<IActor>>> => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(403).json({ success: false, data: null, error: 'Access denied' });
    }

    try {
      await this.actorService.generateActorToken(req.params.id, userId);
      return res.json({ success: true, error: null });
    } catch (error) {
      logger.error('Error generating actor token:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: isErrorWithMessage(error) ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Delete an actor
   * @route DELETE /api/actors/:id
   * @access Private
   */
  deleteActor = async (req: Request, res: Response): Promise<Response<BaseAPIResponse<void>>> => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(403).json({ success: false, data: null, error: 'Access denied' });
    }

    try {
      await this.actorService.deleteActor(req.params.id);
      return res.json({ success: true, data: null, error: null });
    } catch (error) {
      logger.error('Error deleting actor:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: isErrorWithMessage(error) ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Search actors based on query parameters
   * @route GET /api/actors/search
   * @access Public
   */
  searchActors = async (
    req: Request,
    res: Response
  ): Promise<Response<BaseAPIResponse<IActor[]>>> => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(403).json({ success: false, data: null, error: 'Access denied' });
    }

    const result = searchActorsQuerySchema.safeParse(req.query);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, data: null, error: 'Invalid query parameters' });
    }

    try {
      const actors = await this.actorService.searchActors(result.data);
      return res.json({ success: true, data: actors, error: null });
    } catch (error) {
      logger.error('Error searching actors:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: isErrorWithMessage(error) ? error.message : 'Internal server error'
      });
    }
  };
}
