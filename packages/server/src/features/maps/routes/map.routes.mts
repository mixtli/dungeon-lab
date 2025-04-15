import { Router } from 'express';
import { MapController } from '../controllers/map.controller.mjs';
import { MapService } from '../services/map.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest, validateMultipartRequest } from '../../../middleware/validation.middleware.mjs';
import { mapSchema } from '@dungeon-lab/shared/schemas/map.schema.mjs';
import { openApiGet, openApiGetOne, openApiPost, openApiDelete, openApiPatch } from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';

const router = Router();
const mapService = new MapService();
const mapController = new MapController(mapService);

// Bind controller methods to maintain 'this' context
const boundController = {
  getAllMaps: mapController.getAllMaps.bind(mapController),
  getMaps: mapController.getMaps.bind(mapController),
  getMap: mapController.getMap.bind(mapController),
  createMap: mapController.createMap.bind(mapController),
  updateMap: mapController.updateMap.bind(mapController),
  deleteMap: mapController.deleteMap.bind(mapController),
};

// Routes
router.use(authenticate);

router.get('/', openApiGet(mapSchema, {
  description: 'Get all maps'
}), boundController.getAllMaps);

router.get('/campaigns/:campaignId', openApiGet(mapSchema, {
  description: 'Get maps for a campaign'
}), boundController.getMaps);

router.get('/:id', openApiGetOne(mapSchema, {
  description: 'Get map by ID'
}), boundController.getMap);

// Set a longer timeout for map creation due to AI image generation
router.post('/',
  openApiPost(mapSchema, {
    description: 'Create new map'
  }), 
  validateMultipartRequest(mapSchema, 'image'), 
  boundController.createMap
);

router.patch('/:id', openApiPatch(mapSchema, {
  description: 'Update map'
}), validateRequest(mapSchema.partial()), boundController.updateMap);

router.delete('/:id', openApiDelete(z.null(), {
  description: 'Delete map'
}), boundController.deleteMap);

export const mapRoutes = router; 