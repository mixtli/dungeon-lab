import { z } from 'zod';

export const compendiumManifestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  version: z.string(),
  pluginId: z.string(),
  authors: z.array(z.string()).optional(),
  license: z.string().optional(),
  contentTypes: z.array(z.string()),
  assetDirectory: z.string().default('assets'),
  contentDirectory: z.string().default('content')
});

export const importZipSchema = z.object({
  zipFile: z.instanceof(File),
  overwriteExisting: z.boolean().default(false),
  validateOnly: z.boolean().default(false)
});

export const validateZipSchema = z.object({
  zipFile: z.instanceof(File)
});

export const importProgressSchema = z.object({
  stage: z.enum(['validating', 'processing', 'uploading', 'resolving-references', 'complete', 'error']),
  processedItems: z.number(),
  totalItems: z.number(),
  currentItem: z.string().optional(),
  errors: z.array(z.string())
});

export const importJobSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: importProgressSchema,
  compendiumId: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const validationResultSchema = z.object({
  success: z.boolean(),
  errors: z.array(z.object({
    path: z.string(),
    message: z.string(),
    code: z.string()
  })),
  warnings: z.array(z.object({
    path: z.string(),
    message: z.string()
  }))
});

export const assetMappingSchema = z.object({
  originalPath: z.string(),
  storageKey: z.string(),
  publicUrl: z.string(),
  assetId: z.string()
});

export type CompendiumManifest = z.infer<typeof compendiumManifestSchema>;
export type ImportZipRequest = z.infer<typeof importZipSchema>;
export type ValidateZipRequest = z.infer<typeof validateZipSchema>;
export type ImportProgress = z.infer<typeof importProgressSchema>;
export type ImportJob = z.infer<typeof importJobSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type AssetMapping = z.infer<typeof assetMappingSchema>;