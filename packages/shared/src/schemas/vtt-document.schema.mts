import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
// Base VTT Document schema
export const vttDocumentSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must be lowercase with no spaces, only hyphens and numbers allowed'
    ),
  pluginId: z.string().min(1),
  documentType: z.string().min(1),
  description: z.string().min(1).max(5000),
  data: z.any() // This will be validated against plugin-specific schema
});

// Create schema (omits auto-generated fields)
export const vttDocumentCreateSchema = vttDocumentSchema
  .omit({
    id: true,
    createdBy: true,
    updatedBy: true
  })
  .extend({
    data: z.any() // Will be validated by plugin schema
  });

// Update schema (makes all fields optional except updatedBy)
export const vttDocumentUpdateSchema = vttDocumentSchema
  .omit({
    id: true,
    createdBy: true
  })
  .partial()
  .extend({
    updatedBy: z.string()
  });
