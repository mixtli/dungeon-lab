import { Router } from 'express';
import { MapController } from '../controllers/map.controller.mjs';
import { MapService } from '../services/map.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateMultipartRequest } from '../../../middleware/validation.middleware.mjs';
import { mapCreateSchema, mapSchema } from '@dungeon-lab/shared/schemas/map.schema.mjs';
import { openApiGet, openApiGetOne, openApiPost, openApiDelete, openApiPatch } from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
import express from 'express';

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
  generateMapImage: mapController.generateMapImage.bind(mapController),
  uploadMapImage: mapController.uploadMapImage.bind(mapController),
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

router.post('/',
  openApiPost(mapCreateSchema, {
    description: 'Create new map'
  }), 
  validateMultipartRequest(mapCreateSchema, 'image'),
  boundController.createMap
);

// Upload a binary map image
router.post('/:id/image', 
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '10mb'
  }),
  openApiPost(z.null(), {
    description: 'Upload raw map image',
    requestBody: {
      content: {
        'image/*': {
          schema: {
            type: 'string',
            format: 'binary'
          }
        }
      }
    }
  }), 
  boundController.uploadMapImage
);

router.post('/:id/image/generate', openApiPost(z.null(), {
  description: 'Generate map image'
}), boundController.generateMapImage);

router.patch('/:id', 
  openApiPatch(mapSchema, {
    description: 'Update map'
  }), 
  validateMultipartRequest(mapSchema.partial(), 'image'),
  boundController.updateMap
);

router.delete('/:id', openApiDelete(z.null(), {
  description: 'Delete map'
}), boundController.deleteMap);

export const mapRoutes = router; 