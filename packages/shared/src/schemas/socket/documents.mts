import { z } from 'zod';
import { baseDocumentSchema } from '../document.schema.mjs';
import { baseAPIResponseSchema } from '../../types/api/base.mjs';

// ============================================================================
// DOCUMENT SOCKET EVENT SCHEMAS
// ============================================================================

// Request schemas for client-to-server events
export const documentGetRequestSchema = z.object({
  id: z.string().min(1),
  documentType: z.string().optional()
});

export const documentSearchRequestSchema = z.object({
  documentType: z.string().optional(),
  pluginId: z.string().optional(),
  pluginDocumentType: z.string().optional(),
  ownerId: z.string().optional(),
  name: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().min(0).optional()
});

export const documentCreateRequestSchema = z.object({
  name: z.string().min(1),
  documentType: z.enum(['item', 'character', 'actor', 'vtt-document']),
  pluginId: z.string().min(1),
  pluginDocumentType: z.string().min(1),
  pluginData: z.record(z.unknown()).default({}),
  userData: z.record(z.unknown()).default({})
});

export const documentUpdateRequestSchema = z.object({
  id: z.string().min(1),
  data: z.object({
    name: z.string().min(1).optional(),
    pluginData: z.record(z.unknown()).optional(),
    userData: z.record(z.unknown()).optional(),
    state: z.record(z.unknown()).optional(),
    itemState: z.record(z.unknown()).optional()
  })
});

export const documentDeleteRequestSchema = z.object({
  id: z.string().min(1)
});

// Response schemas for server-to-client events
export const documentGetResponseSchema = baseAPIResponseSchema.extend({
  data: baseDocumentSchema.optional()
});

export const documentSearchResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(baseDocumentSchema)
});

export const documentCreateResponseSchema = baseAPIResponseSchema.extend({
  data: baseDocumentSchema.optional()
});

export const documentUpdateResponseSchema = baseAPIResponseSchema.extend({
  data: baseDocumentSchema.optional()
});

export const documentDeleteResponseSchema = baseAPIResponseSchema.extend({
  data: z.null().optional()
});

// Real-time notification schemas
export const documentChangedNotificationSchema = z.object({
  action: z.enum(['created', 'updated', 'deleted']),
  document: baseDocumentSchema.optional(), // undefined for deleted documents
  documentId: z.string(),
  userId: z.string() // Who made the change
});

// Args schemas for socket function calls
export const documentGetArgsSchema = z.tuple([
  documentGetRequestSchema,
  z.function().args(documentGetResponseSchema).returns(z.void()) // callback
]);

export const documentSearchArgsSchema = z.tuple([
  documentSearchRequestSchema,
  z.function().args(documentSearchResponseSchema).returns(z.void()) // callback
]);

export const documentCreateArgsSchema = z.tuple([
  documentCreateRequestSchema,
  z.function().args(documentCreateResponseSchema).returns(z.void()) // callback
]);

export const documentUpdateArgsSchema = z.tuple([
  documentUpdateRequestSchema,
  z.function().args(documentUpdateResponseSchema).returns(z.void()) // callback
]);

export const documentDeleteArgsSchema = z.tuple([
  documentDeleteRequestSchema,
  z.function().args(documentDeleteResponseSchema).returns(z.void()) // callback
]);

// Notification args schema (server-to-client only)
export const documentChangedArgsSchema = z.tuple([
  documentChangedNotificationSchema
]);