import { Router } from 'express';
import { GameSessionController } from '../controllers/game-session.controller.mjs';
import { GameSessionService } from '../services/game-session.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { gameSessionUpdateSchema, gameSessionCreateSchema, gameSessionSchema } from '@dungeon-lab/shared/src/schemas/game-session.schema.mjs';
import { openApiGet, openApiGetOne, openApiPost, openApiPut, openApiDelete } from '../../../oapi.mjs';

// Initialize services and controllers
const gameSessionService = new GameSessionService();
const gameSessionController = new GameSessionController(gameSessionService);

// Create router
const router = Router();

// Bind controller methods to maintain 'this' context
const boundGetGameSessions = gameSessionController.getGameSessions.bind(gameSessionController);
const boundGetGameSession = gameSessionController.getGameSession.bind(gameSessionController);
const boundCreateGameSession = gameSessionController.createGameSession.bind(gameSessionController);
const boundUpdateGameSession = gameSessionController.updateGameSession.bind(gameSessionController);
const boundDeleteGameSession = gameSessionController.deleteGameSession.bind(gameSessionController);

// Routes
router.get('/', authenticate, openApiGet(gameSessionSchema, {
  description: 'Get all game sessions'
}), boundGetGameSessions);

router.get('/:id', authenticate, openApiGetOne(gameSessionSchema, {
  description: 'Get game session by ID'
}), boundGetGameSession);

router.post('/', authenticate, openApiPost(gameSessionCreateSchema, {
  description: 'Create a new game session'
}), validateRequest(gameSessionCreateSchema), boundCreateGameSession);

router.put('/:id', authenticate, openApiPut(gameSessionUpdateSchema, {
  description: 'Update a game session by ID'
}), validateRequest(gameSessionUpdateSchema), boundUpdateGameSession);

router.delete('/:id', authenticate, openApiDelete(gameSessionSchema, {
  description: 'Delete a game session by ID'
}), boundDeleteGameSession);

export { router as gameSessionRoutes }; 