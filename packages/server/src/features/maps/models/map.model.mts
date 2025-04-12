import mongoose from 'mongoose';
import { IMap, mapSchema } from '@dungeon-lab/shared/index.mjs';

import { baseMongooseZodSchema } from '../../../models/base-schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';

/**
 * Map document interface extending the base Map interface
 */
///export interface MapDocument extends Omit<IMap, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IMap>(mapSchema.merge(baseMongooseZodSchema));

/**
 * Map model
 */
export const MapModel = mongoose.model<IMap>('Map', mongooseSchema); 