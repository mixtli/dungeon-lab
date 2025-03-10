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

// Bind controller methods to maintain correct 'this' context
const getEncounter = encounterController.getEncounter.bind(encounterController);
const updateEncounter = encounterController.updateEncounter.bind(encounterController);
const deleteEncounter = encounterController.deleteEncounter.bind(encounterController);

// Define routes
router.get('/:id', authenticate, getEncounter);
router.put('/:id', authenticate, validateUpdateEncounter, updateEncounter);
router.delete('/:id', authenticate, deleteEncounter);

export const encounterRoutes = router; 