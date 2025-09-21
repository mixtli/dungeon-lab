import { Router } from 'express';
import { GameSessionController } from '../controllers/game-session.controller.mjs';
import { GameSessionService } from '../services/game-session.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';

// Initialize services and controller
const gameSessionService = new GameSessionService();
const gameSessionController = new GameSessionController(gameSessionService);

// Create router
const router = Router();

// Define routes
router.get('/', authenticate, gameSessionController.getGameSessions);

router.get('/:id', authenticate, gameSessionController.getGameSession);

router.post('/', authenticate, gameSessionController.createGameSession);

router.patch('/:id', authenticate, gameSessionController.updateGameSession);

router.delete('/:id', authenticate, gameSessionController.deleteGameSession);

// Session state management endpoints
router.post('/:id/start', authenticate, gameSessionController.startGameSession);

router.post('/:id/pause', authenticate, gameSessionController.pauseGameSession);

router.post('/:id/resume', authenticate, gameSessionController.resumeGameSession);

router.post('/:id/end', authenticate, gameSessionController.endGameSession);

// Add route for getting sessions by campaign ID using query parameter
router.get('/campaign', authenticate, gameSessionController.getCampaignSessions);

export { router as gameSessionRoutes };