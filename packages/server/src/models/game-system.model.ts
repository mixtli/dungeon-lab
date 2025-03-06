import mongoose from 'mongoose';
import { IGameSystem, gameSystemSchema } from '@dungeon-lab/shared';
import { BaseDocument, createBaseSchema } from './utils/base-schema.js';

/**
 * GameSystem document interface extending the base GameSystem interface
 */
export interface GameSystemDocument extends Omit<IGameSystem, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createBaseSchema(gameSystemSchema);

/**
 * GameSystem model
 */
export const GameSystemModel = mongoose.model<GameSystemDocument>('GameSystem', mongooseSchema); 