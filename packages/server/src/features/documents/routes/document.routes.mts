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
import {
  createDocumentRequestSchema,
  putDocumentRequestSchema,
  patchDocumentRequestSchema,
  searchDocumentsQuerySchema,
  getDocumentsResponseSchema,
  getDocumentResponseSchema,
  createDocumentResponseSchema,
  putDocumentResponseSchema,
  patchDocumentResponseSchema,
  deleteDocumentResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';

const router = Router();
const documentController = new DocumentController();

// Bind controller methods to maintain 'this' context
const boundController = {
  getDocument: documentController.getDocument.bind(documentController),
  putDocument: documentController.putDocument.bind(documentController),
  patchDocument: documentController.patchDocument.bind(documentController),
  deleteDocument: documentController.deleteDocument.bind(documentController),
  createDocument: documentController.createDocument.bind(documentController),
  searchDocuments: documentController.searchDocuments.bind(documentController)
};

router.use(authenticate);

// Get a single document by ID
router.get(
  '/:id',
  openApiGetOne(searchDocumentsQuerySchema, {
    description: 'Get a document by ID',
    responses: {
      200: {
        description: 'Document retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              getDocumentResponseSchema.openapi({
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
  boundController.getDocument
);

console.log('DOCUMENT QUERY PARAMS', toQuerySchema(searchDocumentsQuerySchema));
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
              getDocumentsResponseSchema.openapi({
                description: 'Documents response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  boundController.searchDocuments
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
              createDocumentResponseSchema.openapi({
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
  boundController.createDocument
);

// Delete a document
router.delete(
  '/:id',
  openApiDelete(searchDocumentsQuerySchema, {
    description: 'Delete a document',
    responses: {
      204: { description: 'Document deleted successfully' },
      404: { description: 'Document not found' },
      500: {
        description: 'Server error',
        content: {
          'application/json': {
            schema: createSchema(
              deleteDocumentResponseSchema.openapi({
                description: 'Delete document response'
              })
            )
          }
        }
      }
    }
  }),
  boundController.deleteDocument
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
              patchDocumentResponseSchema.openapi({
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
  boundController.patchDocument
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
              putDocumentResponseSchema.openapi({
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
  boundController.putDocument
);

export default router;
