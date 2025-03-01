import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ItemModel } from '../models/item.model.js';

/**
 * Get all items
 * @route GET /api/items
 * @access Public
 */
export async function getAllItems(req: Request, res: Response) {
  try {
    const items = await ItemModel.find();
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get item by ID
 * @route GET /api/items/:id
 * @access Public
 */
export async function getItemById(req: Request, res: Response) {
  try {
    const item = await ItemModel.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid item ID' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Create a new item
 * @route POST /api/items
 * @access Private
 */
export async function createItem(req: Request, res: Response) {
  try {
    const newItem = new ItemModel({
      ...req.body,
      createdBy: req.user!.id,
      updatedBy: req.user!.id
    });
    
    const item = await newItem.save();
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating item:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Update an item
 * @route PUT /api/items/:id
 * @access Private
 */
export async function updateItem(req: Request, res: Response) {
  try {
    const item = await ItemModel.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Check if user is the creator of the item
    if (item.createdBy.toString() !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this item' });
    }
    
    const updatedItem = await ItemModel.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body,
        updatedBy: req.user!.id 
      },
      { new: true, runValidators: true }
    );
    
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid item ID' });
    }
    
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Delete an item
 * @route DELETE /api/items/:id
 * @access Private
 */
export async function deleteItem(req: Request, res: Response) {
  try {
    const item = await ItemModel.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Check if user is the creator of the item
    if (item.createdBy.toString() !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this item' });
    }
    
    await ItemModel.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Item removed' });
  } catch (error) {
    console.error('Error deleting item:', error);
    
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid item ID' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
} 