import express from 'express';
import { CompendiumController } from '../controllers/compendium.controller.js';
import { TemplateController } from '../controllers/template.controller.js';
import { importController } from '../controllers/import.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import referenceResolutionRoutes from './reference-resolution.routes.js';

/**
 * Compendiums routes
 */
const router = express.Router();
const compendiumController = new CompendiumController();
const templateController = new TemplateController();
router.use(authenticate);

// Routes

// Get all compendium entries across compendiums (must be before /:id routes)
router.get('/entries', compendiumController.getAllCompendiumEntries);

// Get all compendiums
router.get('/', compendiumController.getCompendiums);

// Get compendium by ID
router.get('/:id', compendiumController.getCompendium);

// Create new compendium
router.post('/', compendiumController.createCompendium);

// Update compendium
router.put('/:id', compendiumController.updateCompendium);

// Delete compendium
router.delete('/:id', importController.deleteCompendium);

// Get compendium entries
router.get('/:id/entries', compendiumController.getCompendiumEntries);

// Create compendium entry
router.post('/:id/entries', compendiumController.createCompendiumEntry);

// Get compendium statistics
router.get('/:id/stats', compendiumController.getCompendiumStats);

// Get compendium entry by ID
router.get('/entries/:id', compendiumController.getCompendiumEntry);

// Update compendium entry
router.put('/entries/:id', compendiumController.updateCompendiumEntry);

// Delete compendium entry
router.delete('/entries/:id', compendiumController.deleteCompendiumEntry);

// Unlink content from compendium
router.delete('/entries/:id/unlink', compendiumController.unlinkContent);

// Template-related routes

// Instantiate template
router.post('/:compendiumId/entries/:entryId/instantiate', (req, res) => templateController.instantiateTemplate(req, res));

// Get template
router.get('/:compendiumId/entries/:entryId/template', (req, res) => templateController.getTemplate(req, res));

// Update template
router.put('/:compendiumId/entries/:entryId/template', (req, res) => templateController.updateTemplate(req, res));

// Get template usage statistics
router.get('/:compendiumId/entries/:entryId/usage', (req, res) => templateController.getTemplateUsage(req, res));

// Import-related routes

// Middleware to parse raw binary data for ZIP uploads
const parseRawZip = express.raw({
  type: 'application/zip',
  limit: '500mb'
});

// Import compendium from ZIP
router.post('/import', parseRawZip, importController.importZip);

// Get import job status
router.get('/import/:jobId/status', importController.getImportStatus);

// Validate ZIP file
router.post('/validate', parseRawZip, importController.validateZip);

// Cancel import job
router.delete('/import/:jobId', importController.cancelImport);

// Get user's import jobs
router.get('/import/jobs', importController.getUserImportJobs);

// Reference resolution routes
router.use('/', referenceResolutionRoutes);

export default router;