import { z } from 'zod';
import { 
  tokenSchema,
  createTokenSchema,
  updateTokenSchema,
  tokenConditionSchema
} from '../schemas/tokens.schema.mjs';

// ============================================================================
// TOKEN TYPES
// ============================================================================

export type Token = z.infer<typeof tokenSchema>;
export type CreateTokenData = z.infer<typeof createTokenSchema>;
export type UpdateTokenData = z.infer<typeof updateTokenSchema>;
export type TokenCondition = z.infer<typeof tokenConditionSchema>;

export type TokenSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'; 