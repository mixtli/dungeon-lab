import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import assetController from '../controllers/asset.controller.mjs';
import multer from 'multer';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Apply authentication middleware to all asset routes
router.use(authenticate);

// GET /api/assets - Get all assets for the current user
router.get('/', assetController.listAssets);

// POST /api/assets - Create a new asset
router.post('/', upload.single('file'), assetController.createAsset);

// GET /api/assets/:id - Get an asset by ID
router.get('/:id', assetController.getAssetById);

// PATCH /api/assets/:id - Update an asset
router.patch('/:id', assetController.updateAsset);

// DELETE /api/assets/:id - Delete an asset
router.delete('/:id', assetController.deleteAsset);

// GET /api/assets/:id/signed-url - Get a pre-signed URL for an asset
router.get('/:id/signed-url', assetController.getSignedUrl);

export default router;