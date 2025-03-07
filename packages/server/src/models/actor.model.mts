import mongoose from 'mongoose';
import { IActor, actorSchema } from '@dungeon-lab/shared/index.mjs';
import { BaseDocument, createBaseSchema } from './utils/base-schema.mjs';

/**
 * Actor document interface extending the base Actor interface
 */
export interface ActorDocument extends Omit<IActor, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createBaseSchema(actorSchema);

// Override the data field to use Mixed type
mongooseSchema.path('data', mongoose.Schema.Types.Mixed);

/**
 * Actor model
 */
export const ActorModel = mongoose.model<ActorDocument>('Actor', mongooseSchema); 