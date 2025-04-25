import { z } from 'zod';
import { baseAPIResponseSchema } from './base.mjs';
import { actorSchema, actorCreateSchema } from '../../schemas/actor.schema.mjs';

// Get all actors response
export const getActorsResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(actorSchema)
});

export type GetActorsResponse = z.infer<typeof getActorsResponseSchema>;

// Get actor by ID response
export const getActorResponseSchema = baseAPIResponseSchema.extend({
  data: actorSchema.optional()
});

export type GetActorResponse = z.infer<typeof getActorResponseSchema>;

// Get actors by campaign ID response
export const getActorsByCampaignResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(actorSchema)
});

export type GetActorsByCampaignResponse = z.infer<typeof getActorsByCampaignResponseSchema>;

// Create actor request
export const createActorRequestSchema = actorCreateSchema;

export type CreateActorRequest = z.infer<typeof createActorRequestSchema>;

// Create actor response
export const createActorResponseSchema = baseAPIResponseSchema.extend({
  data: actorSchema.optional()
});

export type CreateActorResponse = z.infer<typeof createActorResponseSchema>;

// Put actor request
export const putActorRequestSchema = actorCreateSchema;

export type PutActorRequest = z.infer<typeof putActorRequestSchema>;

// Put actor response
export const putActorResponseSchema = baseAPIResponseSchema.extend({
  data: actorSchema.optional()
});

export type PutActorResponse = z.infer<typeof putActorResponseSchema>;

// Patch actor request
export const patchActorRequestSchema = actorCreateSchema.partial();

export type PatchActorRequest = z.infer<typeof patchActorRequestSchema>;

// Patch actor response
export const patchActorResponseSchema = baseAPIResponseSchema.extend({
  data: actorSchema.optional()
});

export type PatchActorResponse = z.infer<typeof patchActorResponseSchema>;

// Delete actor response
export const deleteActorResponseSchema = baseAPIResponseSchema.extend({
  data: z.string().optional()
});

export type DeleteActorResponse = z.infer<typeof deleteActorResponseSchema>;

// Upload actor avatar response
export const uploadActorAvatarResponseSchema = baseAPIResponseSchema.extend({
  data: actorSchema.optional()
});

export type UploadActorAvatarResponse = z.infer<typeof uploadActorAvatarResponseSchema>;

// Upload actor token response
export const uploadActorTokenResponseSchema = baseAPIResponseSchema.extend({
  data: actorSchema.optional()
});

export type UploadActorTokenResponse = z.infer<typeof uploadActorTokenResponseSchema>;

// Generate actor avatar response
export const generateActorAvatarResponseSchema = baseAPIResponseSchema.extend({
  data: actorSchema.optional()
});

export type GenerateActorAvatarResponse = z.infer<typeof generateActorAvatarResponseSchema>;

// Generate actor token response
export const generateActorTokenResponseSchema = baseAPIResponseSchema.extend({
  data: actorSchema.optional()
});

export type GenerateActorTokenResponse = z.infer<typeof generateActorTokenResponseSchema>;

// Search actors query params
export const searchActorsQuerySchema = z.object({
  type: z.string().optional(),
  name: z.string().optional(),
  gameSystemId: z.string().optional(),
  'data.race': z.string().optional(),
  'data.class': z.string().optional()
});

export type SearchActorsQuery = z.infer<typeof searchActorsQuerySchema>;

// Search actors response
export const searchActorsResponseSchema = baseAPIResponseSchema.extend({
  data: z.object({ actors: z.array(actorSchema) }).optional()
});

export type SearchActorsResponse = z.infer<typeof searchActorsResponseSchema>;
