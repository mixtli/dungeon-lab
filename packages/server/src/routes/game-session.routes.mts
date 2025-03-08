import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.mjs';
import { validateRequest } from '../middleware/validation.middleware.mjs';
import { gameSessionCreateSchema } from '@dungeon-lab/shared/index.mjs';
import { createGameSession, getGameSession } from '../controllers/game-session.controller.mjs';

const router = Router();

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

export default router; 