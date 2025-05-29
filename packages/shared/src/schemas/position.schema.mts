import { z } from 'zod';

// ============================================================================
// POSITION AND MOVEMENT SCHEMAS
// ============================================================================

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number().optional()
});

export const gridPositionSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  elevation: z.number().default(0)
});

export const movementConstraintsSchema = z.object({
  maxDistance: z.number().positive().optional(),
  blockedPositions: z.array(positionSchema).optional(),
  allowDiagonal: z.boolean().default(true),
  requiresLineOfSight: z.boolean().default(false)
}); 