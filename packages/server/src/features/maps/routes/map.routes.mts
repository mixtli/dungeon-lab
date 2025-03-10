import { Router } from 'express';
import { MapController } from '../controllers/map.controller.mjs';
import { MapService } from '../services/map.service.mjs';
import { MinioService } from '../../../services/minio.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest, validateMultipartRequest } from '../../../middleware/validation.middleware.mjs';
import { mapCreateSchema, mapUpdateSchema } from '@dungeon-lab/shared/src/schemas/map.schema.mjs';

const router = Router();
const minioService = new MinioService();
const mapService = new MapService(minioService);
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

router.get('/', boundController.getAllMaps);
router.get('/campaigns/:campaignId', boundController.getMaps);
router.get('/:id', boundController.getMap);
router.post('/', validateMultipartRequest(mapCreateSchema), boundController.createMap);
router.patch('/:id', validateRequest(mapUpdateSchema), boundController.updateMap);
router.delete('/:id', boundController.deleteMap);

export const mapRoutes = router; 