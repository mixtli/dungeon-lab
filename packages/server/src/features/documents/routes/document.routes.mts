import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller.mjs';
import {
  openApiDelete,
  openApiGet,
  openApiGetOne,
  openApiPatch,
  openApiPost,
  openApiPut
} from '../../../oapi.mjs';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/vtt-document.schema.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { z } from 'zod';
const router = Router();
const documentController = new DocumentController();
import { deepPartial } from '@dungeon-lab/shared/utils/deepPartial.mjs';

// Get a single document by ID
router.get(
  '/:id',
  openApiGetOne(vttDocumentSchema, {
    description: 'Get a document by ID'
  }),
  documentController.getDocument
);

// Search documents
router.get(
  '/',
  openApiGet(vttDocumentSchema, {
    description: 'Search for documents based on query parameters'
  }),
  documentController.searchDocuments
);

router.post(
  '/',
  openApiPost(vttDocumentSchema, {
    description: 'Create a new document'
  }),
  validateRequest(vttDocumentSchema),
  documentController.createDocument
);

router.delete('/:id', openApiDelete(z.string()), documentController.deleteDocument);

router.patch(
  '/:id',
  openApiPatch(deepPartial(vttDocumentSchema), {
    description: 'Update a document by ID'
  }),
  validateRequest(deepPartial(vttDocumentSchema)),
  documentController.patchDocument
);

router.put(
  '/:id',
  openApiPut(vttDocumentSchema, {
    description: 'Replace a document by ID'
  }),
  validateRequest(vttDocumentSchema),
  documentController.putDocument
);

export default router;
