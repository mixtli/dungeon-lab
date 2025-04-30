import { z } from 'zod';
import { actorCreateSchema } from '../../schemas/actor.schema.mjs';
import type { IActor } from '../../types/index.mjs';
export type { IActor };

// Types for POST /actors (Create actor)
export const createActorRequestSchema = actorCreateSchema;
export type CreateActorRequest = z.infer<typeof createActorRequestSchema>;

// Types for PUT /actors/:id (Replace actor)
export const putActorRequestSchema = createActorRequestSchema;
export type PutActorRequest = z.infer<typeof putActorRequestSchema>;

// Types for PATCH /actors/:id (Update actor partially)
export const patchActorRequestSchema = createActorRequestSchema.partial();
export type PatchActorRequest = z.infer<typeof patchActorRequestSchema>;

// Types for GET /actors/search (Search actors)
export const searchActorsQuerySchema = z
  .object({
    name: z.string().optional(),
    type: z.string().optional(),
    gameSystemId: z.string().optional()
  })
  .passthrough(); // Allow additional query parameters

export type SearchActorsQuery = z.infer<typeof searchActorsQuerySchema>;
