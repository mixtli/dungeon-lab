import { z } from 'zod';
import { 
  tokenSchema,
  createTokenSchema,
  updateTokenSchema,
  tokenConditionSchema,
  gridBoundsSchema
} from '../schemas/tokens.schema.mjs';

// ============================================================================
// TOKEN TYPES
// ============================================================================

export type Token = z.infer<typeof tokenSchema>;
export type CreateTokenData = z.infer<typeof createTokenSchema>;
export type UpdateTokenData = z.infer<typeof updateTokenSchema>;
export type TokenCondition = z.infer<typeof tokenConditionSchema>;
export type GridBounds = z.infer<typeof gridBoundsSchema>; 