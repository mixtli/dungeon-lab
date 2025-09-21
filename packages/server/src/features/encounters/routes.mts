import { Router } from 'express';
import { EncounterController } from './controllers/encounters.controller.mjs';
import { EncounterService } from './services/encounters.service.mjs';
import { authenticate } from '../../middleware/auth.middleware.mjs';

// Initialize services and controller
const encounterService = new EncounterService();
const encounterController = new EncounterController(encounterService);

// Create router
const router = Router();

// ============================================================================
// ENCOUNTER ROUTES
// ============================================================================

/**
 * GET /encounters - Get all encounters
 */
router.get('/', authenticate, encounterController.getEncounters);

/**
 * GET /encounters/:id - Get encounter by ID
 */
router.get('/:id', authenticate, encounterController.getEncounter);

/**
 * POST /encounters - Create a new encounter
 */
router.post('/', authenticate, encounterController.createEncounter);

/**
 * PATCH /encounters/:id - Update an encounter
 */
router.patch('/:id', authenticate, encounterController.updateEncounter);

/**
 * DELETE /encounters/:id - Delete an encounter
 */
router.delete('/:id', authenticate, encounterController.deleteEncounter);

export const encounterRoutes = router;