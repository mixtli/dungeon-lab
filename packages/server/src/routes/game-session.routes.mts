import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.mjs';
import { validateRequest } from '../middleware/validation.middleware.mjs';
import { gameSessionCreateSchema } from '@dungeon-lab/shared/index.mjs';
import { 
  createGameSession, 
  getGameSession, 
  getAllSessions, 
  deleteGameSession,
  updateSessionStatus,
  getCampaignSessions 
} from '../controllers/game-session.controller.mjs';

const router = Router();

// Get all sessions for current user
router.get('/', authenticate, getAllSessions);

// Get all sessions for a campaign
router.get('/campaign/:campaignId', authenticate, getCampaignSessions);

// Create a new game session
router.post('/',
  authenticate,
  validateRequest(gameSessionCreateSchema),
  createGameSession
);

// Get a specific game session
router.get('/:id',
  authenticate,
  getGameSession
);

// Update session status
router.patch('/:id/status',
  authenticate,
  updateSessionStatus
);

// Delete a game session
router.delete('/:id',
  authenticate,
  deleteGameSession
);

export default router; 