import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import assetController from '../controllers/asset.controller.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import multer from 'multer';
import { openApiDelete, openApiGet, openApiGetOne, openApiPatch, openApiPost } from '../../../oapi.mjs';
import { assetModelSchema, assetUpdateSchema } from '@dungeon-lab/shared/schemas/asset.model.schema.mjs';

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const router = Router();

// GET /api/assets - Get all assets for the current user
router.get(
  '/',
  authenticate,
  openApiGet(assetModelSchema, {
    summary: 'Get all assets for the current user',
    description: 'Retrieve all assets owned by the authenticated user',
    tags: ['Assets'],
    responses: {
      200: {
        description: 'List of assets',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Asset'
              }
            }
          }
        }
      },
      401: {
        description: 'Unauthorized'
      }
    }
  }),
  assetController.listAssets
);

// POST /api/assets - Create a new asset
router.post(
  '/',
  authenticate,
  openApiPost(assetModelSchema, {
    summary: 'Upload and create a new asset',
    description: 'Upload a file and create a new asset with associated metadata',
    tags: ['Assets'],
    requestBody: {
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              file: {
                type: 'string',
                format: 'binary',
                description: 'The file to upload',
              },
              parentId: {
                type: 'string',
                description: 'The ID of the parent entity',
              },
              parentType: {
                type: 'string',
                description: 'The type of the parent entity',
              },
              fieldName: {
                type: 'string',
                description: 'The field name on the parent entity',
              },
            },
            required: ['file'],
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Asset created successfully',
      },
      400: {
        description: 'Invalid request data',
      },
    },
  }),
  upload.single('file'),
  assetController.createAsset
);

// GET /api/assets/:id - Get an asset by ID
router.get(
  '/:id',
  authenticate,
  openApiGetOne(assetModelSchema, {
    summary: 'Get an asset by ID',
    description: 'Retrieve details for a specific asset',
    tags: ['Assets'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
        },
        description: 'Asset ID',
      },
    ],
    responses: {
      200: {
        description: 'Asset found',
      },
      404: {
        description: 'Asset not found',
      },
    },
  }),
  assetController.getAssetById
);

// PATCH /api/assets/:id - Update an asset
router.patch(
  '/:id',
  authenticate,
  openApiPatch(assetUpdateSchema, {
    summary: 'Update an asset',
    description: 'Update metadata or properties of an existing asset',
    tags: ['Assets'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
        },
        description: 'Asset ID',
      },
    ],
    responses: {
      200: {
        description: 'Asset updated successfully',
      },
      404: {
        description: 'Asset not found',
      },
      403: {
        description: 'Permission denied',
      },
    },
  }),
  validateRequest(assetUpdateSchema),
  assetController.updateAsset
);

// DELETE /api/assets/:id - Delete an asset
router.delete(
  '/:id',
  authenticate,
  openApiDelete(assetModelSchema, {
    summary: 'Delete an asset',
    description: 'Delete an asset and its associated file storage',
    tags: ['Assets'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
        },
        description: 'Asset ID',
      },
    ],
    responses: {
      204: {
        description: 'Asset deleted successfully',
      },
      404: {
        description: 'Asset not found',
      },
      403: {
        description: 'Permission denied',
      },
    },
  }),
  assetController.deleteAsset
);

// GET /api/assets/:id/signed-url - Get a pre-signed URL for an asset
router.get(
  '/:id/signed-url',
  authenticate,
  openApiGetOne(
    assetModelSchema.pick({ url: true }),
    {
      summary: 'Get a pre-signed URL for an asset',
      description: 'Generate a temporary pre-signed URL for accessing an asset',
      tags: ['Assets'],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'Asset ID',
        },
        {
          name: 'expiry',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            default: 3600,
          },
          description: 'Expiry time in seconds (default: 3600)',
        },
      ],
      responses: {
        200: {
          description: 'Pre-signed URL generated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  url: {
                    type: 'string',
                    description: 'Pre-signed URL for accessing the asset',
                  },
                },
              },
            },
          },
        },
        404: {
          description: 'Asset not found',
        },
        403: {
          description: 'Permission denied',
        },
      },
    }
  ),
  assetController.getSignedUrl
);

export default router; 