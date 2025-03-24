import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller.mjs';

const router = Router();
const documentController = new DocumentController();

// Get a single document by ID
router.get('/:id', documentController.getDocument);

// Search documents
router.get('/', documentController.searchDocuments);

export default router; 