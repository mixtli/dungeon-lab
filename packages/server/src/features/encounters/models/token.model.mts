import mongoose from 'mongoose';
import { IToken, tokenSchema } from '@dungeon-lab/shared/index.mjs';
import { BaseDocument, createBaseSchema } from '../../../models/utils/base-schema.mjs';

/**
 * Token document interface extending the base Token interface
 */
export interface TokenDocument extends Omit<IToken, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createBaseSchema(tokenSchema);

// Add indexes for common queries
mongooseSchema.index({ encounterId: 1 });
mongooseSchema.index({ actorId: 1 });
mongooseSchema.index({ itemId: 1 });

/**
 * Token model
 */
export const TokenModel = mongoose.model<TokenDocument>('Token', mongooseSchema); 