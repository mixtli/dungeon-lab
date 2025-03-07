import express from 'express';
import { Encounter } from '../models/encounter.model.mjs';
import { CampaignModel } from '../models/campaign.model.mjs';
import { MapModel } from '../models/map.model.mjs';
import { authenticate } from '../middleware/auth.middleware.mjs';
import { validateRequest } from '../middleware/validation.middleware.mjs';
import { encounterCreateSchema, encounterUpdateSchema } from '@dungeon-lab/shared/src/schemas/encounter.schema.mjs';
import mongoose from 'mongoose';

const router = express.Router();

// Get encounters for a campaign
router.get('/campaigns/:campaignId/encounters', authenticate, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Verify campaign exists and user has access
    const campaign = await CampaignModel.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    // Get encounters
    const encounters = await Encounter.find({ campaignId })
      .populate('mapId', 'name imageUrl thumbnailUrl')
      .sort('-createdAt');
    
    res.json(encounters);
  } catch (err) {
    console.error('Error fetching encounters:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all encounters
router.get('/encounters', authenticate, async (req, res) => {
  try {
    // Find encounters for the current user (either as creator or campaign GM)
    const encounters = await Encounter.find({
      $or: [
        { createdBy: req.session.user.id },
        { 'campaignId.gameMasterId': req.session.user.id }
      ]
    })
      .populate('mapId', 'name imageUrl thumbnailUrl')
      .sort('-createdAt');
    
    res.json(encounters);
  } catch (err) {
    console.error('Error fetching encounters:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single encounter
router.get('/encounters/:id', authenticate, async (req, res) => {
  try {
    const encounter = await Encounter.findById(req.params.id)
      .populate('mapId', 'name imageUrl thumbnailUrl')
      .populate('participants', 'name avatarUrl');
    
    if (!encounter) {
      return res.status(404).json({ message: 'Encounter not found' });
    }
    
    res.json(encounter);
  } catch (err) {
    console.error('Error fetching encounter:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create encounter
router.post(
  '/campaigns/:campaignId/encounters',
  authenticate,
  validateRequest(encounterCreateSchema),
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      
      // Verify campaign exists and user has access
      const campaign = await CampaignModel.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      
      // Verify map exists
      const map = await MapModel.findById(req.body.mapId);
      if (!map) {
        return res.status(404).json({ message: 'Map not found' });
      }
      
      // Create encounter
      const encounter = new Encounter({
        _id: new mongoose.Types.ObjectId(),
        ...req.body,
        campaignId,
        createdBy: req.session.user.id,
        updatedBy: req.session.user.id,
      });
      
      await encounter.save();
      
      res.status(201).json(encounter);
    } catch (err) {
      console.error('Error creating encounter:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Update encounter
router.patch(
  '/encounters/:id',
  authenticate,
  validateRequest(encounterUpdateSchema),
  async (req, res) => {
    try {
      const encounter = await Encounter.findById(req.params.id);
      if (!encounter) {
        return res.status(404).json({ message: 'Encounter not found' });
      }
      
      // If mapId is being updated, verify it exists
      if (req.body.mapId) {
        const map = await MapModel.findById(req.body.mapId);
        if (!map) {
          return res.status(404).json({ message: 'Map not found' });
        }
      }
      
      // Update encounter
      Object.assign(encounter, {
        ...req.body,
        updatedBy: req.session.user.id,
      });
      
      await encounter.save();
      
      res.json(encounter);
    } catch (err) {
      console.error('Error updating encounter:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Delete encounter
router.delete('/encounters/:id', authenticate, async (req, res) => {
  try {
    const encounter = await Encounter.findById(req.params.id);
    if (!encounter) {
      return res.status(404).json({ message: 'Encounter not found' });
    }
    
    await encounter.deleteOne();
    
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting encounter:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 