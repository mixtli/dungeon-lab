import { z } from 'zod';

// ============================================================================
// MOVEMENT SCHEMAS
// ============================================================================

export const moveMessageSchema = z.object({
  gameSessionId: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number().optional()
  }),
  actorId: z.string()
}); 