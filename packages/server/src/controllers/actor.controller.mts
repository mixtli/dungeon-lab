import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ActorModel } from '../models/actor.model.mjs';
import { AuthenticatedRequest } from '../middleware/auth.middleware.mjs';
import { IActorCreateData, IActorUpdateData } from '@dungeon-lab/shared/index.mjs';
import { logger } from '../utils/logger.mjs';

/**
 * Get all actors
 * @route GET /api/actors
 * @access Public
 */
export async function getAllActors(req: Request, res: Response) {
  try {
    const actors = await ActorModel.find();
    res.json(actors);
  } catch (error) {
    logger.error(`Error getting actors: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ message: 'Error retrieving actors' });
  }
}

/**
 * Get actor by ID
 * @route GET /api/actors/:id
 * @access Public
 */
export async function getActorById(req: Request, res: Response) {
  try {
    const actor = await ActorModel.findById(req.params.id);
    
    if (!actor) {
      return res.status(404).json({ message: 'Actor not found' });
    }
    
    res.json(actor);
  } catch (error) {
    logger.error(`Error getting actor: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ message: 'Error retrieving actor' });
  }
}

/**
 * Get actors for a campaign
 * @route GET /api/actors/campaign/:campaignId
 * @access Private
 */
export async function getActors(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const actors = await ActorModel.find({ campaignId: req.params.campaignId });
    return res.json(actors);
  } catch (error) {
    logger.error('Error getting actors:', error);
    return res.status(500).json({ message: 'Failed to get actors' });
  }
}

/**
 * Get a specific actor
 * @route GET /api/actors/:id
 * @access Private
 */
export async function getActor(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const actor = await ActorModel.findById(req.params.id);
    if (!actor) {
      return res.status(404).json({ message: 'Actor not found' });
    }

    return res.json(actor);
  } catch (error) {
    logger.error('Error getting actor:', error);
    return res.status(500).json({ message: 'Failed to get actor' });
  }
}

/**
 * Create a new actor
 * @route POST /api/actors
 * @access Private
 */
export async function createActor(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const userId = new Types.ObjectId(req.session.user.id);
    const actorData: IActorCreateData = {
      ...req.body,
      createdBy: userId,
      updatedBy: userId
    };

    const actor = await ActorModel.create(actorData);
    return res.status(201).json(actor);
  } catch (error) {
    logger.error('Error creating actor:', error);
    return res.status(500).json({ message: 'Failed to create actor' });
  }
}

/**
 * Update an existing actor
 * @route PUT /api/actors/:id
 * @access Private
 */
export async function updateActor(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const actor = await ActorModel.findById(req.params.id);
    if (!actor) {
      return res.status(404).json({ message: 'Actor not found' });
    }

    // Check if user has permission to update
    const userId = new Types.ObjectId(req.session.user.id);
    if (actor.createdBy && actor.createdBy.toString() !== userId.toString() && !req.session.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updateData: IActorUpdateData = {
      ...req.body,
      updatedBy: userId
    };

    const updatedActor = await ActorModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    return res.json(updatedActor);
  } catch (error) {
    logger.error('Error updating actor:', error);
    return res.status(500).json({ message: 'Failed to update actor' });
  }
}

/**
 * Delete an actor
 * @route DELETE /api/actors/:id
 * @access Private
 */
export async function deleteActor(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const actor = await ActorModel.findById(req.params.id);
    if (!actor) {
      return res.status(404).json({ message: 'Actor not found' });
    }

    // Check if user has permission to delete
    const userId = new Types.ObjectId(req.session.user.id);
    if (actor.createdBy && actor.createdBy.toString() !== userId.toString() && !req.session.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await ActorModel.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting actor:', error);
    return res.status(500).json({ message: 'Failed to delete actor' });
  }
}