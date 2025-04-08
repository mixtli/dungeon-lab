import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller.mjs';
import { openApiGet, openApiGetOne } from '../../../oapi.mjs';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/vtt-document.schema.mjs';

const router = Router();
const documentController = new DocumentController();

// Get a single document by ID
router.get('/:id', openApiGetOne(vttDocumentSchema, {
  description: 'Get a document by ID'
}), documentController.getDocument);

// Search documents
router.get('/', openApiGet(vttDocumentSchema, {
  description: 'Search for documents based on query parameters'
}), documentController.searchDocuments);

export default router; 