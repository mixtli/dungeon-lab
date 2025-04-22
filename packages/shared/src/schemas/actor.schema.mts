import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { assetSchema } from './asset.schema.mjs';

// Base Actor schema
export const actorSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(255),
  
  // Direct asset references using string IDs (will be ObjectId in server models via zId)
  avatarId: z.string().optional(),
  tokenId: z.string().optional(),
  
  description: z.string().optional(),
  gameSystemId: z.string().min(1),
  data: z.record(z.any()).optional(),
  // token: assetSchema.optional()
  //avatar: assetSchema.optional(),
});


export const actorCreateSchema = actorSchema.extend({
  // avatar: z.any().optional(),
  // token: z.any().optional(),
  avatar: z.instanceof(File).optional(),
  token: z.instanceof(File).optional(),
});

export const actorSchemaWithVirtuals = actorSchema.extend({
  token: assetSchema.optional(),
  avatar: assetSchema.optional()
});

// Schema for actor data used in creation
export type IActor = z.infer<typeof actorSchemaWithVirtuals>;
