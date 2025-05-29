import { z } from 'zod';
import {
  TokenSizeEnum,
  tokenConditionSchema,
  tokenStatsSchema,
  tokenSchema,
  createTokenSchema,
  updateTokenSchema
} from '../schemas/tokens.schema.mjs';

// ============================================================================
// TOKEN TYPES
// ============================================================================

export type TokenSize = z.infer<typeof TokenSizeEnum>;
export type TokenCondition = z.infer<typeof tokenConditionSchema>;
export type TokenStats = z.infer<typeof tokenStatsSchema>;
export type IToken = z.infer<typeof tokenSchema>;
export type CreateTokenData = z.infer<typeof createTokenSchema>;
export type UpdateTokenData = z.infer<typeof updateTokenSchema>; 