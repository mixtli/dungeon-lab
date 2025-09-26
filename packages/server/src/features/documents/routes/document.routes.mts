import { Router } from 'express';
import express from 'express';
import { DocumentController } from '../controllers/document.controller.mjs';
import { DocumentReferenceResolutionController } from '../controllers/document-reference-resolution.controller.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';

// Initialize controllers
const documentController = new DocumentController();
const documentReferenceResolutionController = new DocumentReferenceResolutionController();

// Create router
const router = Router();

// Apply authentication middleware to all document routes
router.use(authenticate);


// Get a single document by ID
router.get('/:id', documentController.getDocument);

// Search documents
router.get('/', documentController.searchDocuments);

// Create a new document
router.post('/', documentController.createDocument);

// Delete a document
router.delete('/:id', documentController.deleteDocument);

// Patch a document
router.patch('/:id', documentController.patchDocument);

// Put a document
router.put('/:id', documentController.putDocument);

// Token and avatar management routes
router.put(
  '/:id/token',
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '10mb'
  }),
  documentController.uploadDocumentToken
);

router.post('/:id/generate-token', documentController.generateDocumentToken);
router.post('/:id/generate-avatar', documentController.generateDocumentAvatar);

// Resolve document references
router.post('/resolve-references', documentReferenceResolutionController.resolveDocumentReferences);

export { router as documentRoutes };
