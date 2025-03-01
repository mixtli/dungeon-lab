import express from 'express';
import * as storageController from '../controllers/storage.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = express.Router();
// Public routes (no authentication required)
router.get('/files/:key', storageController.getFileUrl);
// Protected routes (authentication required)
router.post('/files', authenticate, storageController.uploadFile);
router.delete('/files/:key', authenticate, storageController.deleteFile);
router.get('/files', authenticate, storageController.listFiles);
export const storageRoutes = router;
//# sourceMappingURL=storage.routes.js.map