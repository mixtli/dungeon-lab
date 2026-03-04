import { Router } from 'express';
import { MapController } from '../controllers/map.controller.mjs';
import { MapService } from '../services/map.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import express from 'express';

// Initialize controller
const mapService = new MapService();
const mapController = new MapController(mapService);

// Create router
const router = Router();

// Apply authentication middleware to all map routes
router.use(authenticate);

// Search maps
router.get('/', mapController.searchMaps);

// Get map by ID
router.get('/:id', mapController.getMap);

// Create new map
router.post('/', mapController.createMap);

// Upload a binary map image
router.put(
  '/:id/image',
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '10mb'
  }),
  mapController.uploadMapImage
);

// Generate map image
router.post('/:id/generate-image', mapController.generateMapImage);

// Replace map (full update)
router.put('/:id', mapController.putMap);

// Update map (partial update)
router.patch('/:id', mapController.patchMap);

// Delete map
router.delete('/:id', mapController.deleteMap);

export { router as mapRoutes };
