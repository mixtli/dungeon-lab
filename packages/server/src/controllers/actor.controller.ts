import { Request, Response } from 'express';
import { ActorModel } from '../models/actor.model';
import mongoose from 'mongoose';

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
    console.error('Error fetching actors:', error);
    res.status(500).json({ message: 'Server error' });
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
    console.error('Error fetching actor:', error);
    
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid actor ID' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Create a new actor
 * @route POST /api/actors
 * @access Private
 */
export async function createActor(req: Request, res: Response) {
  try {
    const newActor = new ActorModel({
      ...req.body,
      createdBy: req.user!.id,
      updatedBy: req.user!.id
    });
    
    const actor = await newActor.save();
    res.status(201).json(actor);
  } catch (error) {
    console.error('Error creating actor:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Update an actor
 * @route PUT /api/actors/:id
 * @access Private
 */
export async function updateActor(req: Request, res: Response) {
  try {
    const actor = await ActorModel.findById(req.params.id);
    
    if (!actor) {
      return res.status(404).json({ message: 'Actor not found' });
    }
    
    // Check if user is the creator of the actor
    if (actor.createdBy.toString() !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this actor' });
    }
    
    const updatedActor = await ActorModel.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body,
        updatedBy: req.user!.id 
      },
      { new: true, runValidators: true }
    );
    
    res.json(updatedActor);
  } catch (error) {
    console.error('Error updating actor:', error);
    
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid actor ID' });
    }
    
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Delete an actor
 * @route DELETE /api/actors/:id
 * @access Private
 */
export async function deleteActor(req: Request, res: Response) {
  try {
    const actor = await ActorModel.findById(req.params.id);
    
    if (!actor) {
      return res.status(404).json({ message: 'Actor not found' });
    }
    
    // Check if user is the creator of the actor
    if (actor.createdBy.toString() !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this actor' });
    }
    
    await ActorModel.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Actor removed' });
  } catch (error) {
    console.error('Error deleting actor:', error);
    
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid actor ID' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
}