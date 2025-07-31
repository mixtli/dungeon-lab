import { z } from 'zod';
import { vttDocumentSchema } from '../../schemas/vtt-document.schema.mjs';
import { createDocumentSchema, baseDocumentSchema } from '../../schemas/document.schema.mjs';
import { baseAPIResponseSchema } from './base.mjs';

// Types for GET /documents (Search documents)
export const getDocumentsResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(baseDocumentSchema)
});

export type GetDocumentsResponse = z.infer<typeof getDocumentsResponseSchema>;

// Types for GET /documents/:id (Get one document)
export const getDocumentResponseSchema = baseAPIResponseSchema.extend({
  data: baseDocumentSchema.optional()
});

export type GetDocumentResponse = z.infer<typeof getDocumentResponseSchema>;

// Types for POST /documents (Create document)
export const createDocumentRequestSchema = createDocumentSchema;

export type CreateDocumentRequest = z.infer<typeof createDocumentRequestSchema>;

export const createDocumentResponseSchema = baseAPIResponseSchema.extend({
  data: baseDocumentSchema.optional()
});

export type CreateDocumentResponse = z.infer<typeof createDocumentResponseSchema>;

// Types for PUT /documents/:id (Replace document)
export const putDocumentRequestSchema = createDocumentRequestSchema;
export type PutDocumentRequest = z.infer<typeof putDocumentRequestSchema>;

export const putDocumentResponseSchema = baseAPIResponseSchema.extend({
  data: baseDocumentSchema.optional()
});

export type PutDocumentResponse = z.infer<typeof putDocumentResponseSchema>;

// Types for PATCH /documents/:id (Update document partially)
export const patchDocumentRequestSchema = createDocumentRequestSchema.partial();
export type PatchDocumentRequest = z.infer<typeof patchDocumentRequestSchema>;

export const patchDocumentResponseSchema = putDocumentResponseSchema;
export type PatchDocumentResponse = z.infer<typeof patchDocumentResponseSchema>;

// Types for DELETE /documents/:id (Delete document)
export const deleteDocumentResponseSchema = z.object({
  success: z.boolean().default(true),
  error: z.string().optional()
});

export type DeleteDocumentResponse = z.infer<typeof deleteDocumentResponseSchema>;

// Types for search documents
export const searchDocumentsQuerySchema = z
  .object({
    name: z.string().optional(),
    pluginId: z.string().optional(),
    documentType: z.string().optional()
  })
  .passthrough(); // Allow additional query parameters

export type SearchDocumentsQuery = z.infer<typeof searchDocumentsQuerySchema>;

export const searchDocumentsResponseSchema = getDocumentsResponseSchema;
export type SearchDocumentsResponse = z.infer<typeof searchDocumentsResponseSchema>;
