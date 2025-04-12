import mongoose from 'mongoose';
import { IGameSession, gameSessionSchema } from '@dungeon-lab/shared/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base-schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';

/**
 * GameSession document interface extending the base GameSession interface
 */
//export interface GameSessionDocument extends Omit<IGameSession, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IGameSession>(gameSessionSchema.merge(baseMongooseZodSchema));

// Add indexes for common queries
mongooseSchema.index({ campaign: 1, isActive: 1 });

/**
 * GameSession model
 */
export const GameSessionModel = mongoose.model<IGameSession>('GameSession', mongooseSchema); 