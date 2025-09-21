import express from 'express';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { CharacterService } from '../services/character.service.mjs';

const router = express.Router();
const characterService = new CharacterService();

// Apply authentication middleware to all character routes
router.use(authenticate);

// Generate character image
router.post(
  '/:id/generate-image',
  async (req, res) => {
    try {
      const { id } = req.params;
      const { imageType, customPrompt } = req.body;
      const userId = req.session.user!.id;

      await characterService.scheduleImageGeneration(id, imageType, userId, customPrompt);

      res.json({
        success: true,
        data: {
          message: `${imageType} generation scheduled`,
          characterId: id,
          imageType
        }
      });
    } catch (error) {
      console.error('Error scheduling character image generation:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to schedule image generation'
      });
    }
  }
);

// Generate character avatar (convenience endpoint)
router.post(
  '/:id/generate-avatar',
  async (req, res) => {
    try {
      const { id } = req.params;
      const { customPrompt } = req.body || {};
      const userId = req.session.user!.id;

      await characterService.scheduleImageGeneration(id, 'avatar', userId, customPrompt);

      res.json({
        success: true,
        data: {
          message: 'Avatar generation scheduled',
          characterId: id,
          imageType: 'avatar'
        }
      });
    } catch (error) {
      console.error('Error scheduling character avatar generation:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to schedule avatar generation'
      });
    }
  }
);

// Generate character token (convenience endpoint)
router.post(
  '/:id/generate-token',
  async (req, res) => {
    try {
      const { id } = req.params;
      const { customPrompt } = req.body || {};
      const userId = req.session.user!.id;

      await characterService.scheduleImageGeneration(id, 'token', userId, customPrompt);

      res.json({
        success: true,
        data: {
          message: 'Token generation scheduled',
          characterId: id,
          imageType: 'token'
        }
      });
    } catch (error) {
      console.error('Error scheduling character token generation:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to schedule token generation'
      });
    }
  }
);

// Add character to campaign
router.put(
  '/:id/campaign',
  async (req, res) => {
    try {
      const { id } = req.params;
      const { campaignId } = req.body;
      const userId = req.session.user!.id;

      await characterService.joinCampaign(id, campaignId, userId);

      res.json({
        success: true,
        data: {
          message: 'Character added to campaign',
          characterId: id,
          campaignId
        }
      });
    } catch (error) {
      console.error('Error adding character to campaign:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add character to campaign'
      });
    }
  }
);

// Remove character from campaign
router.delete(
  '/:id/campaign',
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.user!.id;

      await characterService.leaveCampaign(id, userId);

      res.json({
        success: true,
        data: {
          message: 'Character removed from campaign',
          characterId: id
        }
      });
    } catch (error) {
      console.error('Error removing character from campaign:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to remove character from campaign'
      });
    }
  }
);

export default router;