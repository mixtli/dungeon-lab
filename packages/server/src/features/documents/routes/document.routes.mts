import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller.mjs';
import {
  openApiDelete,
  openApiGet,
  openApiGetOne,
  openApiPatch,
  openApiPost,
  openApiPut,
  toQuerySchema
} from '../../../oapi.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { createSchema } from 'zod-openapi';
import { z } from '../../../utils/zod.mjs';
import {
  createDocumentRequestSchema,
  putDocumentRequestSchema,
  patchDocumentRequestSchema,
  searchDocumentsQuerySchema,
  baseAPIResponseSchema,
  deleteAPIResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/vtt-document.schema.mjs';

// Initialize controller
const documentController = new DocumentController();

// Create router
const router = Router();

// Apply authentication middleware to all document routes
router.use(authenticate);

// Get a single document by ID
router.get(
  '/:id',
  openApiGetOne(z.null(), {
    description: 'Get a document by ID',
    responses: {
      200: {
        description: 'Document retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: vttDocumentSchema }).openapi({
                description: 'Document response'
              })
            )
          }
        }
      },
      404: { description: 'Document not found' },
      500: { description: 'Server error' }
    }
  }),
  documentController.getDocument
);

// Search documents
router.get(
  '/',
  openApiGet(searchDocumentsQuerySchema, {
    description: 'Search for documents based on query parameters',
    parameters: toQuerySchema(searchDocumentsQuerySchema),
    responses: {
      200: {
        description: 'Documents retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: z.array(vttDocumentSchema) }).openapi({
                description: 'Documents response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  documentController.searchDocuments
);

// Create a new document
router.post(
  '/',
  openApiPost(createDocumentRequestSchema, {
    description: 'Create a new document',
    responses: {
      201: {
        description: 'Document created successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: vttDocumentSchema }).openapi({
                description: 'Create document response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid document data' },
      500: { description: 'Server error' }
    }
  }),
  validateRequest(createDocumentRequestSchema),
  documentController.createDocument
);

// Delete a document
router.delete(
  '/:id',
  openApiDelete(z.null(), {
    description: 'Delete a document',
    responses: {
      200: { description: 'Document deleted successfully' },
      404: { description: 'Document not found' },
      500: {
        description: 'Server error',
        content: {
          'application/json': {
            schema: createSchema(
              deleteAPIResponseSchema.openapi({
                description: 'Delete document response'
              })
            )
          }
        }
      }
    }
  }),
  documentController.deleteDocument
);

// Patch a document
router.patch(
  '/:id',
  openApiPatch(patchDocumentRequestSchema, {
    description: 'Update a document by ID (partial)',
    responses: {
      200: {
        description: 'Document patched successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: vttDocumentSchema }).openapi({
                description: 'Patch document response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid document data' },
      404: { description: 'Document not found' },
      500: { description: 'Server error' }
    }
  }),
  validateRequest(patchDocumentRequestSchema),
  documentController.patchDocument
);

// Put a document
router.put(
  '/:id',
  openApiPut(putDocumentRequestSchema, {
    description: 'Replace a document by ID (full update)',
    responses: {
      200: {
        description: 'Document updated successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: vttDocumentSchema }).openapi({
                description: 'Update document response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid document data' },
      404: { description: 'Document not found' },
      500: { description: 'Server error' }
    }
  }),
  validateRequest(putDocumentRequestSchema),
  documentController.putDocument
);

export { router as documentRoutes };
