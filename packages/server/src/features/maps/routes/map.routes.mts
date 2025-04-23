import { Router } from 'express';
import { MapController } from '../controllers/map.controller.mjs';
import { MapService } from '../services/map.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateMultipartRequest } from '../../../middleware/validation.middleware.mjs';
import { mapCreateSchema, mapSchema } from '@dungeon-lab/shared/schemas/map.schema.mjs';
import {
  openApiGet,
  openApiGetOne,
  openApiPost,
  openApiPut,
  openApiPatch,
  openApiDelete
} from '../../../oapi.mjs';
import { deepPartial } from '@dungeon-lab/shared/utils/deepPartial.mjs';
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
  putMap: mapController.putMap.bind(mapController),
  patchMap: mapController.patchMap.bind(mapController),
  deleteMap: mapController.deleteMap.bind(mapController),
  generateMapImage: mapController.generateMapImage.bind(mapController),
  uploadMapImage: mapController.uploadMapImage.bind(mapController),
  searchMaps: mapController.searchMaps.bind(mapController)
};

// Routes
router.use(authenticate);

router.get(
  '/',
  openApiGet(mapSchema, {
    description: 'Search for maps based on query parameters'
  }),
  boundController.searchMaps
);

router.get(
  '/:id',
  openApiGetOne(mapSchema, {
    description: 'Get map by ID'
  }),
  boundController.getMap
);

router.post(
  '/',
  openApiPost(mapCreateSchema, {
    description: 'Create new map'
  }),
  validateMultipartRequest(mapCreateSchema, 'image'),
  boundController.createMap
);

// Upload a binary map image
router.put(
  '/:id/image',
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '10mb'
  }),
  openApiPut(z.string(), {
    description: 'Upload raw map image',
    requestBody: {
      content: {
        'image/jpeg': { schema: { type: 'string', format: 'binary' } },
        'image/png': { schema: { type: 'string', format: 'binary' } },
        'image/webp': { schema: { type: 'string', format: 'binary' } }
      }
    }
  }),
  boundController.uploadMapImage
);

router.post(
  '/:id/generate-image',
  openApiPost(z.object({}), {
    description: 'Generate map image'
  }),
  boundController.generateMapImage
);

router.put(
  '/:id',
  openApiPut(mapCreateSchema, {
    description: 'Replace map (full update)'
  }),
  validateMultipartRequest(mapCreateSchema, 'image'),
  boundController.putMap
);

router.patch(
  '/:id',
  openApiPatch(deepPartial(mapSchema), {
    description: 'Update map (partial update)'
  }),
  validateMultipartRequest(deepPartial(mapSchema), 'image'),
  boundController.patchMap
);

router.delete(
  '/:id',
  openApiDelete(z.string(), {
    description: 'Delete map'
  }),
  boundController.deleteMap
);

export const mapRoutes = router;
