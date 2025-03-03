import { Router } from 'express';
import multer from 'multer';
import { createMap, getMaps, getMap, updateMap, deleteMap, getMapImageUrl } from '../controllers/map.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.get('/', getMaps);
router.get('/:id', getMap);
router.get('/:id/image-url', getMapImageUrl);
router.post('/', upload.single('image'), createMap);
router.patch('/:id', updateMap);
router.delete('/:id', deleteMap);

export default router; 