import express from 'express';
import * as storageController from '../controllers/storage.controller.mjs';
import { authenticate } from '../middleware/auth.middleware.mjs';
import { openApiGet, openApiPost, openApiDelete } from '../oapi.mjs';
import { z } from '../utils/zod.mjs';

const router = express.Router();

// Define schemas for storage routes
const fileUrlResponseSchema = z.object({
  url: z.string().url(),
  key: z.string()
});

const fileListResponseSchema = z.array(z.object({
  key: z.string(),
  size: z.number(),
  lastModified: z.date()
}));

// Public routes (no authentication required)
router.get('/files/:key', openApiGet(fileUrlResponseSchema, {
  description: 'Get a pre-signed URL for a file',
  parameters: [
    { name: 'key', in: 'path', required: true, schema: { type: 'string' } }
  ]
}), storageController.getFileUrl);

// Protected routes (authentication required)
router.post('/files', authenticate, openApiPost(z.object({
  file: z.instanceof(File),
  path: z.string().optional()
}), {
  description: 'Upload a file to storage',
  responses: {
    201: {
      description: 'File uploaded successfully',
      content: {
        'application/json': {
          schema: fileUrlResponseSchema
        }
      }
    }
  }
}), storageController.uploadFile);

router.delete('/files/:key', authenticate, openApiDelete(z.object({}), {
  description: 'Delete a file from storage',
  parameters: [
    { name: 'key', in: 'path', required: true, schema: { type: 'string' } }
  ]
}), storageController.deleteFile);

router.get('/files', authenticate, openApiGet(fileListResponseSchema, {
  description: 'List files in storage',
  parameters: [
    { name: 'prefix', in: 'query', schema: { type: 'string' } }
  ]
}), storageController.listFiles);

export const storageRoutes = router; 