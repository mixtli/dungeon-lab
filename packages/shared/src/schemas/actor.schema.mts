import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { assetSchema } from './asset.schema.mjs';
// import { deepPartial } from '../utils/deepPartial.mjs';

// Base Actor schema
export const actorSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(255),
  userData: z.record(z.any()).optional(),

  // Direct asset references using string IDs (will be ObjectId in server models via zId)
  avatarId: z.string().optional(),
  tokenId: z.string().optional(),

  description: z.string().optional(),
  gameSystemId: z.string().min(1),
  data: z.record(z.string(), z.any()).optional()
  // token: assetSchema.optional()
  //avatar: assetSchema.optional(),
});

export const actorCreateSchema = actorSchema
  .extend({
    // avatar: z.any().optional(),
    // token: z.any().optional(),
    avatar: z.instanceof(File).optional(),
    token: z.instanceof(File).optional()
  })
  .omit({
    avatarId: true,
    tokenId: true,
    id: true
  });

export const actorSchemaWithVirtuals = actorSchema.extend({
  token: assetSchema.optional(),
  avatar: assetSchema.optional()
});

export const actorPatchSchema = actorSchema.deepPartial();
