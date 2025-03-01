import { Request, Response } from 'express';
import { ActorModel } from '../models/actor.model.js';
import { logger } from '../utils/logger.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

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
 * Create a new actor
 * @route POST /api/actors
 * @access Private
 */
export async function createActor(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, type, data, gameSystemId } = req.body;
    
    if (!name || !type || !gameSystemId) {
      return res.status(400).json({ message: 'Name, type, and gameSystemId are required' });
    }
    
    const actor = new ActorModel({
      name,
      type,
      data,
      gameSystemId,
      createdBy: req.user?.id,
      updatedBy: req.user?.id
    });
    
    const savedActor = await actor.save();
    res.status(201).json(savedActor);
  } catch (error) {
    logger.error(`Error creating actor: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ message: 'Error creating actor' });
  }
}

/**
 * Update an existing actor
 * @route PUT /api/actors/:id
 * @access Private
 */
export async function updateActor(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, type, data, gameSystemId } = req.body;
    const actorId = req.params.id;
    
    const actor = await ActorModel.findById(actorId);
    
    if (!actor) {
      return res.status(404).json({ message: 'Actor not found' });
    }
    
    // Check ownership
    if (actor.createdBy && actor.createdBy.toString() !== req.user?.id) {
      return res.status(403).json({ message: 'Not authorized to update this actor' });
    }
    
    // Update fields
    if (name) actor.name = name;
    if (type) actor.type = type;
    if (data) actor.data = data;
    if (gameSystemId) actor.gameSystemId = gameSystemId;
    if (req.user?.id) actor.updatedBy = req.user.id;
    
    const updatedActor = await actor.save();
    res.json(updatedActor);
  } catch (error) {
    logger.error(`Error updating actor: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ message: 'Error updating actor' });
  }
}

/**
 * Delete an actor
 * @route DELETE /api/actors/:id
 * @access Private
 */
export async function deleteActor(req: AuthenticatedRequest, res: Response) {
  try {
    const actorId = req.params.id;
    const actor = await ActorModel.findById(actorId);
    
    if (!actor) {
      return res.status(404).json({ message: 'Actor not found' });
    }
    
    // Check ownership
    if (actor.createdBy && actor.createdBy.toString() !== req.user?.id) {
      return res.status(403).json({ message: 'Not authorized to delete this actor' });
    }
    
    await ActorModel.findByIdAndDelete(actorId);
    res.json({ message: 'Actor deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting actor: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ message: 'Error deleting actor' });
  }
}