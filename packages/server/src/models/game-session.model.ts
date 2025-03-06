import mongoose from 'mongoose';
import { IGameSession, gameSessionSchema } from '@dungeon-lab/shared';
import { BaseDocument, createBaseSchema } from './utils/base-schema.js';

/**
 * GameSession document interface extending the base GameSession interface
 */
export interface GameSessionDocument extends Omit<IGameSession, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createBaseSchema(gameSessionSchema);

// Add indexes for common queries
mongooseSchema.index({ campaign: 1, isActive: 1 });

/**
 * GameSession model
 */
export const GameSessionModel = mongoose.model<GameSessionDocument>('GameSession', mongooseSchema); 