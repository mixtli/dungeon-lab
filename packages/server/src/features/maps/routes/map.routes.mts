import { Router } from 'express';
import { MapController } from '../controllers/map.controller.mjs';
import { MapService } from '../services/map.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import express from 'express';
import { Request, Response, NextFunction } from 'express';

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
router.post(
  '/',
  // Content type check middleware
  (req: Request, res: Response, next: NextFunction) => {
    if (req.is('application/uvtt')) {
      // For UVTT files, use the raw body parser middleware
      return express.raw({
        type: 'application/uvtt',
        limit: '50mb'
      })(req, res, next);
    }
    // For other content types, continue to next middleware
    next();
  },
  // Controller handler that routes based on content type
  (req: Request, res: Response, next: NextFunction) => {
    if (req.is('application/uvtt')) {
      return mapController.importUVTT(req, res, next);
    }
    return mapController.createMap(req, res, next);
  }
);

// Import UVTT file
router.post(
  '/import-uvtt',
  express.raw({
    type: 'application/uvtt',
    limit: '50mb'
  }),
  mapController.importUVTT
);

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

// Export map as UVTT
router.get('/:id/export-uvtt', mapController.exportUVTT);

// Delete map
router.delete('/:id', mapController.deleteMap);

export { router as mapRoutes };