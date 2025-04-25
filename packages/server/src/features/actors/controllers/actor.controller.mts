import { Request, Response } from 'express';
import { ActorService, QueryValue } from '../services/actor.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { pluginRegistry } from '../../../services/plugin-registry.service.mjs';
import {
  GetActorsResponse,
  GetActorResponse,
  CreateActorRequest,
  CreateActorResponse,
  PutActorRequest,
  PutActorResponse,
  PatchActorRequest,
  PatchActorResponse,
  DeleteActorResponse,
  UploadActorAvatarResponse,
  UploadActorTokenResponse,
  GenerateActorAvatarResponse,
  GenerateActorTokenResponse,
  GetActorsByCampaignResponse,
  SearchActorsResponse,
  createActorRequestSchema,
  putActorRequestSchema,
  patchActorRequestSchema,
  searchActorsQuerySchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { ZodError } from 'zod';

export class ActorController {
  constructor(private actorService: ActorService) {}
  /**
   * Get all actors, optionally filtered by type
   * @route GET /api/actors
   * @param {string} type - Optional type to filter actors by (e.g. 'character', 'npc')
   * @access Public
   */
  async getAllActors(
    req: Request,
    res: Response<GetActorsResponse>
  ): Promise<Response<GetActorsResponse> | void> {
    try {
      const type = req.query.type as string | undefined;
      const actors = await this.actorService.getAllActors(type);
      return res.json({
        success: true,
        data: actors
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error fetching all actors:', error);
      }
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Server error'
      });
    }
  }

  /**
   * Get actor by ID
   * @route GET /api/actors/:id
   * @access Public
   */
  async getActorById(
    req: Request,
    res: Response<GetActorResponse>
  ): Promise<Response<GetActorResponse> | void> {
    try {
      const actor = await this.actorService.getActorById(req.params.id);
      return res.json({
        success: true,
        data: actor
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error fetching actor:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({
            success: false,
            error: 'Actor not found'
          });
        }
      }
      return res.status(500).json({
        success: false,
        error: 'Server error'
      });
    }
  }

  /**
   * Get actors for a campaign
   * @route GET /api/actors/campaign/:campaignId
   * @access Private
   */
  async getActors(
    req: Request,
    res: Response<GetActorsByCampaignResponse>
  ): Promise<Response<GetActorsByCampaignResponse> | void> {
    try {
      const actors = await this.actorService.getActors(req.params.campaignId);
      return res.json({
        success: true,
        data: actors
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error getting actors:', error);
      }
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Failed to get actors'
      });
    }
  }

  /**
   * Create a new actor
   * @route POST /api/actors
   * @access Private
   */
  async createActor(
    req: Request<object, object, CreateActorRequest>,
    res: Response<CreateActorResponse>
  ): Promise<Response<CreateActorResponse> | void> {
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
          error: 'Invalid plugin ID'
        });
      }
      const result = plugin.validateActorData(validatedData.type, data);

      if (!result.success) {
        console.log(result.error);
        return res.status(400).json({
          success: false,
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
          error: JSON.parse(error.message)
        });
      }
      if (error instanceof Error) {
        logger.error('Error creating actor:', error);
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to create actor'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to create actor'
      });
    }
  }

  /**
   * Update an actor (replace entirely)
   * @route PUT /api/actors/:id
   * @access Private
   */
  async putActor(
    req: Request<{ id: string }, object, PutActorRequest>,
    res: Response<PutActorResponse>
  ): Promise<Response<PutActorResponse> | void> {
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
          error: JSON.parse(error.message)
        });
      }
      if (error instanceof Error) {
        logger.error('Error updating actor:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({
            success: false,
            error: 'Actor not found'
          });
        }
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to update actor'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to update actor'
      });
    }
  }

  /**
   * Partially update an actor
   * @route PATCH /api/actors/:id
   * @access Private
   */
  async patchActor(
    req: Request<{ id: string }, object, PatchActorRequest>,
    res: Response<PatchActorResponse>
  ): Promise<Response<PatchActorResponse> | void> {
    try {
      // Validate request body
      const validatedData = patchActorRequestSchema.parse(req.body);

      const hasPermission = await this.actorService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Get avatar and token files from req.assets if present
      const avatarFile = req.assets?.avatar?.[0];
      const tokenFile = req.assets?.token?.[0];

      const { avatar: _avatar, token: _token, ...actorData } = validatedData;
      // Patch the actor using the service
      const actor = await this.actorService.patchActor(
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
          error: JSON.parse(error.message)
        });
      }
      if (error instanceof Error) {
        logger.error('Error patching actor:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({
            success: false,
            error: 'Actor not found'
          });
        }
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to patch actor'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to patch actor'
      });
    }
  }

  /**
   * Upload an actor's avatar
   * @route PUT /api/actors/:id/avatar
   * @access Private
   */
  async uploadActorAvatar(
    req: Request,
    res: Response<UploadActorAvatarResponse>
  ): Promise<Response<UploadActorAvatarResponse> | void> {
    try {
      const hasPermission = await this.actorService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

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
      const file = new File([imageBuffer], `avatar_${Date.now()}.${contentType.split('/')[1]}`, {
        type: contentType
      });

      // Update the actor with just the new avatar
      const actor = await this.actorService.updateActorAvatar(
        req.params.id,
        file,
        req.session.user.id
      );

      return res.json({
        success: true,
        data: actor
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error uploading actor avatar:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({
            success: false,
            error: 'Actor not found'
          });
        }
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to upload actor avatar'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to upload actor avatar'
      });
    }
  }

  /**
   * Upload an actor's token
   * @route PUT /api/actors/:id/token
   * @access Private
   */
  async uploadActorToken(
    req: Request,
    res: Response<UploadActorTokenResponse>
  ): Promise<Response<UploadActorTokenResponse> | void> {
    try {
      const hasPermission = await this.actorService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

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
      const file = new File([imageBuffer], `token_${Date.now()}.${contentType.split('/')[1]}`, {
        type: contentType
      });

      // Update the actor with just the new token
      const actor = await this.actorService.updateActorToken(
        req.params.id,
        file,
        req.session.user.id
      );

      return res.json({
        success: true,
        data: actor
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error uploading actor token:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({
            success: false,
            error: 'Actor not found'
          });
        }
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to upload actor token'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to upload actor token'
      });
    }
  }

  /**
   * Generate an actor's avatar using AI
   * @route POST /api/actors/:id/generate-avatar
   * @access Private
   */
  async generateActorAvatar(
    req: Request,
    res: Response<GenerateActorAvatarResponse>
  ): Promise<Response<GenerateActorAvatarResponse> | void> {
    try {
      const hasPermission = await this.actorService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      await this.actorService.generateActorAvatar(req.params.id, req.session.user.id);

      return res.json({
        success: true
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error generating actor avatar:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({
            success: false,
            error: 'Actor not found'
          });
        }
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to generate actor avatar'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to generate actor avatar'
      });
    }
  }

  /**
   * Generate an actor's token using AI
   * @route POST /api/actors/:id/generate-token
   * @access Private
   */
  async generateActorToken(
    req: Request,
    res: Response<GenerateActorTokenResponse>
  ): Promise<Response<GenerateActorTokenResponse> | void> {
    try {
      const hasPermission = await this.actorService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      await this.actorService.generateActorToken(req.params.id, req.session.user.id);

      return res.json({
        success: true
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error generating actor token:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({
            success: false,
            error: 'Actor not found'
          });
        }
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to generate actor token'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to generate actor token'
      });
    }
  }

  /**
   * Delete an actor
   * @route DELETE /api/actors/:id
   * @access Private
   */
  async deleteActor(
    req: Request,
    res: Response<DeleteActorResponse>
  ): Promise<Response<DeleteActorResponse> | void> {
    try {
      const hasPermission = await this.actorService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      await this.actorService.deleteActor(req.params.id);

      return res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error deleting actor:', error);
        if (error.message === 'Actor not found') {
          return res.status(404).json({
            success: false,
            error: 'Actor not found'
          });
        }
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to delete actor'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to delete actor'
      });
    }
  }

  /**
   * Search actors based on query parameters
   * @route GET /api/actors/search
   * @access Public
   */
  async searchActors(
    req: Request,
    res: Response<SearchActorsResponse>
  ): Promise<Response<SearchActorsResponse> | void> {
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
        searchActorsQuerySchema.parse(query);
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          return res.status(400).json({
            success: false,
            data: [],
            error: JSON.parse(validationError.message)
          });
        }
      }

      const actors = await this.actorService.searchActors(query as Record<string, QueryValue>);
      return res.json({
        success: true,
        data: actors
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error searching actors:', error);
      }
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Failed to search actors'
      });
    }
  }
}
