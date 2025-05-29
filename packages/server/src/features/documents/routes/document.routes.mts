import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller.mjs';
import { createPathSchema, oapi } from '../../../oapi.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { z } from '../../../utils/zod.mjs';
import {
  createDocumentRequestSchema,
  putDocumentRequestSchema,
  patchDocumentRequestSchema,
  searchDocumentsQuerySchema,
  baseAPIResponseSchema,
  deleteAPIResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';

// Initialize controller
const documentController = new DocumentController();

// Create router
const router = Router();

// Apply authentication middleware to all document routes
router.use(authenticate);

// Create response schemas using baseAPIResponseSchema
const getDocumentsResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(vttDocumentSchema)
});

const getDocumentResponseSchema = baseAPIResponseSchema.extend({
  data: vttDocumentSchema
});

// Get a single document by ID
router.get(
  '/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Get a document by ID',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Document retrieved successfully',
          content: {
            'application/json': {
              schema: getDocumentResponseSchema.openapi({
                description: 'Document response'
              })
            }
          }
        }
      }
    })
  ),
  documentController.getDocument
);

// Search documents
router.get(
  '/',
  oapi.validPath(
    createPathSchema({
      description: 'Search for documents based on query parameters',
      requestParams: {
        query: searchDocumentsQuerySchema
      },
      responses: {
        200: {
          description: 'Documents retrieved successfully',
          content: {
            'application/json': {
              schema: getDocumentsResponseSchema.openapi({
                description: 'Documents response'
              })
            }
          }
        }
      }
    })
  ),
  documentController.searchDocuments
);

// Create a new document
router.post(
  '/',
  oapi.validPath(
    createPathSchema({
      description: 'Create a new document',
      requestBody: {
        content: {
          'application/json': {
            schema: createDocumentRequestSchema.openapi({
              description: 'Create document request'
            })
          }
        }
      },
      responses: {
        201: {
          description: 'Document created successfully',
          content: {
            'application/json': {
              schema: getDocumentResponseSchema.openapi({
                description: 'Create document response'
              })
            }
          }
        }
      }
    })
  ),
  validateRequest(createDocumentRequestSchema),
  documentController.createDocument
);

// Delete a document
router.delete(
  '/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Delete a document',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Document deleted successfully',
          content: {
            'application/json': {
              schema: deleteAPIResponseSchema.openapi({
                description: 'Delete document response'
              })
            }
          }
        }
      }
    })
  ),
  documentController.deleteDocument
);

// Patch a document
router.patch(
  '/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Update a document by ID (partial)',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: patchDocumentRequestSchema.openapi({
              description: 'Patch document request'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Document patched successfully',
          content: {
            'application/json': {
              schema: getDocumentResponseSchema.openapi({
                description: 'Patch document response'
              })
            }
          }
        }
      }
    })
  ),
  validateRequest(patchDocumentRequestSchema),
  documentController.patchDocument
);

// Put a document
router.put(
  '/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Replace a document by ID (full update)',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: putDocumentRequestSchema.openapi({
              description: 'Update document request'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Document updated successfully',
          content: {
            'application/json': {
              schema: getDocumentResponseSchema.openapi({
                description: 'Update document response'
              })
            }
          }
        }
      }
    })
  ),
  validateRequest(putDocumentRequestSchema),
  documentController.putDocument
);

export { router as documentRoutes };
