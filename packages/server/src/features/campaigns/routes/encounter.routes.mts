import { Router } from 'express';
import { EncounterController } from '../controllers/encounter.controller.mjs';
import { EncounterService } from '../services/encounter.service.mjs';
import { validateUpdateEncounter } from '../middleware/encounter.validation.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';

// Initialize services and controller
const encounterService = new EncounterService();
const encounterController = new EncounterController(encounterService);

// Create router
const router = Router();

// Define routes - using arrow functions directly
router.get('/:id', authenticate, encounterController.getEncounter);
router.put('/:id', authenticate, validateUpdateEncounter, encounterController.updateEncounter);
router.delete('/:id', authenticate, encounterController.deleteEncounter);

export const encounterRoutes = router;
