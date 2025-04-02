import { z } from '../lib/zod.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { ApiFields } from '../types/api-fields.mjs';

// Base VTT Document schema
export const vttDocumentSchema = z.object({
  name: z.string().min(1).max(255),
  pluginId: z.string().min(1),
  documentType: z.string().min(1),
  description: z.string().min(1).max(1024),
  data: z.any(), // This will be validated against plugin-specific schema
  createdBy: zId('User'),
  updatedBy: zId('User'),
});

// Create schema (omits auto-generated fields)
export const vttDocumentCreateSchema = vttDocumentSchema.omit({
  createdBy: true,
  updatedBy: true,
}).extend({
  data: z.any(), // Will be validated by plugin schema
});

// Update schema (makes all fields optional except updatedBy)
export const vttDocumentUpdateSchema = vttDocumentSchema
  .omit({
    createdBy: true,
  })
  .partial()
  .extend({
    updatedBy: zId('User'),
  });

// Export types
export type IVTTDocument = z.infer<typeof vttDocumentSchema> & ApiFields;
export type IVTTDocumentCreateData = z.infer<typeof vttDocumentCreateSchema>;
export type IVTTDocumentUpdateData = z.infer<typeof vttDocumentUpdateSchema>;
