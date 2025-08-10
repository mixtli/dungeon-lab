import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../../utils/logger.mjs';
import { isErrorWithMessage } from '../../../utils/error.mjs';
import { ActorService } from '../services/actor.service.mjs';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';
import { IActor } from '@dungeon-lab/shared/types/index.mjs';
import {
  putActorRequestSchema,
  createActorRequestSchema,
  patchActorRequestSchema,
  searchActorsQuerySchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { createSearchParams } from '../../../utils/create.search.params.mjs';
import { QueryValue } from '@dungeon-lab/shared/types/index.mjs';

export class ActorController {
  private actorService: ActorService;

  constructor(actorService?: ActorService) {
    this.actorService = actorService || new ActorService();
  }

  /**
   * Get actors with flexible filtering through query parameters
   * @route GET /api/actors
   * @param {Object} query - Query parameters to filter actors by
   * @access Public
   */
  getActors = async (
    req: Request,
    res: Response<BaseAPIResponse<IActor[]>>
  ): Promise<Response<BaseAPIResponse<IActor[]>> | void> => {
    try {
      // Convert query object to a Record with string values
      const queryParams: Record<string, QueryValue> = {};

      // Add all query parameters to the record
      for (const [key, value] of Object.entries(req.query)) {
        if (value !== undefined) {
          queryParams[key] = value as QueryValue;
        }
      }

      // Special handling for userCharactersOnly parameter
      const userCharactersOnly = queryParams.userCharactersOnly === 'true';
      if (userCharactersOnly && req.session.user) {
        // Filter by the current logged-in user
        queryParams.createdBy = req.session.user.id;
        delete queryParams.userCharactersOnly; // Remove this special parameter
      }

      console.log('My queryParams', queryParams);
      // Process query parameters including any nested values
      const searchParams = createSearchParams(queryParams);

      // Get actors using the service with the processed search parameters
      const actors = await this.actorService.searchActors(searchParams);

      return res.json({
        success: true,
        data: actors
      });
    } catch (error) {
      if (isErrorWithMessage(error)) {
        logger.error('Error fetching actors:', error);
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
   * Create a new actor
   * @route POST /api/actors
   * @access Private
   */
  createActor = async (
    req: Request<object, object, z.infer<typeof createActorRequestSchema>>,
    res: Response<BaseAPIResponse<IActor>>
  ): Promise<Response<BaseAPIResponse<IActor>> | void> => {
    // Validate request body
    const validatedData = createActorRequestSchema.parse(req.body);

    // Get the token file from req.assets
    const tokenFile = req.assets?.tokenImage?.[0];

    const data = validatedData.pluginData;
    if (!data) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Plugin data is required'
      });
    }

    // Note: Plugin validation now happens client-side only
    // Server trusts that client has already validated plugin data

    // Destructure validatedData while renaming tokenImage to bypass unused variable warnings
    const { tokenImage: _tokenImage, ...actorData } = validatedData;

    // Create the actor using the service
    const actor = await this.actorService.createActor(
      actorData,
      req.session.user.id,
      tokenFile
    );

    return res.status(201).json({
      success: true,
      data: actor
    });
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

    // Get token file from req.assets if present
    const tokenFile = req.assets?.tokenImage?.[0];

    const { tokenImage: _tokenImage, ...actorData } = validatedData;
    // Update the actor using the service
    const actor = await this.actorService.putActor(
      req.params.id,
      actorData,
      req.session.user.id,
      tokenFile
    );

    return res.json({
      success: true,
      data: actor
    });
  };

  /**
   * Partially update an actor
   * @route PATCH /api/actors/:id
   * @access Private
   */
  patchActor = async (
    req: Request<{ id: string }>,
    res: Response
  ): Promise<Response<BaseAPIResponse<IActor>>> => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(403).json({ success: false, data: null, error: 'Access denied' });
    }

    // Parse the request body and let ZodError bubble up to middleware
    const validatedData = patchActorRequestSchema.parse(req.body);

    try {
      // Extract only the fields from validatedData that are needed by patchActor
      // Omit the tokenImage field which is causing type issues and rename with underscore prefix
      const { tokenImage: _tokenImage, ...restData } = validatedData;

      // Add the id from the route parameter
      const actorData = { ...restData, id: req.params.id };

      const actor = await this.actorService.patchActor(req.params.id, actorData, userId);

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

  // TODO: Avatar functionality removed - actors no longer have avatars

  /**
   * Upload an actor's token
   * @route PUT /api/actors/:id/token
   * @access Private
   */
  uploadActorToken = async (
    req: Request<{ id: string }>,
    res: Response
  ): Promise<Response<BaseAPIResponse<IActor>>> => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(403).json({ success: false, data: null, error: 'Access denied' });
    }

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

      // Create a File object from the buffer
      const file = new File([imageBuffer], `token_${Date.now()}.${contentType.split('/')[1]}`, {
        type: contentType
      });

      const actor = await this.actorService.updateActorToken(req.params.id, file, userId);

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

  // TODO: Avatar generation functionality removed - actors no longer have avatars

  /**
   * Generate an actor's token using AI
   * @route POST /api/actors/:id/generate-token
   * @access Private
   */
  generateActorToken = async (
    req: Request<{ id: string }>,
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
  deleteActor = async (
    req: Request<{ id: string }>,
    res: Response
  ): Promise<Response<BaseAPIResponse<void>>> => {
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
    req: Request<object, object, object, z.infer<typeof searchActorsQuerySchema>>,
    res: Response
  ): Promise<Response<BaseAPIResponse<IActor[]>>> => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(403).json({ success: false, data: null, error: 'Access denied' });
    }

    // Parse the query and let ZodError bubble up to middleware
    const validatedQuery = searchActorsQuerySchema.parse(req.query);

    try {
      // Convert the zod parsed result to the correct query format
      const queryParams: Record<string, string> = {};

      // Only add defined values as strings
      if (validatedQuery.name) queryParams.name = validatedQuery.name;
      if (validatedQuery.type) queryParams.type = validatedQuery.type;
      if (validatedQuery.gameSystemId) queryParams.gameSystemId = validatedQuery.gameSystemId;

      const actors = await this.actorService.searchActors(queryParams);
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
