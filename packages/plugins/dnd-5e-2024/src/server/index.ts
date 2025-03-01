import { Router } from 'express';
import createInitiativeRouter from './initiative-route';

/**
 * Create the D&D 5e 2024 plugin router
 * @returns Express router for the D&D 5e 2024 plugin
 */
export function createDnd5e2024Router(): Router {
  const router = Router();
  
  // Mount initiative router at /initiative
  router.use('/initiative', createInitiativeRouter());
  
  return router;
}

export default createDnd5e2024Router; 