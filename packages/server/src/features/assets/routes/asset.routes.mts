import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import assetController from '../controllers/asset.controller.mjs';
import {
  validateRequest,
  //validateMultipartRequest
} from '../../../middleware/validation.middleware.mjs';
import { createPathSchema, oapi } from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
import { assetSchema, assetUpdateSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import {
  baseAPIResponseSchema,
  deleteAPIResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import multer from 'multer';
const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 10MB limit
  }
});

// Apply authentication middleware to all asset routes
router.use(authenticate);

// Create response schemas using baseAPIResponseSchema
const getAssetsResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(assetSchema)
});

const getAssetResponseSchema = baseAPIResponseSchema.extend({
  data: assetSchema
});

const signedUrlResponseSchema = baseAPIResponseSchema.extend({
  data: z.object({
    url: z.string()
  })
});

// GET /api/assets - Get all assets for the current user
router.get(
  '/',
  oapi.validPath(
    createPathSchema({
      description: 'Get all assets for the current user',
      responses: {
        200: {
          description: 'List of assets',
          content: {
            'application/json': {
              schema: getAssetsResponseSchema.openapi({
                description: 'Assets response'
              })
            }
          }
        }
      }
    })
  ),
  assetController.listAssets
);

// Define asset creation schema
const createAssetSchema = assetSchema
  .omit({ id: true, createdBy: true, createdAt: true, updatedAt: true })
  .partial();

// POST /api/assets - Create a new asset
router.post(
  '/',
  upload.single('file'),
  oapi.path(
    createPathSchema({
      description: 'Upload and create a new asset',
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: createAssetSchema
              .extend({
                file: z.any().openapi({
                  type: 'string',
                  format: 'binary',
                  description: 'The file to upload'
                })
              })
              .openapi({
                description: 'Create asset request with file'
              })
          }
        }
      },
      responses: {
        201: {
          description: 'Asset created successfully',
          content: {
            'application/json': {
              schema: getAssetResponseSchema.openapi({
                description: 'Create asset response'
              })
            }
          }
        },
        400: {
          description: 'Invalid request data'
        }
      }
    })
  ),
  //validateMultipartRequest(createAssetSchema, ['file']),
  assetController.createAsset
);


// GET /api/assets/:id - Get an asset by ID
router.get(
  '/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Get an asset by ID',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Asset found',
          content: {
            'application/json': {
              schema: getAssetResponseSchema.openapi({
                description: 'Asset response'
              })
            }
          }
        },
        404: {
          description: 'Asset not found'
        }
      }
    })
  ),
  assetController.getAssetById
);

// PATCH /api/assets/:id - Update an asset
router.patch(
  '/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Update an asset',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: assetUpdateSchema.openapi({
              description: 'Update asset request'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Asset updated successfully',
          content: {
            'application/json': {
              schema: getAssetResponseSchema.openapi({
                description: 'Updated asset response'
              })
            }
          }
        },
        404: {
          description: 'Asset not found'
        },
        403: {
          description: 'Permission denied'
        }
      }
    })
  ),
  validateRequest(assetUpdateSchema),
  assetController.updateAsset
);

// DELETE /api/assets/:id - Delete an asset
router.delete(
  '/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Delete an asset',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        204: {
          description: 'Asset deleted successfully',
          content: {
            'application/json': {
              schema: deleteAPIResponseSchema.openapi({
                description: 'Delete asset response'
              })
            }
          }
        },
        404: {
          description: 'Asset not found'
        },
        403: {
          description: 'Permission denied'
        }
      }
    })
  ),
  assetController.deleteAsset
);

// GET /api/assets/:id/signed-url - Get a pre-signed URL for an asset
router.get(
  '/:id/signed-url',
  oapi.validPath(
    createPathSchema({
      description: 'Generate a temporary pre-signed URL for accessing an asset',
      requestParams: {
        path: z.object({ id: z.string() }),
        query: z.object({
          expiry: z.string().optional().describe('Expiry time in seconds (default: 3600)')
        })
      },
      responses: {
        200: {
          description: 'Pre-signed URL generated successfully',
          content: {
            'application/json': {
              schema: signedUrlResponseSchema.openapi({
                description: 'Pre-signed URL response'
              })
            }
          }
        }
      }
    })
  ),
  assetController.getSignedUrl
);

export default router;
