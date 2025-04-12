import mongoose from 'mongoose';
import { IActor, actorSchema } from '@dungeon-lab/shared/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base-schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';

const actorSchemaMongoose = actorSchema.merge(baseMongooseZodSchema)

/**
 * Actor document interface extending the base Actor interface
 */
// export interface ActorDocument extends Omit<IActor, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IActor>(actorSchemaMongoose);

// Override the data field to use Mixed type
mongooseSchema.path('data', mongoose.Schema.Types.Mixed);

/**
 * Actor model
 */
export const ActorModel = mongoose.model<IActor>('Actor', mongooseSchema); 