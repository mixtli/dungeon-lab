import mongoose from 'mongoose';
import { IToken } from '@dungeon-lab/shared/types/index.mjs';
import { tokenSchema } from '@dungeon-lab/shared/schemas/tokens.schema.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';

/**
 * Token document interface extending the base Token interface
 */
//export interface TokenDocument extends Omit<IToken, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IToken>(tokenSchema.merge(baseMongooseZodSchema));

// Add indexes for common queries
mongooseSchema.index({ encounterId: 1 });
mongooseSchema.index({ actorId: 1 });
mongooseSchema.index({ itemId: 1 });

/**
 * Token model
 */
export const TokenModel = mongoose.model<IToken>('Token', mongooseSchema);
