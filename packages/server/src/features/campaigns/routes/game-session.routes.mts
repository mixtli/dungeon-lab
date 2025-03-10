import { Router } from 'express';
import { GameSessionController } from '../controllers/game-session.controller.mjs';
import { GameSessionService } from '../services/game-session.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { gameSessionCreateSchema, gameSessionUpdateSchema } from '@dungeon-lab/shared/src/schemas/game-session.schema.mjs';

// Initialize services and controllers
const gameSessionService = new GameSessionService();
const gameSessionController = new GameSessionController(gameSessionService);

// Create router
const router = Router();

// Bind controller methods to maintain 'this' context
const boundGetGameSessions = gameSessionController.getGameSessions.bind(gameSessionController);
const boundGetGameSession = gameSessionController.getGameSession.bind(gameSessionController);
const boundUpdateGameSession = gameSessionController.updateGameSession.bind(gameSessionController);
const boundDeleteGameSession = gameSessionController.deleteGameSession.bind(gameSessionController);

// Routes
router.get('/', authenticate, boundGetGameSessions);
router.get('/:id', authenticate, boundGetGameSession);
router.put('/:id', authenticate, validateRequest(gameSessionUpdateSchema), boundUpdateGameSession);
router.delete('/:id', authenticate, boundDeleteGameSession);

export { router as gameSessionRoutes }; 