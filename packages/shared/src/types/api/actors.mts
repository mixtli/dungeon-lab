import { z } from 'zod';
import { actorSchema, actorCreateSchema } from '../../schemas/actor.schema.mjs';

// Types for GET /actors (Get all actors)
export const getActorsResponseSchema = z.object({
  success: z.boolean().default(true),
  data: z.array(actorSchema),
  error: z.string().optional()
});

export type GetActorsResponse = z.infer<typeof getActorsResponseSchema>;

// Types for GET /actors/:id (Get one actor)
export const getActorResponseSchema = z.object({
  success: z.boolean().default(true),
  data: actorSchema.optional(),
  error: z.string().optional()
});

export type GetActorResponse = z.infer<typeof getActorResponseSchema>;

// Types for POST /actors (Create actor)
export const createActorRequestSchema = actorCreateSchema;
export type CreateActorRequest = z.infer<typeof createActorRequestSchema>;

export const createActorResponseSchema = z.object({
  success: z.boolean().default(true),
  data: actorSchema.optional(),
  error: z.string().optional()
});

export type CreateActorResponse = z.infer<typeof createActorResponseSchema>;

// Types for PUT /actors/:id (Replace actor)
export const putActorRequestSchema = createActorRequestSchema;
export type PutActorRequest = z.infer<typeof putActorRequestSchema>;

export const putActorResponseSchema = z.object({
  success: z.boolean().default(true),
  data: actorSchema.optional(),
  error: z.string().optional()
});

export type PutActorResponse = z.infer<typeof putActorResponseSchema>;

// Types for PATCH /actors/:id (Update actor partially)
export const patchActorRequestSchema = createActorRequestSchema.partial();
export type PatchActorRequest = z.infer<typeof patchActorRequestSchema>;

export const patchActorResponseSchema = putActorResponseSchema;
export type PatchActorResponse = z.infer<typeof patchActorResponseSchema>;

// Types for DELETE /actors/:id (Delete actor)
export const deleteActorResponseSchema = z.object({
  success: z.boolean().default(true),
  error: z.string().optional()
});

export type DeleteActorResponse = z.infer<typeof deleteActorResponseSchema>;

// Types for PUT /actors/:id/avatar (Upload actor avatar)
export const uploadActorAvatarResponseSchema = z.object({
  success: z.boolean().default(true),
  data: actorSchema.optional(),
  error: z.string().optional()
});

export type UploadActorAvatarResponse = z.infer<typeof uploadActorAvatarResponseSchema>;

// Types for PUT /actors/:id/token (Upload actor token)
export const uploadActorTokenResponseSchema = z.object({
  success: z.boolean().default(true),
  data: actorSchema.optional(),
  error: z.string().optional()
});

export type UploadActorTokenResponse = z.infer<typeof uploadActorTokenResponseSchema>;

// Types for POST /actors/:id/generate-avatar (Generate actor avatar)
export const generateActorAvatarResponseSchema = z.object({
  success: z.boolean().default(true),
  data: actorSchema.optional(),
  error: z.string().optional()
});

export type GenerateActorAvatarResponse = z.infer<typeof generateActorAvatarResponseSchema>;

// Types for POST /actors/:id/generate-token (Generate actor token)
export const generateActorTokenResponseSchema = z.object({
  success: z.boolean().default(true),
  error: z.string().optional()
});

export type GenerateActorTokenResponse = z.infer<typeof generateActorTokenResponseSchema>;

// Types for GET /actors/campaign/:campaignId (Get actors by campaign)
export const getActorsByCampaignResponseSchema = getActorsResponseSchema;
export type GetActorsByCampaignResponse = z.infer<typeof getActorsByCampaignResponseSchema>;

// Types for GET /actors/search (Search actors)
export const searchActorsQuerySchema = z
  .object({
    name: z.string().optional(),
    type: z.string().optional(),
    gameSystemId: z.string().optional()
  })
  .passthrough(); // Allow additional query parameters

export type SearchActorsQuery = z.infer<typeof searchActorsQuerySchema>;

export const searchActorsResponseSchema = getActorsResponseSchema;
export type SearchActorsResponse = z.infer<typeof searchActorsResponseSchema>;
