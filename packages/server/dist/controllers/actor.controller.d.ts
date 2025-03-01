import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
/**
 * Get all actors
 * @route GET /api/actors
 * @access Public
 */
export declare function getAllActors(req: Request, res: Response): Promise<void>;
/**
 * Get actor by ID
 * @route GET /api/actors/:id
 * @access Public
 */
export declare function getActorById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Create a new actor
 * @route POST /api/actors
 * @access Private
 */
export declare function createActor(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Update an existing actor
 * @route PUT /api/actors/:id
 * @access Private
 */
export declare function updateActor(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Delete an actor
 * @route DELETE /api/actors/:id
 * @access Private
 */
export declare function deleteActor(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
