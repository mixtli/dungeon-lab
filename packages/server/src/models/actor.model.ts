import mongoose from 'mongoose';
import { IActor, actorSchema } from '@dungeon-lab/shared';
import { BaseDocument, createBaseSchema } from './utils/base-schema.js';

/**
 * Actor document interface extending the base Actor interface
 */
export interface ActorDocument extends Omit<IActor, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createBaseSchema(actorSchema);

/**
 * Actor model
 */
export const ActorModel = mongoose.model<ActorDocument>('Actor', mongooseSchema); 